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
