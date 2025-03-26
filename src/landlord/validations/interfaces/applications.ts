import { InvitedResponse, YesNo } from ".prisma/client";

export interface ApplicationInvite {
    id?: string;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    scheduleDate?: Date;
    response?: InvitedResponse;
    responseStepsCompleted?: InvitedResponse[];
    propertiesId?: string | null;
    apartmentsId?: string | null;
    invitedByLandordId?: string | null;
    userInvitedId?: string | null;
    tenantsId?: string | null;
    enquiryId?: string | null;
    applicationFee?: YesNo | null;
}

export interface Tenant {
    id: string;
    leaseStartDate?: Date;
    leaseEndDate?: Date;
    user: {
        id: string;
        email: string;
    };
}

export interface Landlord {
    id: string;
    user: {
        id: string;
        email: string;
    };
}
