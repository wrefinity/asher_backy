import { PropertyType, PropertySpecificationType } from "@prisma/client"

export interface IPropertyDocument {
    id?: string;
    name: string;
    documentUrl: string[];
    createdAt?: Date;
    updatedAt?: Date;
    apartmentsId?: string;
    propertyId?: string;
    uploadedBy?: string;
}

export interface ICreateProperty {
    name: string;
    description: string;
    propertysize?: number;
    landlordId: string;
    agencyId?: string;
    yearBuilt?: Date;
    city: string;
    stateId: string;
    country: string;
    currency: string;
    zipcode: string;
    location?: string;
    useTypeCategory?: string;
    images?: string[];
    videourl?: string[];
    amenities?: string[];
    totalApartments?: number;
    noBedRoom?: number;
    noKitchen?: number;
    noGarage?: number;
    noBathRoom?: number;
    rentalFee?: number;
    initialDeposit?: number;
    latitude?: number;
    longitude?: number;
    type?: PropertyType;
    specificationType?: PropertySpecificationType;
}

export interface PropertyViewingIF {
    id?: string;
    userId: string;
    propertyId: string;
    isLiked?: boolean;
    review?: string;
    rating?: number;
    createdAt?: Date;
    updatedAt?: Date;
}