import {PropertyType, PropertySpecificationType} from "@prisma/client"

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
    state: string;
    country: string;
    currency: string;
    zipcode: string;
    location?: string;
    useTypeCategory?: string;
    images?: string[];
    videourl?: string[];
    amenities?: string[];
    totalApartments?: number;
    rentalFee?: number;
    latitude?: number;
    longitude?: number;
    type?: PropertyType;
    specificationType?: PropertySpecificationType;
}