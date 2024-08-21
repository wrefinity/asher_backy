export interface IPropertyDocument {
    id?: string;
    name: string;
    documentUrl: string;
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
    zipcode: string;
    location?: string;
    images?: string[];
    videourl?: string[];
    amenities?: string[];
    totalApartments?: number;
}