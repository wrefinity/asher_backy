
export interface LoginIF {
    email: string,
    password: string
}


export interface SignUpIF {
    email: string,
    password: string,
    fullname: string,
    role?: string;
}

// DTO for creating a new landlord
export interface CreateLandlordDTO {
    userId: string;
}

export interface UploadedDocumentInput {
  url: string;
  type: string;
}

export interface RegisterVendorInput {
  email: string;
  password: string;
  profile: {
    fullname?: string;
    gender?: string;
    phoneNumber?: string;
    address?: string;
    country?: string;
    city?: string;
    maritalStatus?: string;
    dateOfBirth?: Date;
    firstName?: string;
    lastName?: string;
    middleName?: string;
    profileUrl?: string;
    zip?: string;
    unit?: string;
    state?: string;
    timeZone?: string;
    taxPayerId?: string;
    taxType?: string;
    title?: string;
  };
  uploadedDocuments?: UploadedDocumentInput[];
}

export interface UpdateLandlordDTO {
    userId?: string;
    businessName?: string;
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
        firstName?: string;
        lastName?: string;
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

