export interface ProfileIF {
    gender?:string,
    phoneNumber?: string,
    address?: string,
    dateOfBirth?: Date,
    fullname?:string,
    profileUrl?:string,
    zip?: string,
    unit?: string,
    state?: string,
    timeZone?: string,
    taxPayerId?: string,
    taxType?: string,
}
export interface NotificationPreferenceInput {
  category: string;
  notifyOnLoginActivity?: boolean;
  notifyOnNewMessages?: boolean;
  notifyPaymentInitiated?: boolean;
  notifyPaymentSuccess?: boolean;
  notifyPaymentFailed?: boolean;
  notifyNewMaintenanceRequest?: boolean;
  notifyRequestStatusChange?: boolean;
  notifyRequestMessage?: boolean;
  notifyRequestResolved?: boolean;
  notifyNewInvoice?: boolean;
  notifyTenantMoveOut?: boolean;
  notifyPropertyMatch?: boolean;
  notifyNewInquiry?: boolean;
  notifyNewSupportTicket?: boolean;
  receiveMarketingEmails?: boolean;
  channels?: string[];
}

export interface UpdateNotificationPreferencesInput {
  preferences: NotificationPreferenceInput[];
}
