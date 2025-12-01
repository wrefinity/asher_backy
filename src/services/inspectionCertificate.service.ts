import { prismaClient } from '..';
import { supabase, STORAGE_BUCKET } from '../configs/supabase';
import jsPDF from 'jspdf';

interface CertificateData {
    inspection: any;
    type: 'landlord' | 'tenant';
    generatedBy: string;
}

class InspectionCertificateService {
    /**
     * Generate PDF certificate for inspection
     * @param inspectionId - Inspection ID
     * @param type - Certificate type (landlord or tenant)
     * @param userId - User ID generating the certificate
     * @returns Certificate record with PDF URL
     */
    async generateCertificate(
        inspectionId: string,
        type: 'landlord' | 'tenant',
        userId: string
    ) {
        try {
            // Get complete inspection data
            const inspection = await prismaClient.inspection.findUnique({
                where: { id: inspectionId },
                include: {
                    property: true,
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
                    sections: {
                        include: {
                            items: {
                                include: {
                                    photos: true,
                                },
                            },
                        },
                    },
                    acknowledgment: true,
                },
            });

            if (!inspection) {
                throw new Error('Inspection not found');
            }

            // Generate PDF
            const pdfBuffer = await this.createPDF({
                inspection,
                type,
                generatedBy: userId,
            });

            // Upload PDF to Supabase storage
            const timestamp = Date.now();
            const fileName = `inspection_certificate_${type}_${inspectionId}_${timestamp}.pdf`;
            const objectName = `certificates/${fileName}`;

            const { data, error } = await supabase.storage
                .from(STORAGE_BUCKET)
                .upload(objectName, pdfBuffer, {
                    cacheControl: '3600',
                    contentType: 'application/pdf',
                    upsert: false,
                });

            if (error || !data?.path) {
                throw error || new Error('Failed to upload PDF to Supabase storage');
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from(STORAGE_BUCKET)
                .getPublicUrl(data.path);

            if (!urlData?.publicUrl) {
                throw new Error('Failed to get public URL for PDF');
            }

            // Save certificate record to database
            const certificate = await prismaClient.inspectionCertificate.create({
                data: {
                    inspectionId,
                    type,
                    pdfUrl: urlData.publicUrl,
                    generatedBy: userId,
                },
            });

            return certificate;
        } catch (error) {
            console.error('Error generating inspection certificate:', error);
            throw error;
        }
    }

    /**
     * Create PDF document
     * @param data - Certificate data
     * @returns PDF buffer
     */
    private async createPDF(data: CertificateData): Promise<Buffer> {
        const { inspection, type } = data;

        // Create PDF
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        let yPosition = margin;

        // Helper to add new page if needed
        const checkPageBreak = (neededHeight: number) => {
            if (yPosition + neededHeight > pageHeight - margin) {
                doc.addPage();
                yPosition = margin;
                return true;
            }
            return false;
        };

        // Header
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('PROPERTY INSPECTION CERTIFICATE', pageWidth / 2, yPosition, {
            align: 'center',
        });
        yPosition += 10;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(
            `Certificate Type: ${type.toUpperCase()}`,
            pageWidth / 2,
            yPosition,
            { align: 'center' }
        );
        yPosition += 15;

        // Property Information
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Property Information', margin, yPosition);
        yPosition += 7;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Property: ${inspection.property.name}`, margin, yPosition);
        yPosition += 5;
        doc.text(`Address: ${inspection.property.address}`, margin, yPosition);
        yPosition += 5;
        doc.text(
            `City: ${inspection.property.city}, ${inspection.property.country}`,
            margin,
            yPosition
        );
        yPosition += 10;

        // Inspection Details
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Inspection Details', margin, yPosition);
        yPosition += 7;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Type: ${inspection.type || 'N/A'}`, margin, yPosition);
        yPosition += 5;
        doc.text(`Status: ${inspection.status || 'N/A'}`, margin, yPosition);
        yPosition += 5;
        doc.text(
            `Scheduled Date: ${
                inspection.scheduledDate
                    ? new Date(inspection.scheduledDate).toLocaleDateString()
                    : 'N/A'
            }`,
            margin,
            yPosition
        );
        yPosition += 5;
        doc.text(`Inspector: ${inspection.inspector || 'N/A'}`, margin, yPosition);
        yPosition += 5;
        doc.text(
            `Overall Condition: ${inspection.overallCondition || 'N/A'}`,
            margin,
            yPosition
        );
        yPosition += 5;
        doc.text(
            `Total Findings: ${inspection.findings || 0}`,
            margin,
            yPosition
        );
        yPosition += 5;
        doc.text(
            `Critical Issues: ${inspection.criticalIssues || 0}`,
            margin,
            yPosition
        );
        yPosition += 10;

        // Sections and Items
        if (inspection.sections && inspection.sections.length > 0) {
            checkPageBreak(20);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Inspection Findings', margin, yPosition);
            yPosition += 10;

            for (const section of inspection.sections) {
                checkPageBreak(15);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(
                    `${section.sectionType.toUpperCase()} SECTION`,
                    margin,
                    yPosition
                );
                yPosition += 7;

                if (section.items && section.items.length > 0) {
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');

                    for (const item of section.items) {
                        checkPageBreak(10);
                        doc.text(
                            `• ${item.itemName}: ${item.condition}`,
                            margin + 5,
                            yPosition
                        );
                        yPosition += 5;

                        if (item.notes) {
                            const notes = doc.splitTextToSize(
                                `  Notes: ${item.notes}`,
                                pageWidth - margin * 2 - 10
                            );
                            doc.text(notes, margin + 5, yPosition);
                            yPosition += notes.length * 5;
                        }

                        if (item.actionRequired) {
                            doc.setFont('helvetica', 'bold');
                            doc.text(
                                `  ⚠️ Action Required (Severity: ${
                                    item.severity || 'N/A'
                                })`,
                                margin + 5,
                                yPosition
                            );
                            doc.setFont('helvetica', 'normal');
                            yPosition += 5;
                        }

                        yPosition += 2;
                    }
                } else {
                    doc.text('No items recorded', margin + 5, yPosition);
                    yPosition += 5;
                }

                yPosition += 5;
            }
        }

        // Notes and Recommendations
        checkPageBreak(20);
        if (inspection.generalNotes) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('General Notes', margin, yPosition);
            yPosition += 7;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const notes = doc.splitTextToSize(
                inspection.generalNotes,
                pageWidth - margin * 2
            );
            doc.text(notes, margin, yPosition);
            yPosition += notes.length * 5 + 5;
        }

        if (inspection.recommendations) {
            checkPageBreak(20);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Recommendations', margin, yPosition);
            yPosition += 7;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const recommendations = doc.splitTextToSize(
                inspection.recommendations,
                pageWidth - margin * 2
            );
            doc.text(recommendations, margin, yPosition);
            yPosition += recommendations.length * 5 + 5;
        }

        // Tenant Acknowledgment (for tenant certificate)
        if (type === 'tenant' && inspection.acknowledgment) {
            checkPageBreak(30);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Tenant Acknowledgment', margin, yPosition);
            yPosition += 7;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(
                `Acknowledged: ${
                    inspection.acknowledgment.acknowledged ? 'Yes' : 'No'
                }`,
                margin,
                yPosition
            );
            yPosition += 5;

            if (inspection.acknowledgment.acknowledgedAt) {
                doc.text(
                    `Date: ${new Date(
                        inspection.acknowledgment.acknowledgedAt
                    ).toLocaleDateString()}`,
                    margin,
                    yPosition
                );
                yPosition += 5;
            }

            if (inspection.acknowledgment.comments) {
                doc.text('Comments:', margin, yPosition);
                yPosition += 5;
                const comments = doc.splitTextToSize(
                    inspection.acknowledgment.comments,
                    pageWidth - margin * 2
                );
                doc.text(comments, margin, yPosition);
                yPosition += comments.length * 5 + 5;
            }

            if (inspection.acknowledgment.disputed) {
                doc.setFont('helvetica', 'bold');
                doc.text('⚠️ THIS INSPECTION HAS BEEN DISPUTED', margin, yPosition);
                doc.setFont('helvetica', 'normal');
                yPosition += 5;
            }
        }

        // Footer
        const footerY = pageHeight - 15;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(
            `Generated on ${new Date().toLocaleString()}`,
            pageWidth / 2,
            footerY,
            { align: 'center' }
        );
        doc.text(
            `Certificate ID: ${inspection.id}`,
            pageWidth / 2,
            footerY + 4,
            { align: 'center' }
        );
        doc.text(
            'Generated with Asher Property Management System',
            pageWidth / 2,
            footerY + 8,
            { align: 'center' }
        );

        // Convert to buffer
        const pdfArrayBuffer = doc.output('arraybuffer');
        return Buffer.from(pdfArrayBuffer);
    }

    /**
     * Get all certificates for an inspection
     * @param inspectionId - Inspection ID
     */
    async getCertificates(inspectionId: string) {
        return prismaClient.inspectionCertificate.findMany({
            where: { inspectionId },
            orderBy: { generatedAt: 'desc' },
        });
    }

    /**
     * Delete a certificate
     * @param certificateId - Certificate ID
     */
    async deleteCertificate(certificateId: string) {
        try {
            const certificate = await prismaClient.inspectionCertificate.findUnique({
                where: { id: certificateId },
            });

            if (!certificate) {
                throw new Error('Certificate not found');
            }

            // Extract path from URL
            const urlParts = certificate.pdfUrl.split(`${STORAGE_BUCKET}/`);
            const storagePath = urlParts[1];

            if (storagePath) {
                // Delete from Supabase storage
                const { error } = await supabase.storage
                    .from(STORAGE_BUCKET)
                    .remove([storagePath]);

                if (error) {
                    console.error('Error deleting from storage:', error);
                }
            }

            // Delete from database
            await prismaClient.inspectionCertificate.delete({
                where: { id: certificateId },
            });

            return { success: true };
        } catch (error) {
            console.error('Error deleting certificate:', error);
            throw error;
        }
    }
}

export default new InspectionCertificateService();
