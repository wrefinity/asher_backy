export interface ICreateReview {
    rating: number;
    comment?: string;
    vendorId: string;
    tenantId?: string;
    landlordId?: string;
    propertyId?: string;
    apartmentId?: string;
    reviewById?: string;
}

export interface IGetReviewsByProperty {
    propertyId: string;
}
