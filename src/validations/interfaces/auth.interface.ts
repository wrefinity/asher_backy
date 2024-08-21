
export interface LoginIF{
    email: string,
    password: string
}


export interface SignUpIF{
    email: string,
    password: string,
    fullname: string,
    role?: string;
}

// DTO for creating a new landlord
export interface CreateLandlordDTO {
    userId: string;
}

// DTO for updating a landlord
// export interface UpdateLandlordDTO {
//     userId?: string;
//     properties?: string[];
//     tenants?: string[];
//     lnadlordSupportTicket?: string[];
//     transactions?: string[];
//     reviews?: string[];
// }

export interface UpdateLandlordDTO {
    userId?: string;
    properties?: {
        connect?: { id: string }[]; 
        disconnect?: { id: string }[];
    };
    tenants?: {
        connect?: { id: string }[];
        disconnect?: { id: string }[];
    };
    lnadlordSupportTicket?: {
        connect?: { id: string }[];
        disconnect?: { id: string }[];
    };
    transactions?: {
        connect?: { id: string }[];
        disconnect?: { id: string }[];
    };
    reviews?: {
        connect?: { id: string }[];
        disconnect?: { id: string }[];
    };
    isDeleted?: boolean;
}



// DTO for retrieving a landlord (could be the same as CreateLandlordDTO)
export interface LandlordDTO extends CreateLandlordDTO {
    id: string;
}


export interface CreateLandlordIF {
    email: string;
    password: string;
    isVerified?: boolean;
    profile: {
        gender?: string;
        phoneNumber?: string;
        address?: string;
        dateOfBirth?: Date;
        fullname?: string;
        profileUrl?: string;
    };
    landlord: {
        property?: string[];
        tenants?: string[];
        transactions?: string[];
        reviews?: string[];
        isDeleted?: boolean;
    };
}

