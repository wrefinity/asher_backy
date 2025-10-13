import { prismaClient } from "..";
import { serverInstance } from "../index";
import emailService from "./emailService";

export interface LeaseRenewalData {
  tenantId: string;
  propertyId: string;
  currentRent: number;
  proposedRent: number;
  renewalTerms: {
    duration: 'WEEKLY' | 'MONTHLY' | 'ANNUAL';
    startDate: Date;
    endDate: Date;
  };
  message?: string;
}

export interface RenewalReminderConfig {
  // Percentage-based reminder thresholds
  thresholds: {
    first: number;    // e.g., 50% (6 months for annual lease)
    second: number;   // e.g., 25% (3 months for annual lease)
    final: number;    // e.g., 10% (1 month for annual lease)
  };
  frequency: 'WEEKLY' | 'MONTHLY' | 'ANNUAL';
}

class LeaseRenewalService {
  private emailService = emailService;

  /**
   * Calculate reminder dates based on lease frequency and percentage thresholds
   */
  private calculateReminderDates(
    leaseStart: Date,
    leaseEnd: Date,
    frequency: 'WEEKLY' | 'MONTHLY' | 'ANNUAL',
    thresholds: { first: number; second: number; final: number }
  ) {
    const totalDays = Math.ceil((leaseEnd.getTime() - leaseStart.getTime()) / (1000 * 60 * 60 * 24));

    const reminderDates = {
      first: new Date(leaseEnd.getTime() - (totalDays * (thresholds.first / 100)) * 24 * 60 * 60 * 1000),
      second: new Date(leaseEnd.getTime() - (totalDays * (thresholds.second / 100)) * 24 * 60 * 60 * 1000),
      final: new Date(leaseEnd.getTime() - (totalDays * (thresholds.final / 100)) * 24 * 60 * 60 * 1000),
    };

    return reminderDates;
  }

  /**
   * Get percentage-based reminder configuration based on lease frequency
   */
  private getReminderConfig(frequency: 'WEEKLY' | 'MONTHLY' | 'ANNUAL'): RenewalReminderConfig {
    switch (frequency) {
      case 'WEEKLY':
        return {
          thresholds: { first: 50, second: 25, final: 10 }, // 3.5 days, 1.75 days, 0.7 days
          frequency: 'WEEKLY'
        };
      case 'MONTHLY':
        return {
          thresholds: { first: 50, second: 25, final: 10 }, // 15 days, 7.5 days, 3 days
          frequency: 'MONTHLY'
        };
      case 'ANNUAL':
        return {
          thresholds: { first: 50, second: 25, final: 10 }, // 6 months, 3 months, 1 month
          frequency: 'ANNUAL'
        };
      default:
        return {
          thresholds: { first: 50, second: 25, final: 10 },
          frequency: 'MONTHLY'
        };
    }
  }

  /**
   * Check for leases that need renewal reminders
   */
  async checkRenewalReminders() {
    const currentDate = new Date();

    // Get all active leases
    const activeLeases = await prismaClient.tenants.findMany({
      where: {
        isCurrentLease: true,
        leaseEndDate: {
          gte: currentDate
        }
      },
      include: {
        user: true,
        property: {
          include: {
            landlord: {
              include: { user: true }
            }
          }
        }
      }
    });

    for (const lease of activeLeases) {
      if (!lease.leaseStartDate || !lease.leaseEndDate) continue;

      // Determine lease frequency based on duration
      const leaseDuration = lease.leaseEndDate.getTime() - lease.leaseStartDate.getTime();
      const days = Math.ceil(leaseDuration / (1000 * 60 * 60 * 24));

      let frequency: 'WEEKLY' | 'MONTHLY' | 'ANNUAL';
      if (days <= 10) {
        frequency = 'WEEKLY';
      } else if (days <= 35) {
        frequency = 'MONTHLY';
      } else {
        frequency = 'ANNUAL';
      }

      const config = this.getReminderConfig(frequency);
      const reminderDates = this.calculateReminderDates(
        lease.leaseStartDate,
        lease.leaseEndDate,
        frequency,
        config.thresholds
      );

      // Check if current date matches any reminder threshold
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let reminderType: 'first' | 'second' | 'final' | null = null;

      if (this.isSameDay(today, reminderDates.first)) {
        reminderType = 'first';
      } else if (this.isSameDay(today, reminderDates.second)) {
        reminderType = 'second';
      } else if (this.isSameDay(today, reminderDates.final)) {
        reminderType = 'final';
      }

      if (reminderType) {
        await this.sendRenewalReminder(lease, reminderType, frequency);
      }
    }
  }

  /**
   * Send renewal reminder to both tenant and landlord
   */
  private async sendRenewalReminder(
    lease: any,
    reminderType: 'first' | 'second' | 'final',
    frequency: 'WEEKLY' | 'MONTHLY' | 'ANNUAL'
  ) {
    const tenant = lease.user;
    const landlord = lease.property.landlord.user;
    const property = lease.property;

    // Check if reminder already sent today
    const today = new Date().toISOString().split('T')[0];
    const existingReminder = await prismaClient.log.findFirst({
      where: {
        events: {
          contains: `Lease renewal reminder (${reminderType}) sent`
        },
        propertyId: property.id,
        createdAt: {
          gte: new Date(today + 'T00:00:00.000Z'),
          lt: new Date(today + 'T23:59:59.999Z')
        }
      }
    });

    if (existingReminder) {
      return; // Reminder already sent today
    }

    const reminderMessages = {
      first: {
        title: 'Lease Renewal Reminder - Early Notice',
        tenantMessage: `Your lease at ${property.name} is approaching its end. Consider renewing to continue your tenancy.`,
        landlordMessage: `Tenant ${tenant.firstName} ${tenant.lastName}'s lease at ${property.name} is approaching its end. Consider renewal options.`
      },
      second: {
        title: 'Lease Renewal Reminder - Important Notice',
        tenantMessage: `Your lease at ${property.name} will end soon. Please contact your landlord about renewal options.`,
        landlordMessage: `Tenant ${tenant.firstName} ${tenant.lastName}'s lease at ${property.name} will end soon. Please discuss renewal terms.`
      },
      final: {
        title: 'Lease Renewal Reminder - Final Notice',
        tenantMessage: `Your lease at ${property.name} ends very soon. Please contact your landlord immediately about renewal.`,
        landlordMessage: `Tenant ${tenant.firstName} ${tenant.lastName}'s lease at ${property.name} ends very soon. Please finalize renewal terms.`
      }
    };

    const message = reminderMessages[reminderType];

    // Send email to tenant
    await this.emailService.createEmail({
      senderEmail: landlord.email,
      receiverEmail: tenant.email,
      attachment: [],
      subject: `Asher - ${message.title}`,
      body: this.generateRenewalEmailBody(tenant, property, message.tenantMessage, frequency),
      senderId: landlord.id,
      receiverId: tenant.id
    });

    // Send email to landlord
    await this.emailService.createEmail({
      senderEmail: tenant.email,
      receiverEmail: landlord.email,
      attachment: [],
      subject: `Asher - ${message.title}`,
      body: this.generateRenewalEmailBody(landlord, property, message.landlordMessage, frequency),
      senderId: tenant.id,
      receiverId: landlord.id
    });

    // Send real-time notifications
    this.sendRealtimeNotification(tenant.id, {
      type: 'LEASE_RENEWAL_REMINDER',
      title: message.title,
      message: message.tenantMessage,
      reminderType,
      propertyId: property.id,
      leaseEndDate: lease.leaseEndDate
    });

    this.sendRealtimeNotification(landlord.id, {
      type: 'LEASE_RENEWAL_REMINDER',
      title: message.title,
      message: message.landlordMessage,
      reminderType,
      propertyId: property.id,
      leaseEndDate: lease.leaseEndDate
    });

    // Log the reminder
    await prismaClient.log.create({
      data: {
        events: `Lease renewal reminder (${reminderType}) sent for property ${property.name}`,
        type: "ACTIVITY",
        propertyId: property.id,
        createdById: landlord.id
      }
    });
  }

  /**
   * Initiate lease renewal process
   */
  async initiateLeaseRenewal(data: LeaseRenewalData) {
    const tenant = await prismaClient.tenants.findFirst({
      where: {
        id: data.tenantId,
        propertyId: data.propertyId,
        isCurrentLease: true
      },
      include: {
        user: true,
        property: {
          include: {
            landlord: {
              include: { user: true }
            }
          }
        }
      }
    });

    if (!tenant) {
      throw new Error("Tenant or lease not found");
    }

    // Create renewal proposal
    const renewalProposal = await prismaClient.leaseRenewal.create({
      data: {
        tenantId: data.tenantId,
        propertyId: data.propertyId,
        currentRent: data.currentRent,
        proposedRent: data.proposedRent,
        renewalTerms: data.renewalTerms,
        status: 'PENDING',
        message: data.message,
        proposedBy: tenant.user.id,
        proposedAt: new Date()
      }
    });

    // Send notification to tenant
    await this.emailService.createEmail({
      senderEmail: tenant.property.landlord.user.email,
      receiverEmail: tenant.user.email,
      subject: `Asher - Lease Renewal Proposal`,
      attachment: [],
      body: this.generateRenewalProposalBody(tenant, data),
      senderId: tenant.property.landlord.userId,
      receiverId: tenant.user.id
    });

    // Send real-time notification
    this.sendRealtimeNotification(tenant.user.id, {
      type: 'LEASE_RENEWAL_PROPOSAL',
      title: 'Lease Renewal Proposal',
      message: `You have received a lease renewal proposal for ${tenant.property.name}`,
      proposalId: renewalProposal.id,
      propertyId: data.propertyId
    });

    return renewalProposal;
  }

  /**
   * Respond to lease renewal proposal
   */
  async respondToRenewalProposal(
    proposalId: string,
    userId: string,
    response: 'ACCEPTED' | 'REJECTED' | 'COUNTER_OFFER',
    counterOffer?: {
      proposedRent?: number;
      renewalTerms?: any;
      message?: string;
    }
  ) {
    const proposal = await prismaClient.leaseRenewal.findUnique({
      where: { id: proposalId },
      include: {
        tenant: {
          include: { user: true }
        },
        property: {
          include: {
            landlord: {
              include: { user: true }
            }
          }
        }
      }
    });

    if (!proposal) {
      throw new Error("Renewal proposal not found");
    }

    // Update proposal with response
    const updateData: any = {
      status: response,
      respondedBy: userId,
      respondedAt: new Date()
    };

    if (response === 'COUNTER_OFFER' && counterOffer) {
      updateData.counterOffer = counterOffer;
    }

    const updatedProposal = await prismaClient.leaseRenewal.update({
      where: { id: proposalId },
      data: updateData
    });

    // Send notification to the other party
    const otherParty = proposal.tenant.user.id === userId
      ? proposal.property.landlord.user
      : proposal.tenant.user;

    await this.emailService.createEmail({
      senderEmail: userId === proposal.tenant.user.id
        ? proposal.tenant.user.email
        : proposal.property.landlord.user.email,
      receiverEmail: otherParty.email,
      attachment: [],
      subject: `Asher - Lease Renewal Response`,
      body: this.generateRenewalResponseBody(proposal, response, otherParty),
      senderId: userId,
      receiverId: otherParty.id
    });

    // Send real-time notification
    this.sendRealtimeNotification(otherParty.id, {
      type: 'LEASE_RENEWAL_RESPONSE',
      title: 'Lease Renewal Response',
      message: `Lease renewal proposal has been ${response.toLowerCase()}`,
      proposalId: proposalId,
      response,
      propertyId: proposal.propertyId
    });

    return updatedProposal;
  }

  /**
   * Generate renewal email body
   */
  private generateRenewalEmailBody(user: any, property: any, message: string, frequency: string) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #B80238;">Lease Renewal Reminder</h2>
        <p>Hello ${user.firstName},</p>
        <p>${message}</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Property Details</h3>
          <p><strong>Property:</strong> ${property.name}</p>
          <p><strong>Address:</strong> ${property.address}</p>
          <p><strong>Lease Type:</strong> ${frequency}</p>
        </div>
        <p>Please log into your Asher account to view your lease details and renewal options.</p>
        <p>Best regards,<br/>The Asher Team</p>
      </div>
    `;
  }

  /**
   * Generate renewal proposal email body
   */
  private generateRenewalProposalBody(tenant: any, data: LeaseRenewalData) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #B80238;">Lease Renewal Proposal</h2>
        <p>Hello ${tenant.user.firstName},</p>
        <p>You have received a lease renewal proposal for your current property.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Renewal Terms</h3>
          <p><strong>Property:</strong> ${tenant.property.name}</p>
          <p><strong>Current Rent:</strong> $${data.currentRent.toLocaleString()}</p>
          <p><strong>Proposed Rent:</strong> $${data.proposedRent.toLocaleString()}</p>
          <p><strong>Lease Duration:</strong> ${data.renewalTerms.duration}</p>
          <p><strong>Start Date:</strong> ${data.renewalTerms.startDate.toLocaleDateString()}</p>
          <p><strong>End Date:</strong> ${data.renewalTerms.endDate.toLocaleDateString()}</p>
          ${data.message ? `<p><strong>Message:</strong> ${data.message}</p>` : ''}
        </div>
        <p>Please log into your Asher account to review and respond to this proposal.</p>
        <p>Best regards,<br/>The Asher Team</p>
      </div>
    `;
  }

  /**
   * Generate renewal response email body
   */
  private generateRenewalResponseBody(proposal: any, response: string, recipient: any) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #B80238;">Lease Renewal Response</h2>
        <p>Hello ${recipient.firstName},</p>
        <p>The lease renewal proposal for ${proposal.property.name} has been <strong>${response.toLowerCase()}</strong>.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Proposal Details</h3>
          <p><strong>Property:</strong> ${proposal.property.name}</p>
          <p><strong>Current Rent:</strong> $${proposal.currentRent.toLocaleString()}</p>
          <p><strong>Proposed Rent:</strong> $${proposal.proposedRent.toLocaleString()}</p>
          <p><strong>Status:</strong> ${response}</p>
        </div>
        <p>Please log into your Asher account to view the full details.</p>
        <p>Best regards,<br/>The Asher Team</p>
      </div>
    `;
  }

  /**
   * Send real-time notification via WebSocket
   */
  private sendRealtimeNotification(userId: string, notification: any) {
    if (serverInstance && serverInstance.io) {
      serverInstance.io.to(`user_${userId}`).emit('notification', {
        ...notification,
        timestamp: new Date(),
        userId
      });
    }
  }

  /**
   * Check if two dates are the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate();
  }
}

export default new LeaseRenewalService();
