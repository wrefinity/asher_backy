export interface MaintenanceWhitelistInput {
    categoryId?: string;
    subcategoryId: string;
    propertyId?: string;
    apartmentId?: string;
}

export interface MaintenanceWhitelistOutput {
    id: string;
    categoryId: string;
    subcategoryId?: string;
    landlordId: string;
    propertyId: string;
    apartmentId?: string;
}
