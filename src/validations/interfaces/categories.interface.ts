export interface CategoryIF {
    id: string;
    name: string;
    image: string;
    labels: string[];
    isDeleted: boolean;
}

export interface SubCategoryIF {
    id: string;
    name: string;
    image: string;
    label: string[];
    isDeleted: boolean;
    categoryId: string;
}