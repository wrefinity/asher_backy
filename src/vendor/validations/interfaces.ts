export interface IService {
    id?: string;
    currentJobs: number;
    availability: string;
    standardPriceRange: string;
    mediumPriceRange: string;
    premiumPriceRange: string;
    vendorId: string;
    // categoryId: string;
    categoryId: string | null; 
    subcategoryId: string | null;
    // subcategoryId: string;
}