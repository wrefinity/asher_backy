import { NotificationCategory, NotificationChannel } from '@prisma/client';

export type NotifyTone = 'info' | 'success' | 'warning' | 'error';

export type NotifyChannel = Extract<
  NotificationChannel,
  'IN_APP' | 'PUSH' | 'EMAIL'
>;

export type NotifyEventType =
  | 'website_inquiry'
  | 'application_submitted'
  | 'application_fee_paid'
  | 'application_approved'
  | 'application_declined'
  | 'application_agreement_sent'
  | 'application_agreement_signed'
  | 'viewing_invite'
  | 'viewing_accepted'
  | 'viewing_rejected'
  | 'viewing_rescheduled'
  | 'viewing_cancelled'
  | 'viewing_reschedule_accepted'
  | 'viewing_awaiting_feedback'
  | 'viewing_no_show'
  | 'viewing_feedback'
  | 'invite_to_apply'
  | 'enquiry_rejected'
  | 'reference_declined'
  | 'reference_submitted'
  | 'application_agreement_counter_signed'
  | 'move_in_payment_requested'
  | 'move_in_payment_received'
  | 'inspection_scheduled'
  | 'inspection_completed'
  | 'inspection_report'
  | 'inspection_acknowledged'
  | 'inspection_disputed'
  | 'inspection_dispute_message'
  | 'inspection_guest_submitted'
  | 'inspection_certificate'
  | 'inspection_cancelled'
  | 'inspection_rescheduled'
  | 'inspection_schedule_acknowledged'
  | 'complaint_created'
  | 'complaint_status_update'
  | 'complaint_message'
  | 'violation_created'
  | 'violation_response'
  | 'payment_failed'
  | 'bill_overdue'
  | 'move_out_notice'
  | 'move_out_acknowledged'
  | 'deposit_return_reminder'
  | 'login_activity'
  | 'maintenance_new_request'
  | 'maintenance_status_change'
  | 'maintenance_resolved'
  | 'chat_message'
  | 'maintenance_chat_message'
  | 'document_request'
  | 'support_ticket_created'
  | 'support_ticket_message'
  | 'support_ticket_status'
  | 'maintenance_quote'
  | 'maintenance_quote_accepted'
  | 'maintenance_quote_declined'
  | 'guarantor_declined'
  | 'generic';

export type NotifyEventConfig = {
  category: NotificationCategory;
  /** Default delivery channels for this event. Callers can override. */
  channels: NotifyChannel[];
  /** Default deep link when caller does not pass route. */
  route?: string;
  tone?: NotifyTone;
  /** Optional default title; caller title wins. */
  title?: string;
};

/**
 * Single source of truth: event type → category + default channels + route.
 * Pick channels per event here; notifyUser applies them.
 */
export const NOTIFY_EVENTS: Record<NotifyEventType, NotifyEventConfig> = {
  // Leasing / rental portal
  website_inquiry: {
    category: 'WEBSITE_INQUIRY',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
    route: '/leasing',
    tone: 'info',
    title: 'New Property Enquiry',
  },
  application_submitted: {
    category: 'WEBSITE_INQUIRY',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
    route: '/leasing',
    tone: 'info',
    title: 'Application Submitted',
  },
  application_fee_paid: {
    category: 'ONLINE_PAYMENTS',
    channels: ['IN_APP', 'PUSH'],
    route: '/leasing',
    tone: 'success',
    title: 'Application Fee Paid',
  },
  application_approved: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
    route: '/dashboard',
    tone: 'success',
    title: 'Application Approved',
  },
  application_declined: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
    route: '/dashboard',
    tone: 'error',
    title: 'Application Declined',
  },
  application_agreement_sent: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
    route: '/dashboard',
    tone: 'info',
    title: 'Lease Agreement Ready',
  },
  application_agreement_signed: {
    category: 'WEBSITE_INQUIRY',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
    route: '/leasing',
    tone: 'success',
    title: 'Agreement Signed',
  },
  viewing_invite: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
    route: '/dashboard/property-viewings',
    tone: 'info',
    title: 'Viewing Invitation',
  },
  viewing_accepted: {
    category: 'WEBSITE_INQUIRY',
    channels: ['IN_APP', 'PUSH'],
    route: '/leasing',
    tone: 'success',
    title: 'Viewing Accepted',
  },
  viewing_rejected: {
    category: 'WEBSITE_INQUIRY',
    channels: ['IN_APP', 'PUSH'],
    route: '/leasing',
    tone: 'warning',
    title: 'Viewing Declined',
  },
  viewing_rescheduled: {
    category: 'WEBSITE_INQUIRY',
    channels: ['IN_APP', 'PUSH'],
    route: '/leasing',
    tone: 'info',
    title: 'Viewing Reschedule Requested',
  },
  viewing_cancelled: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH'],
    route: '/leasing',
    tone: 'warning',
    title: 'Viewing Cancelled',
  },
  viewing_reschedule_accepted: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH'],
    route: '/dashboard/property-viewings',
    tone: 'success',
    title: 'Reschedule Accepted',
  },
  viewing_awaiting_feedback: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH'],
    route: '/dashboard/property-viewings',
    tone: 'info',
    title: 'Share Viewing Feedback',
  },
  viewing_no_show: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH'],
    route: '/dashboard/property-viewings',
    tone: 'warning',
    title: 'Marked as No-Show',
  },
  viewing_feedback: {
    category: 'WEBSITE_INQUIRY',
    channels: ['IN_APP', 'PUSH'],
    route: '/leasing',
    tone: 'info',
    title: 'Viewing Feedback Received',
  },
  invite_to_apply: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
    route: '/dashboard/applications',
    tone: 'success',
    title: 'You Are Invited to Apply',
  },
  enquiry_rejected: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH'],
    route: '/dashboard',
    tone: 'warning',
    title: 'Enquiry Closed',
  },
  reference_declined: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
    route: '/leasing',
    tone: 'warning',
    title: 'Reference Declined',
  },
  reference_submitted: {
    category: 'WEBSITE_INQUIRY',
    channels: ['IN_APP', 'PUSH'],
    route: '/leasing',
    tone: 'success',
    title: 'Reference Submitted',
  },
  application_agreement_counter_signed: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
    route: '/dashboard',
    tone: 'success',
    title: 'Agreement Counter-Signed',
  },
  move_in_payment_requested: {
    category: 'ONLINE_PAYMENTS',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
    route: '/dashboard',
    tone: 'info',
    title: 'Move-in Payment Required',
  },
  move_in_payment_received: {
    category: 'ONLINE_PAYMENTS',
    channels: ['IN_APP', 'PUSH'],
    route: '/leasing',
    tone: 'success',
    title: 'Move-in Payment Received',
  },

  // Inspections
  inspection_scheduled: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
    route: '/inspections',
    tone: 'info',
    title: 'Inspection Scheduled',
  },
  inspection_completed: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH'],
    route: '/inspections',
    tone: 'success',
    title: 'Inspection Completed',
  },
  inspection_report: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
    route: '/inspections/acknowledge',
    tone: 'info',
    title: 'Inspection Report Shared',
  },
  inspection_acknowledged: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH'],
    route: '/service/inspections',
    tone: 'success',
    title: 'Inspection Acknowledged',
  },
  inspection_disputed: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
    route: '/service/inspections',
    tone: 'warning',
    title: 'Inspection Disputed',
  },
  inspection_dispute_message: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH'],
    route: '/service/inspections',
    tone: 'info',
    title: 'Inspection Dispute Message',
  },
  inspection_guest_submitted: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH'],
    route: '/service/inspections',
    tone: 'info',
    title: 'Guest Inspection Submitted',
  },
  inspection_certificate: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH'],
    route: '/profile/Documents',
    tone: 'success',
    title: 'Inspection Certificate Ready',
  },
  inspection_cancelled: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
    route: '/inspections',
    tone: 'warning',
    title: 'Inspection Cancelled',
  },
  inspection_rescheduled: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
    route: '/inspections',
    tone: 'info',
    title: 'Inspection Rescheduled',
  },
  inspection_schedule_acknowledged: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH'],
    route: '/service/inspections',
    tone: 'success',
    title: 'Schedule Acknowledged',
  },

  // Complaints / violations
  complaint_created: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH'],
    route: '/service/complaints',
    tone: 'info',
    title: 'New Complaint',
  },
  complaint_status_update: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH'],
    route: '/service/complaints',
    tone: 'info',
    title: 'Complaint Updated',
  },
  complaint_message: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH'],
    route: '/service/complaints',
    tone: 'info',
    title: 'Complaint Message',
  },
  violation_created: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
    route: '/profile/Notices',
    tone: 'warning',
    title: 'Violation Notice',
  },
  violation_response: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH'],
    route: '/tenants',
    tone: 'info',
    title: 'Violation Response',
  },

  // Money / tenancy
  payment_failed: {
    category: 'ONLINE_PAYMENTS',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
    route: '/bills/viewAllBills',
    tone: 'error',
    title: 'Payment Failed',
  },
  bill_overdue: {
    category: 'ONLINE_PAYMENTS',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
    route: '/bills/viewAllBills',
    tone: 'warning',
    title: 'Bill Overdue',
  },
  move_out_notice: {
    category: 'MOVE_OUT',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
    route: '/service/inspections',
    tone: 'warning',
    title: 'Move-out Notice',
  },
  move_out_acknowledged: {
    category: 'MOVE_OUT',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
    route: '/profile/TenancyInfo',
    tone: 'info',
    title: 'Move-out Acknowledged',
  },
  deposit_return_reminder: {
    category: 'MOVE_OUT',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
    route: '/profile/TenancyInfo',
    tone: 'warning',
    title: 'Deposit Return Reminder',
  },

  // Ops
  login_activity: {
    category: 'SECURITY',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
    route: '/settings?tab=security',
    tone: 'warning',
    title: 'New Login',
  },
  maintenance_new_request: {
    category: 'MAINTENANCE_REQUESTS',
    channels: ['IN_APP', 'PUSH'],
    route: '/service/maintenance',
    tone: 'info',
    title: 'New Maintenance Request',
  },
  maintenance_status_change: {
    category: 'MAINTENANCE_REQUESTS',
    channels: ['IN_APP', 'PUSH'],
    route: '/service/maintenance',
    tone: 'info',
    title: 'Maintenance Update',
  },
  maintenance_resolved: {
    category: 'MAINTENANCE_REQUESTS',
    channels: ['IN_APP', 'PUSH'],
    route: '/service/maintenance',
    tone: 'success',
    title: 'Maintenance Completed',
  },
  chat_message: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH'],
    route: '/communication/chat',
    tone: 'info',
    title: 'New Message',
  },
  maintenance_chat_message: {
    category: 'MAINTENANCE_REQUESTS',
    channels: ['IN_APP', 'PUSH'],
    route: '/service/maintenance',
    tone: 'info',
    title: 'Maintenance Message',
  },
  document_request: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH'],
    route: '/profile/Documents',
    tone: 'info',
    title: 'Document Requested',
  },
  support_ticket_created: {
    category: 'SUPPORT_TICKET',
    channels: ['IN_APP', 'PUSH'],
    route: '/service/support',
    tone: 'info',
    title: 'New Support Ticket',
  },
  support_ticket_message: {
    category: 'SUPPORT_TICKET',
    channels: ['IN_APP', 'PUSH'],
    // Caller overrides with role-aware /service/support?ticketId= or /supports/chatSupport?ticketId=
    route: '/service/support',
    tone: 'info',
    title: 'Support Ticket Update',
  },
  support_ticket_status: {
    category: 'SUPPORT_TICKET',
    channels: ['IN_APP', 'PUSH'],
    route: '/service/support',
    tone: 'info',
    title: 'Support Ticket Status Updated',
  },
  maintenance_quote: {
    category: 'MAINTENANCE_REQUESTS',
    channels: ['IN_APP', 'PUSH'],
    route: '/service/maintenance',
    tone: 'info',
    title: 'New Maintenance Quote',
  },
  maintenance_quote_accepted: {
    category: 'MAINTENANCE_REQUESTS',
    channels: ['IN_APP', 'PUSH'],
    route: '/(app)/(tabs)',
    tone: 'success',
    title: 'You Have Been Picked',
  },
  maintenance_quote_declined: {
    category: 'MAINTENANCE_REQUESTS',
    channels: ['IN_APP', 'PUSH'],
    route: '/service/maintenance',
    tone: 'warning',
    title: 'Vendor Declined Job',
  },
  guarantor_declined: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH', 'EMAIL'],
    route: '/leasing',
    tone: 'warning',
    title: 'Guarantor Declined Nomination',
  },

  generic: {
    category: 'COMMUNICATION',
    channels: ['IN_APP', 'PUSH'],
    route: '/notifications',
    tone: 'info',
  },
};

export function getNotifyEventConfig(type: string): NotifyEventConfig {
  const key = type as NotifyEventType;
  if (key in NOTIFY_EVENTS) {
    return NOTIFY_EVENTS[key];
  }
  return NOTIFY_EVENTS.generic;
}
