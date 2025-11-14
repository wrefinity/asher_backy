import { PayableBy } from "@prisma/client";
import { prismaClient } from "../..";
import { generateIDs } from "../../utils/helpers";

interface BillFilterOptions {
    tenantId?: string;
    landlordId?: string;
    propertyId?: string;
    billId?: string;
    billCategoryId?: string;
    payableBy?: PayableBy;
    isDeleted?: boolean;
    dateRange?: {
        start?: Date;
        end?: Date;
    };
    search?: string;
}

export interface BillQueryParams {
    page?: string;
    limit?: string;
    propertyId?: string;
    billId?: string;
    billCategoryId?: string;
    payableBy?: PayableBy;
    search?: string;
    startDate?: string;
    endDate?: string;
}

interface PaginationOptions {
    page?: number;
    pageSize?: number;
}

interface IncludeOptions {
    includeTenant?: boolean;
    includeProperty?: boolean;
    includeLandlord?: boolean;
    includeBillCategory?: boolean;
    includeTransactions?: boolean;
}


class BillService {
    constructor() { }

    createSubBills = async (billData: any, landlordId: string) => {
        const { propertyId, tenantId, billCategoryId, ...rest } = billData;

        try {
            // Prepare the base data object
            const data: any = {
                billId: generateIDs("BIL-"),
                ...rest
            };

            // Only connect property if propertyId is provided
            if (propertyId) {
                // Verify property exists if ID is provided
                const property = await prismaClient.properties.findUnique({
                    where: { id: propertyId },
                    select: { id: true }
                });
                if (!property) {
                    throw new Error(`Property with ID ${propertyId} not found`);
                }
                data.property = { connect: { id: propertyId } };
            }

            // Only connect landlord if landlordId is provided
            if (landlordId) {
                const landlord = await prismaClient.landlords.findUnique({
                    where: { id: landlordId },
                    select: { id: true }
                });
                if (!landlord) {
                    throw new Error(`Landlord with ID ${landlordId} not found`);
                }
                data.landlord = { connect: { id: landlordId } };
            }
            // Only connect tenant if tenant is provided
            if (tenantId) {
                const tenantx = await prismaClient.tenants.findUnique({
                    where: { id: tenantId },
                    select: { id: true }
                });
                if (!tenantx) {
                    throw new Error(`Tenant with ID ${tenantId} not found`);
                }
                data.tenants = { connect: { id: tenantId } };
            }

            // Only connect bill category if billCategoryId is provided
            if (billCategoryId) {
                const billCategory = await prismaClient.bills.findUnique({
                    where: { id: billCategoryId },
                    select: { id: true }
                });
                if (!billCategory) {
                    throw new Error(`Bill category with ID ${billCategoryId} not found`);
                }
                data.bills = { connect: { id: billCategoryId } };
            }

            return await prismaClient.billsSubCategory.create({ data });
        } catch (error) {
            console.error("Failed to create sub bill:", error);
            throw error; // Or handle it as appropriate for your application
        }
    }
    createBills = async (billData: { name: string, description: string }) => {
        return await prismaClient.bills.create({
            data: {
                name: billData.name,
                description: billData.description
            },
        })
    }
    getBillsCategories = async () => {
        return await prismaClient.bills.findMany({
        })
    }


    getBills = async (
        filterOptions: BillFilterOptions = {},
        paginationOptions: PaginationOptions = {},
        includeOptions: IncludeOptions = {}
    ) => {
        const {
            page = 1,
            pageSize = 10
        } = paginationOptions;

        const {
            includeTenant = false,
            includeProperty = true,
            includeLandlord = false,
            includeBillCategory = false,
            includeTransactions = false
        } = includeOptions;

        const where: any = {};

        // Apply filters
        if (filterOptions.tenantId) where.tenantId = filterOptions.tenantId;
        if (filterOptions.landlordId) where.landlordId = filterOptions.landlordId;
        if (filterOptions.propertyId) where.propertyId = filterOptions.propertyId;
        if (filterOptions.billId) where.billId = filterOptions.billId;
        if (filterOptions.billCategoryId) where.billCategoryId = filterOptions.billCategoryId;
        if (filterOptions.payableBy) where.payableBy = filterOptions.payableBy;
        if (filterOptions.isDeleted !== undefined) where.isDeleted = filterOptions.isDeleted;

        // Date range filter
        if (filterOptions.dateRange) {
            where.dueDate = {};
            if (filterOptions.dateRange.start) where.dueDate.gte = filterOptions.dateRange.start;
            if (filterOptions.dateRange.end) where.dueDate.lte = filterOptions.dateRange.end;
        }

        // Search filter
        if (filterOptions.search) {
            where.OR = [
                { billName: { contains: filterOptions.search, mode: 'insensitive' } },
                { description: { contains: filterOptions.search, mode: 'insensitive' } }
            ];
        }

        console.log(where)
        const include: any = {};
        if (includeTenant) include.tenants = true;
        if (includeProperty) include.property = true;
        if (includeLandlord) include.landlord = true;
        if (includeBillCategory) include.bills = true;
        if (includeTransactions) include.transactions = true;

        const [total, bills] = await Promise.all([
            prismaClient.billsSubCategory.count({ where }),
            prismaClient.billsSubCategory.findMany({
                where,
                include,
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { dueDate: 'asc' } // Default sorting by due date
            })
        ]);

        return {
            data: bills,
            pagination: {
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize)
            }
        };
    }

    getBillById = async (billId: string) => {
        return await prismaClient.bills.findUnique({
            where: { id: billId },
        });
    }

    updateBill = async (billId: string, billData: any) => {
        // First verify the bill exists
        const existingBill = await prismaClient.billsSubCategory.findUnique({
            where: { id: billId }
        });

        if (!existingBill) {
            throw {
                code: 'BILL_NOT_FOUND',
                message: `Bill with ID ${billId} not found`,
                status: 404
            };
        }
        return await prismaClient.billsSubCategory.update({
            where: { id: billId },
            data: billData,
        })
    }

    deleteBill = async (billId: string, landlordId: string) => {
        return await prismaClient.billsSubCategory.update({
            where: { id: billId, landlordId },
            data: {
                isDeleted: true
            }
        })
    }

    getBillByPropertyId = async (propertyId: string, landlordId: string) => {
        return await prismaClient.billsSubCategory.findMany({
            where: {
                propertyId,
                landlordId
            },
            include: {
                property: true,
                landlord: true
            }
        })
    }
}

export default new BillService();