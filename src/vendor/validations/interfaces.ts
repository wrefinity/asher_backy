export interface IService {
    id?: string;
    currentJobs: number;
    availability: string;
    standardPriceRange: string;
    mediumPriceRange: string;
    premiumPriceRange: string;
    vendorId: string;
    categoryId: string;
    subcategoryId: string;
}