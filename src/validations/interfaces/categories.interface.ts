import {Prisma, CategoryType} from "@prisma/client"
export interface CategoryIF {
    id: string;
    name: string;
    description?: string;
    icon?: string | null;
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
    type?: CategoryType;
    label: string[];
    isDeleted: boolean;
    categoryId: string;
}