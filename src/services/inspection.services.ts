import { prismaClient } from "..";
import { InspectionCreateInput, InspectionUpdateInput } from '../validations/interfaces/inspection.interface';

class InspectionService {


    createInspection = async (data: InspectionCreateInput) => {
        // Convert scheduledDate string to Date if provided
        const scheduledDate = data.scheduledDate 
            ? (typeof data.scheduledDate === 'string' ? new Date(data.scheduledDate) : data.scheduledDate)
            : undefined;

        return prismaClient.inspection.create({
            data: {
                propertyId: data.propertyId,
                tenantId: data.tenantId || null,
                type: data.type || null,
                scheduledDate: scheduledDate || null,
                scheduledTime: data.scheduledTime || null,
                inspector: data.inspector || null,
                inspectorId: data.inspectorId || null,
                status: data.status || 'Scheduled',
                priority: data.priority || null,
                score: data.score || null,
                findings: data.findings || 0,
                criticalIssues: data.criticalIssues || 0,
                overallCondition: data.overallCondition || null,
                generalNotes: data.generalNotes || data.notes || null, // Use generalNotes, fallback to notes
                recommendations: data.recommendations || null,
                notes: data.notes || null, // Keep for backward compatibility
            },
            include: {
                property: true,
                tenant: true,
            },
        });
    }

    getInspectionsByProperty = async (propertyId: string) => {
        return prismaClient.inspection.findMany({
            where: { propertyId },
            include: { tenant: true },
        });
    }

    getInspectionById = async (id: string) => {
        return prismaClient.inspection.findUnique({
            where: { id },
            include: { property: true, tenant: true },
        });
    }

    updateInspection = async (id: string, data: InspectionUpdateInput) => {
        // Convert date strings to Date objects if provided
        const scheduledDate = data.scheduledDate 
            ? (typeof data.scheduledDate === 'string' ? new Date(data.scheduledDate) : data.scheduledDate)
            : undefined;
        
        const completedAt = data.completedAt 
            ? (typeof data.completedAt === 'string' ? new Date(data.completedAt) : data.completedAt)
            : undefined;

        // Build update object with only provided fields
        const updateData: any = {};
        
        if (data.type !== undefined) updateData.type = data.type || null;
        if (data.scheduledDate !== undefined) updateData.scheduledDate = scheduledDate || null;
        if (data.scheduledTime !== undefined) updateData.scheduledTime = data.scheduledTime || null;
        if (data.inspector !== undefined) updateData.inspector = data.inspector || null;
        if (data.inspectorId !== undefined) updateData.inspectorId = data.inspectorId || null;
        if (data.status !== undefined) updateData.status = data.status || null;
        if (data.priority !== undefined) updateData.priority = data.priority || null;
        if (data.score !== undefined) updateData.score = data.score || null;
        if (data.findings !== undefined) updateData.findings = data.findings ?? 0;
        if (data.criticalIssues !== undefined) updateData.criticalIssues = data.criticalIssues ?? 0;
        if (data.overallCondition !== undefined) updateData.overallCondition = data.overallCondition || null;
        if (data.generalNotes !== undefined) updateData.generalNotes = data.generalNotes || null;
        if (data.recommendations !== undefined) updateData.recommendations = data.recommendations || null;
        if (data.notes !== undefined) updateData.notes = data.notes || null; // Keep for backward compatibility
        if (data.completedAt !== undefined) updateData.completedAt = completedAt || null;

        // If generalNotes is updated but notes is not, sync notes to generalNotes for backward compatibility
        if (data.generalNotes !== undefined && data.notes === undefined) {
            updateData.notes = data.generalNotes || null;
        }

        return prismaClient.inspection.update({
            where: { id },
            data: updateData,
            include: {
                property: true,
                tenant: true,
            },
        });
    }

    deleteInspection = async (id: string) => {
        return prismaClient.inspection.delete({
            where: { id },
        });
    }

    // ============================================
    // NEW METHODS (Enhanced Inspection System)
    // ============================================

    /**
     * Get complete inspection with all relations (sections, items, photos, etc.)
     * @param id - Inspection ID
     */
    getCompleteInspection = async (id: string) => {
        return prismaClient.inspection.findUnique({
            where: { id },
            include: {
                property: true,
                tenant: true,
                sections: {
                    include: {
                        items: {
                            include: {
                                photos: true,
                            },
                            orderBy: { createdAt: 'asc' },
                        },
                        photos: true,
                    },
                    orderBy: { createdAt: 'asc' },
                },
                certificates: {
                    orderBy: { generatedAt: 'desc' },
                },
                acknowledgment: {
                    include: {
                        tenant: {
                            include: {
                                user: {
                                    select: {
                                        email: true,
                                        profile: {
                                            select: {
                                                fullname: true,
                                                firstName: true,
                                                lastName: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                chatRoom: {
                    include: {
                        messages: {
                            include: {
                                sender: {
                                    select: {
                                        email: true,
                                        profile: {
                                            select: {
                                                fullname: true,
                                                profileUrl: true,
                                            },
                                        },
                                    },
                                },
                            },
                            orderBy: { createdAt: 'asc' },
                            take: 50, // Limit to last 50 messages
                        },
                    },
                },
            },
        });
    }

    /**
     * Save inspection sections with items
     * @param inspectionId - Inspection ID
     * @param sections - Array of sections with items
     */
    saveSections = async (
        inspectionId: string,
        sections: Array<{
            sectionType: string;
            items: Array<{
                itemName: string;
                condition: string;
                notes?: string;
                actionRequired?: boolean;
                severity?: string;
            }>;
        }>
    ) => {
        // Delete existing sections and items (cascade will handle items)
        await prismaClient.inspectionSection.deleteMany({
            where: { inspectionId },
        });

        // Create new sections with items
        const createdSections = await Promise.all(
            sections.map((section) =>
                prismaClient.inspectionSection.create({
                    data: {
                        inspectionId,
                        sectionType: section.sectionType,
                        items: {
                            create: section.items.map((item) => ({
                                itemName: item.itemName,
                                condition: item.condition,
                                notes: item.notes || null,
                                actionRequired: item.actionRequired || false,
                                severity: item.severity || null,
                            })),
                        },
                    },
                    include: {
                        items: true,
                    },
                })
            )
        );

        // Update inspection with findings count
        const totalItems = sections.reduce(
            (sum, section) => sum + section.items.length,
            0
        );
        const criticalItems = sections.reduce(
            (sum, section) =>
                sum +
                section.items.filter(
                    (item) =>
                        item.actionRequired && item.severity === 'Critical'
                ).length,
            0
        );

        await prismaClient.inspection.update({
            where: { id: inspectionId },
            data: {
                findings: totalItems,
                criticalIssues: criticalItems,
            },
        });

        return createdSections;
    }

    /**
     * Share inspection with tenant (creates acknowledgment record)
     * @param inspectionId - Inspection ID
     * @param tenantId - Tenant ID
     */
    shareWithTenant = async (inspectionId: string, tenantId: string) => {
        // Check if acknowledgment already exists
        const existing = await prismaClient.inspectionAcknowledgment.findUnique({
            where: { inspectionId },
        });

        if (existing) {
            throw new Error('Inspection already shared with tenant');
        }

        // Create acknowledgment record
        return prismaClient.inspectionAcknowledgment.create({
            data: {
                inspectionId,
                tenantId,
                acknowledged: false,
            },
            include: {
                tenant: {
                    include: {
                        user: {
                            select: {
                                email: true,
                            },
                        },
                    },
                },
            },
        });
    }

    /**
     * Get inspection statistics for a landlord
     * @param landlordId - Landlord ID
     */
    getInspectionStatistics = async (landlordId: string) => {
        // Get all properties for landlord
        const properties = await prismaClient.properties.findMany({
            where: { landlordId },
            select: { id: true },
        });

        const propertyIds = properties.map((p) => p.id);

        if (propertyIds.length === 0) {
            return {
                total: 0,
                scheduled: 0,
                inProgress: 0,
                completed: 0,
                criticalIssues: 0,
            };
        }

        const [total, scheduled, inProgress, completed, criticalIssuesData] =
            await Promise.all([
                prismaClient.inspection.count({
                    where: { propertyId: { in: propertyIds } },
                }),
                prismaClient.inspection.count({
                    where: {
                        propertyId: { in: propertyIds },
                        status: 'Scheduled',
                    },
                }),
                prismaClient.inspection.count({
                    where: {
                        propertyId: { in: propertyIds },
                        status: 'In Progress',
                    },
                }),
                prismaClient.inspection.count({
                    where: {
                        propertyId: { in: propertyIds },
                        status: 'Completed',
                    },
                }),
                prismaClient.inspection.aggregate({
                    where: { propertyId: { in: propertyIds } },
                    _sum: { criticalIssues: true },
                }),
            ]);

        return {
            total,
            scheduled,
            inProgress,
            completed,
            criticalIssues: criticalIssuesData._sum.criticalIssues || 0,
        };
    }
}

export default new InspectionService()