
import { prismaClient } from "..";
import {
  CreateDocuTemplateDto,
  UpdateDocuTemplateDto,
  AssignDocuTemplateDto,
  CreateVersionDto
} from '../validations/interfaces/docusign.interface';



class DocuTemplateService {
  // Create a new template with initial version
  async createTemplate(data: CreateDocuTemplateDto) {
    return prismaClient.docuTemplate.create({
      data: {
        title: data.title,
        description: data.description,
        content: data.content,
        ownerId: data.ownerId,
        isActive: data.isActive ?? true,
        versions: {
          create: {
            version: 1,
            content: data.content,
            updatedBy: data.ownerId
          }
        }
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1
        }
      }
    });
  }

  // Create a new version for an existing template
  async createTemplateVersion(templateId: string, data: CreateVersionDto, userId: string) {
    const template = await prismaClient.docuTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      throw new Error('Template not found');
    }

    const latestVersion = await prismaClient.docuTemplateVersion.findFirst({
      where: { templateId },
      orderBy: { version: 'desc' }
    });

    const newVersion = latestVersion ? latestVersion.version + 1 : 1;

    return prismaClient.$transaction([
      // Update template with new content
      prismaClient.docuTemplate.update({
        where: { id: templateId },
        data: {
          content: data.content,
          updatedAt: new Date()
        }
      }),
      // Create new version
      prismaClient.docuTemplateVersion.create({
        data: {
          templateId,
          version: newVersion,
          content: data.content,
          updatedBy: userId
        }
      })
    ]);
  }

  // Update template metadata (without creating new version)
  async updateTemplate(id: string, data: UpdateDocuTemplateDto) {
    return prismaClient.docuTemplate.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        isActive: data.isActive
      }
    });
  }

  // Assign template to user
  async assignTemplate(data: AssignDocuTemplateDto) {
    return prismaClient.userDocuTemplate.upsert({
      where: {
        userId_templateId: {
          userId: data.userId,
          templateId: data.templateId
        }
      },
      update: {
        isDefault: data.isDefault ?? false
      },
      create: {
        userId: data.userId,
        templateId: data.templateId,
        isDefault: data.isDefault ?? false
      }
    });
  }

  // Get templates for a specific user
  async getUserTemplates(userId: string) {
    return prismaClient.userDocuTemplate.findMany({
      where: {
        userId,
        template: {
          isActive: true,
        }
      },
      include: {
        template: {
          include: {
            versions: {
              where: {
                isDeleted: false,
              },
              orderBy: {
                version: 'desc',
              },
              take: 1
            }
          }
        }
      }
    });
  }

  // Set default template for a user
  async setDefaultTemplate(userId: string, templateId: string) {
    return prismaClient.$transaction([
      // Clear existing default
      prismaClient.userDocuTemplate.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      }),
      // Set new default
      prismaClient.userDocuTemplate.update({
        where: {
          userId_templateId: {
            userId,
            templateId
          }
        },
        data: { isDefault: true }
      })
    ]);
  }

  // Get template versions
  async getTemplateVersions(templateId: string) {
    return prismaClient.docuTemplateVersion.findMany({
      where: { templateId },
      orderBy: { version: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });
  }

  // Get specific template version
  async getTemplateVersion(templateId: string, version: number) {
    return prismaClient.docuTemplateVersion.findUnique({
      where: {
        templateId_version: {
          templateId,
          version,

        }
      },
      include: {
        user: true
      }
    });
  }

  // Get a template by ID with latest version
  async getTemplateById(id: string) {
    return prismaClient.docuTemplate.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1
        }
      }
    });
  }

  // Delete a template (soft delete)
  async deleteTemplateVersion(id: string) {
    const existingVersion = await prismaClient.docuTemplateVersion.findUnique({
      where: { id },
    });

    if (!existingVersion) {
      throw new Error('Template version not found');
    }
    // Delete the template version
    return await prismaClient.docuTemplateVersion.update({
      where: { id },
      data: { isDeleted: true }
    });
  }
  // Delete a template (soft delete)
  async deleteTemplate(id: string) {
    return prismaClient.docuTemplate.update({
      where: { id },
      data: { isActive: false }
    });
  }
}

export default new DocuTemplateService();