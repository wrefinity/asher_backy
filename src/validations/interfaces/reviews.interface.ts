export interface ICreateReview {
    rating: number;
    comment?: string;
    vendorId: string;
    tenantId?: string;
    landlordId?: string;
    propertyId?: string;
    reviewById?: string;
}
