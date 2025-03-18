export interface ApplicationInvite {
    id: string;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    scheduleDate?: Date;
    response: 'PENDING' | 'ACCEPTED' | 'DECLINED';
    propertiesId?: string | null;
    apartmentsId?: string | null;
    invitedByLandordId?: string | null;
    userInvitedId?: string | null;
    tenantsId?: string | null;
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
