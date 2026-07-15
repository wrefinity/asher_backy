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
                trigger: data.trigger || 'MANUAL',
                moveOutNoticeId: data.moveOutNoticeId || null,
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
                onSiteSignature: data.onSiteSignature || null,
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
        if (data.trigger !== undefined) updateData.trigger = data.trigger || null;
        if (data.moveOutNoticeId !== undefined) updateData.moveOutNoticeId = data.moveOutNoticeId || null;
        if ((data as any).tenantId !== undefined) updateData.tenantId = (data as any).tenantId || null;
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
        if (data.onSiteSignature !== undefined) updateData.onSiteSignature = data.onSiteSignature || null;
        if (data.inspectorSignature !== undefined) {
            updateData.inspectorSignature = data.inspectorSignature || null;
        }
        if (data.landlordSignature !== undefined) {
            updateData.landlordSignature = data.landlordSignature || null;
        }
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
     * Save inspection sections with items.
     * Merges by sectionType: only provided types are replaced; other sections are kept.
     * This prevents step autosave from wiping previous progress/photos.
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
        if (!Array.isArray(sections) || sections.length === 0) {
            return [];
        }

        // Upsert by sectionType + itemName so guest/landlord photo IDs survive saves.
        const savedSections = [];
        for (const section of sections) {
            const sectionType = (section.sectionType || '').trim().toLowerCase();
            if (!sectionType) continue;

            let existing = await prismaClient.inspectionSection.findFirst({
                where: { inspectionId, sectionType },
                include: { items: true },
            });

            if (!existing) {
                existing = await prismaClient.inspectionSection.create({
                    data: { inspectionId, sectionType },
                    include: { items: true },
                });
            }

            const payloadItems = Array.isArray(section.items) ? section.items : [];
            const keepNames = new Set(
                payloadItems
                    .map((item) => (item.itemName || '').trim())
                    .filter(Boolean)
            );

            // Remove items that are no longer in the payload for this section
            const toRemove = existing.items.filter(
                (item) => !keepNames.has((item.itemName || '').trim())
            );
            if (toRemove.length > 0) {
                await prismaClient.inspectionItem.deleteMany({
                    where: { id: { in: toRemove.map((i) => i.id) } },
                });
            }

            for (const item of payloadItems) {
                const itemName = (item.itemName || '').trim();
                if (!itemName) continue;
                const data = {
                    itemName,
                    condition: item.condition,
                    notes: item.notes || null,
                    actionRequired: item.actionRequired || false,
                    severity: item.severity || null,
                };
                const match = existing.items.find(
                    (row) => (row.itemName || '').trim() === itemName
                );
                if (match) {
                    await prismaClient.inspectionItem.update({
                        where: { id: match.id },
                        data,
                    });
                } else {
                    await prismaClient.inspectionItem.create({
                        data: { sectionId: existing.id, ...data },
                    });
                }
            }

            const refreshed = await prismaClient.inspectionSection.findUnique({
                where: { id: existing.id },
                include: {
                    items: { include: { photos: true } },
                },
            });
            if (refreshed) savedSections.push(refreshed);
        }

        // Recompute findings from the full section set after merge
        const allSections = await prismaClient.inspectionSection.findMany({
            where: { inspectionId },
            include: { items: true },
        });

        const nonGoodItems = allSections.reduce(
            (sum, section) =>
                sum +
                section.items.filter((item) => {
                    const condition = (item.condition || '').trim().toLowerCase();
                    return condition && condition !== 'good' && condition !== 'n/a' && condition !== 'na';
                }).length,
            0
        );
        const criticalItems = allSections.reduce(
            (sum, section) =>
                sum +
                section.items.filter((item) => {
                    if (!item.actionRequired) return false;
                    const severity = (item.severity || '').trim().toLowerCase();
                    return severity === 'critical' || severity === 'high';
                }).length,
            0
        );

        await prismaClient.inspection.update({
            where: { id: inspectionId },
            data: {
                findings: nonGoodItems,
                criticalIssues: criticalItems,
            },
        });

        return savedSections;
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
                notStarted: 0,
                scheduled: 0,
                inProgress: 0,
                completed: 0,
                criticalIssues: 0,
            };
        }

        const [total, notStarted, scheduled, inProgress, completed, criticalIssuesData] =
            await Promise.all([
                prismaClient.inspection.count({
                    where: { propertyId: { in: propertyIds } },
                }),
                prismaClient.inspection.count({
                    where: {
                        propertyId: { in: propertyIds },
                        status: 'Not Started',
                    },
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
            notStarted,
            scheduled,
            inProgress,
            completed,
            criticalIssues: criticalIssuesData._sum.criticalIssues || 0,
        };
    }
}

export default new InspectionService()