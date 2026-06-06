import { PayableBy } from "@prisma/client";
import { prismaClient } from "../..";
import { generateIDs } from "../../utils/helpers";
import { BillNormalizer } from "../../utils/BillNormalizer";

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

            const createdBill = await prismaClient.billsSubCategory.create({ 
                data,
                include: {
                    tenants: {
                        include: {
                            user: {
                                include: {
                                    profile: true
                                }
                            }
                        }
                    },
                    property: true,
                    landlord: {
                        include: {
                            user: {
                                include: {
                                    profile: true
                                }
                            }
                        }
                    }
                }
            });
            
            // Normalize the created bill to include scope information
            return BillNormalizer.normalize(createdBill);
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

    /** Ensures a default bill category exists for CSV / bulk imports. */
    ensureDefaultBillCategory = async (): Promise<string> => {
        const existing = await prismaClient.bills.findFirst({
            where: { name: { equals: 'General', mode: 'insensitive' } },
            select: { id: true },
        });
        if (existing) return existing.id;

        const created = await prismaClient.bills.create({
            data: {
                name: 'General',
                description: 'Default bill category (auto-created)',
            },
        });
        return created.id;
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
        
        // Always include minimal tenant, property, and landlord data for scope computation
        // Use select to minimize data transfer while still getting what we need
        include.tenants = includeTenant ? {
            include: {
                user: {
                    include: {
                        profile: true
                    }
                }
            }
        } : {
            select: {
                id: true,
                tenantCode: true,
                user: {
                    select: {
                        id: true,
                        profile: {
                            select: {
                                fullname: true
                            }
                        }
                    }
                }
            }
        };
        
        include.property = includeProperty ? true : { 
            select: { 
                id: true, 
                name: true 
            } 
        };
        
        include.landlord = includeLandlord ? {
            include: {
                user: {
                    include: {
                        profile: true
                    }
                }
            }
        } : {
            select: {
                id: true,
                landlordCode: true,
                user: {
                    select: {
                        id: true,
                        profile: {
                            select: {
                                fullname: true
                            }
                        }
                    }
                }
            }
        };
        
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

        // Normalize bills to add computed scope fields
        const normalizedBills = BillNormalizer.normalizeMany(bills);

        return {
            data: normalizedBills,
            pagination: {
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize)
            }
        };
    }

    getBillById = async (billId: string) => {
        const bill = await prismaClient.billsSubCategory.findUnique({
            where: { id: billId },
            include: {
                tenants: {
                    include: {
                        user: {
                            include: {
                                profile: true
                            }
                        }
                    }
                },
                property: true,
                landlord: {
                    include: {
                        user: {
                            include: {
                                profile: true
                            }
                        }
                    }
                }
            }
        });
        
        if (!bill) return null;
        
        // Normalize the bill to include scope information
        return BillNormalizer.normalize(bill);
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
        
        const updatedBill = await prismaClient.billsSubCategory.update({
            where: { id: billId },
            data: billData,
            include: {
                tenants: {
                    include: {
                        user: {
                            include: {
                                profile: true
                            }
                        }
                    }
                },
                property: true,
                landlord: {
                    include: {
                        user: {
                            include: {
                                profile: true
                            }
                        }
                    }
                }
            }
        });
        
        // Normalize the updated bill to include scope information
        return BillNormalizer.normalize(updatedBill);
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
        const bills = await prismaClient.billsSubCategory.findMany({
            where: {
                propertyId,
                landlordId
            },
            include: {
                property: true,
                landlord: true,
                tenants: {
                    include: {
                        user: {
                            include: {
                                profile: true
                            }
                        }
                    }
                }
            }
        });
        
        // Normalize bills to include scope information
        return BillNormalizer.normalizeMany(bills);
    }

    /** Bills visible to a tenant: tenant-specific, property-wide, or landlord-wide (tenant-payable only). */
    getBillsForTenant = async (
        tenantId: string,
        propertyId: string | null,
        landlordId: string | null,
        options: {
            pagination?: PaginationOptions;
            includeOptions?: IncludeOptions;
            payableBy?: PayableBy;
            status?: 'paid' | 'unpaid';
            dateRange?: BillFilterOptions['dateRange'];
            billId?: string;
        } = {}
    ) => {
        const scopeConditions: any[] = [{ tenantId }];
        if (propertyId) {
            scopeConditions.push({ tenantId: null, propertyId });
        }
        if (landlordId) {
            scopeConditions.push({ tenantId: null, propertyId: null, landlordId });
        }

        const where: any = {
            isDeleted: false,
            OR: scopeConditions,
        };

        if (options.payableBy) where.payableBy = options.payableBy;
        if (options.billId) where.billId = options.billId;
        if (options.dateRange) {
            where.dueDate = {};
            if (options.dateRange.start) where.dueDate.gte = options.dateRange.start;
            if (options.dateRange.end) where.dueDate.lte = options.dateRange.end;
        }
        if (options.status === 'paid') where.transactions = { some: {} };
        if (options.status === 'unpaid') where.transactions = { none: {} };

        const page = options.pagination?.page ?? 1;
        const pageSize = options.pagination?.pageSize ?? 50;
        const includeOptions = options.includeOptions ?? {};

        const include: any = {
            tenants: { select: { id: true, tenantCode: true } },
            property: { select: { id: true, name: true } },
            landlord: { select: { id: true, landlordCode: true } },
        };
        if (includeOptions.includeTransactions) include.transactions = true;
        if (includeOptions.includeBillCategory) include.bills = true;

        const [total, bills] = await Promise.all([
            prismaClient.billsSubCategory.count({ where }),
            prismaClient.billsSubCategory.findMany({
                where,
                include,
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { dueDate: 'asc' },
            }),
        ]);

        return {
            data: BillNormalizer.normalizeMany(bills),
            pagination: {
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize) || 1,
            },
        };
    };

    private buildTenantBillScopeWhere(
        tenantId: string,
        propertyId: string | null,
        landlordId: string | null
    ) {
        const scopeConditions: any[] = [{ tenantId }];
        if (propertyId) {
            scopeConditions.push({ tenantId: null, propertyId });
        }
        if (landlordId) {
            scopeConditions.push({ tenantId: null, propertyId: null, landlordId });
        }

        return {
            isDeleted: false,
            payableBy: PayableBy.TENANT,
            OR: scopeConditions,
        };
    }

    getUpcomingBillsForTenant = async (
        tenantId: string,
        propertyId: string | null,
        landlordId: string | null,
        days = 30
    ) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

        const bills = await prismaClient.billsSubCategory.findMany({
            where: {
                ...this.buildTenantBillScopeWhere(tenantId, propertyId, landlordId),
                dueDate: { gte: today, lte: futureDate },
                transactions: { none: {} },
            },
            include: {
                property: { select: { id: true, name: true } },
                bills: true,
                transactions: true,
            },
            orderBy: { dueDate: 'asc' },
        });

        return BillNormalizer.normalizeMany(bills);
    };

    getOverdueBillsForTenant = async (
        tenantId: string,
        propertyId: string | null,
        landlordId: string | null
    ) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const bills = await prismaClient.billsSubCategory.findMany({
            where: {
                ...this.buildTenantBillScopeWhere(tenantId, propertyId, landlordId),
                dueDate: { lt: today },
                transactions: { none: {} },
            },
            include: {
                property: { select: { id: true, name: true } },
                bills: true,
                transactions: true,
            },
            orderBy: { dueDate: 'asc' },
        });

        return BillNormalizer.normalizeMany(bills);
    };

    seedMarketBillCategories = async (market: string) => {
        const { getBillCatalogForMarket } = await import('../../utils/billCatalog');
        const catalog = getBillCatalogForMarket(market);
        const createdCategories: string[] = [];
        const skippedCategories: string[] = [];

        for (const category of catalog) {
            const existing = await prismaClient.bills.findFirst({
                where: {
                    name: { equals: category.name, mode: 'insensitive' },
                },
            });
            if (existing) {
                skippedCategories.push(category.name);
                continue;
            }
            await prismaClient.bills.create({
                data: {
                    name: category.name,
                    description: category.description,
                },
            });
            createdCategories.push(category.name);
        }

        return { market, createdCategories, skippedCategories };
    };
}

export default new BillService();