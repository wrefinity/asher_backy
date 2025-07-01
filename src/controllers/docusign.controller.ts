import { Request, Response } from 'express';
import docuTemplateService from '../services/docu.template.services';
import { CustomRequest } from '../utils/types';
import { createDocuTemplateSchema,updateDocuTemplateSchema, assignDocuTemplateSchema, createVersionSchema } from '../validations/schemas/docusign.schema';

class DocuTemplateController {
      // Create a new template
  async createTemplate(req: CustomRequest, res: Response) {
    try {
      const { error } = createDocuTemplateSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const template = await docuTemplateService.createTemplate({
        ...req.body,
        ownerId: req.user.id
      });

      if(template) {
        await docuTemplateService.assignTemplate({
          templateId: template.id,
          userId: req.user.id
        });
      }
      res.status(201).json({
        success: true,
        data: template
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Create a new version for a template
  async createVersion(req: CustomRequest, res: Response) {
    try {
      const { id } = req.params;
      const { error } = createVersionSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      await docuTemplateService.createTemplateVersion(id, req.body, req.user.id);
      
      res.status(201).json({
        success: true,
        message: 'New template version created successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update template metadata
  async updateTemplate(req: CustomRequest, res: Response) {
    try {
      const { id } = req.params;
      const { error } = updateDocuTemplateSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const updated = await docuTemplateService.updateTemplate(id, req.body);
      
      res.status(200).json({
        success: true,
        data: updated
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Assign template to user
  async assignTemplate(req: CustomRequest, res: Response) {
    try {
      const { error } = assignDocuTemplateSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
      const userId = req.user.id;
      const assignment = await docuTemplateService.assignTemplate({...req.body, userId});
      
      res.status(200).json({
        success: true,
        data: assignment
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get user's templates
  async getUserTemplates(req: CustomRequest, res: Response) {
    try {
      const templates = await docuTemplateService.getUserTemplates(req.user.id);
      
      res.status(200).json({
        success: true,
        data: templates
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Set default template for user
  async setDefaultTemplate(req: CustomRequest, res: Response) {
    try {
      const { templateId } = req.body;
      
      await docuTemplateService.setDefaultTemplate(req.user.id, templateId);
      
      res.status(200).json({
        success: true,
        message: 'Default template set successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get template versions
  async getTemplateVersions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const versions = await docuTemplateService.getTemplateVersions(id);
      
      res.status(200).json({
        success: true,
        data: versions
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get specific template version
  async getTemplateVersion(req: Request, res: Response) {
    try {
      const { id, version } = req.params;
      const versionNum = parseInt(version, 10);
      
      if (isNaN(versionNum)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid version number'
        });
      }

      const versionData = await docuTemplateService.getTemplateVersion(id, versionNum);
      
      if (!versionData) {
        return res.status(404).json({
          success: false,
          message: 'Version not found'
        });
      }

      res.status(200).json({
        success: true,
        data: versionData
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get template by ID
  async getTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const template = await docuTemplateService.getTemplateById(id);
      
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }

      res.status(200).json({
        success: true,
        data: template
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Delete template (soft delete)
  async deleteTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await docuTemplateService.deleteTemplate(id);
      
      res.status(200).json({
        success: true,
        message: 'Template deactivated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

}

export default new DocuTemplateController();