import {Prisma, CategoryType} from "@prisma/client"
export interface CategoryIF {
    id: string;
    name: string;
    description?: string;
    image: Prisma.categoryCreateimageInput | string[];
    labels: string[];
    isDeleted: boolean;
    categoryType?: CategoryType;
}

export interface SubCategoryIF {
    id: string;
    name: string;
    image: string;
    description?: string;
    label: string[];
    isDeleted: boolean;
    categoryId: string;
}