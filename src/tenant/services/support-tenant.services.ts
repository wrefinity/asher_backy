import { prismaClient } from "../.."
import { generateIDs } from "../../utils/helpers";

class SupportTenantService {
    constructor() { }

    private profileSelect = {
        select: {
            id: true,
            fullname: true,
            profileUrl: true,
        }
    }

    private userSelect = {
        select: {
            id: true,
            role: true,
            profile: this.profileSelect,
        }
    }
    private tenantSelect = {
        select: {
            id: true,
            tenantId: true,
            landlordId: true,
            user: this.userSelect,
            include: {
                landlord: true,
                property: true,
            }
        }
    }


    async createSupportTenantTicket(data: any, tenantId: string) {
        const tenant = await prismaClient.tenants.findUnique({
            where: { id: tenantId }
        });

        if (!tenant) {
            throw new Error('Tenant not found');
        }

        let ticketData = {
            ...data,
            supportTicketNumber: generateIDs('ASH-TNT'),
            status: data.status || 'open',
        };

        if (data.assignedTo === 'landlord') {

            const landlordTicket = await prismaClient.landlordSupportTicket.create({
                data: {
                    ...ticketData,
                    landlordId: tenant.landlordId,
                }
            });
            // TODO: alert the landlord
            return { type: 'landlord', ticket: landlordTicket };
        } else {
            // TODO: Create for the support users ticket data
        }
        // create the tenant ticket data
        const tenantTicket = await prismaClient.tenantSupportTicket.create({
            data: {
                ...ticketData,
                tenantId,
            }
        });
        return { type: 'tenant', ticket: tenantTicket };
    }
    generateIDs() {
        throw new Error("Method not implemented.");
    }


    async getSupportTenantTicket(ticketId: string, tenantId: string) {
        return prismaClient.tenantSupportTicket.findUnique({
            where: { id: ticketId, tenantId },
            include: {
                tenant: this.tenantSelect
            }
        });
    }

    async updateSupportTenantTicket(data: any, tenantId: string, ticketId?: string) {
        const tenant = await prismaClient.tenants.findUnique({
            where: { id: tenantId },
            ...this.tenantSelect
        });

        if (!tenant) {
            throw new Error('Tenant not found');
        }

        let ticketData = {
            ...data,
            status: data.status || 'open',
        };

        if (!ticketId) {
            ticketData.supportTicketNumber = generateIDs('ASH-TNT');
        }

        // Create or update the tenant ticket
        let tenantTicket;
        if (ticketId) {
            tenantTicket = await prismaClient.tenantSupportTicket.update({
                where: { id: ticketId },
                data: ticketData,
            });
        } else {
            tenantTicket = await prismaClient.tenantSupportTicket.create({
                data: {
                    ...ticketData,
                    tenantId,
                },
            });
        }

        let assignedTicket = null;
        let notificationRecipient = null;

        if (data.assignedTo === 'landlord') {
            if (ticketId) {
                assignedTicket = await prismaClient.landlordSupportTicket.update({
                    where: { id: ticketId },
                    data: ticketData,
                });
            } else {
                assignedTicket = await prismaClient.landlordSupportTicket.create({
                    data: {
                        ...ticketData,
                        landlordId: tenant.landlordId,
                    },
                });
            }
            notificationRecipient = tenant.landlordId;
        } else if (data.assignedTo === 'support') {
            // TODO: implement Support User DB
            // if (ticketId) {
            //     assignedTicket = await prismaClient.asherSupportTicket.update({
            //         where: { id: ticketId },
            //         data: ticketData,
            //     });
            // } else {
            //     assignedTicket = await prismaClient.asherSupportTicket.create({
            //         data: {
            //             ...ticketData,
            //             supportUserId: await this.getAvailableSupportUserId(),
            //         },
            //     });
            // }
            // notificationRecipient = await this.getSupportUser(assignedTicket.supportUserId);
        }

        // TODO: Create notification
        // if (notificationRecipient) {
        //     await this.createNotification({
        //         userId: notificationRecipient.id,
        //         message: `${ticketId ? 'Updated' : 'New'} support ticket: ${ticketData.subject}`,
        //         type: 'support_ticket',
        //         relatedId: tenantTicket.id,
        //     });
        // }

        return {
            tenantTicket,
            assignedTicket,
            type: data.assignedTo || 'tenant',
        };
    }

    // Helper methods
    async getAvailableSupportUserId() {
        // TODO: to get an available support user
    }

    async getSupportUser(supportUserId) {
        // TODO: to get support user details
    }

    async createNotification(notificationData) {
        // TODO: to create a notification
    }
}

export default new SupportTenantService();