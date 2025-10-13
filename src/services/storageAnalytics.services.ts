import { prismaClient } from "..";


export interface StorageAnalytics {
  totalFiles: number;
  storageUsed: number; 
  storageAvailable: number;
  storageUsedPercentage: number;
  filesByType: {
    images: number;
    documents: number;
    videos: number;
    other: number;
  };
  recentFiles: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    uploadedAt: Date;
    propertyId?: string;
    propertyName?: string;
  }>;
  storageBreakdown: Array<{
    category: string;
    files: number;
    size: number;
    percentage: number;
  }>;
}

class StorageAnalyticsService {
  async getStorageAnalytics(landlordId: string): Promise<StorageAnalytics> {
    // Get all property documents for the landlord
    const propertyDocuments = await prismaClient.propertyDocument.findMany({
      where: {
        properties: {
          landlordId: landlordId,
          isDeleted: false
        }
      },
      include: {
        properties: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Get application documents
    const applicationDocuments = await prismaClient.agreementDocument.findMany({
      where: {
        application: {
          properties: {
            landlordId: landlordId,
            isDeleted: false
          }
        }
      },
      include: {
        application: {
          include: {
            properties: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    // Combine all documents
    const allDocuments = [
      ...propertyDocuments.map(doc => ({
        id: doc.id,
        name: doc.documentName || 'Unknown',
        size: this.estimateFileSize(doc.documentUrl),
        type: this.getFileType(doc.documentUrl),
        uploadedAt: doc.createdAt,
        propertyId: doc.properties?.id,
        propertyName: doc.properties?.name
      })),
      ...applicationDocuments.map(doc => ({
        id: doc.id,
        name: `Agreement Document`,
        size: this.estimateFileSize(doc.documentUrl),
        type: this.getFileType(doc.documentUrl),
        uploadedAt: doc.createdAt,
        propertyId: doc.application?.properties?.id,
        propertyName: doc.application?.properties?.name
      }))
    ];

    // Calculate analytics
    const totalFiles = allDocuments.length;
    const totalSizeBytes = allDocuments.reduce((sum, doc) => sum + doc.size, 0);
    const storageUsed = totalSizeBytes / (1024 * 1024 * 1024); // Convert to GB
    const storageAvailable = 100 - storageUsed; // Assume 100GB total storage
    const storageUsedPercentage = (storageUsed / 100) * 100;

    // Categorize files by type
    const filesByType = allDocuments.reduce((acc, doc) => {
      switch (doc.type) {
        case 'image':
          acc.images++;
          break;
        case 'document':
          acc.documents++;
          break;
        case 'video':
          acc.videos++;
          break;
        default:
          acc.other++;
          break;
      }
      return acc;
    }, { images: 0, documents: 0, videos: 0, other: 0 });

    // Get recent files (last 10)
    const recentFiles = allDocuments
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
      .slice(0, 10);

    // Storage breakdown by property
    const storageBreakdown = allDocuments.reduce((acc, doc) => {
      const propertyName = doc.propertyName || 'Unknown Property';
      const existing = acc.find(item => item.category === propertyName);
      
      if (existing) {
        existing.files++;
        existing.size += doc.size;
      } else {
        acc.push({
          category: propertyName,
          files: 1,
          size: doc.size,
          percentage: 0
        });
      }
      
      return acc;
    }, [] as Array<{ category: string; files: number; size: number; percentage: number }>);

    // Calculate percentages for storage breakdown
    storageBreakdown.forEach(item => {
      item.percentage = totalSizeBytes > 0 ? (item.size / totalSizeBytes) * 100 : 0;
    });

    return {
      totalFiles,
      storageUsed: Math.round(storageUsed * 100) / 100, // Round to 2 decimal places
      storageAvailable: Math.round(storageAvailable * 100) / 100,
      storageUsedPercentage: Math.round(storageUsedPercentage * 100) / 100,
      filesByType,
      recentFiles,
      storageBreakdown
    };
  }

  private estimateFileSize(documentUrls: string[]): number {
    // Rough estimation based on file type and URLs
    // In a real implementation, you'd store actual file sizes
    if (!documentUrls || documentUrls.length === 0) {
      return 1 * 1024 * 1024; // 1MB default
    }
    
    // Use the first URL to estimate size
    const firstUrl = documentUrls[0];
    if (firstUrl.includes('image') || firstUrl.includes('photo')) {
      return 2 * 1024 * 1024; // 2MB average for images
    } else if (firstUrl.includes('video')) {
      return 50 * 1024 * 1024; // 50MB average for videos
    } else if (firstUrl.includes('pdf') || firstUrl.includes('document')) {
      return 1 * 1024 * 1024; // 1MB average for documents
    }
    return 1 * 1024 * 1024; // 1MB default
  }

  private getFileType(documentUrls: string[]): string {
    if (!documentUrls || documentUrls.length === 0) {
      return 'other';
    }
    
    // Use the first URL to determine file type
    const firstUrl = documentUrls[0];
    const extension = firstUrl.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return 'image';
    } else if (['pdf', 'doc', 'docx', 'txt'].includes(extension || '')) {
      return 'document';
    } else if (['mp4', 'avi', 'mov', 'wmv'].includes(extension || '')) {
      return 'video';
    }
    
    return 'other';
  }
}

export default new StorageAnalyticsService();
