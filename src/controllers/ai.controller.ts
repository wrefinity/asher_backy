import { Response } from "express";
import { CustomRequest } from "../utils/types";
import ErrorService from "../services/error.service";
import openRouterService from "../services/openrouter.service";

class AIController {
  /**
   * Analyze support ticket and provide insights
   */
  analyzeTicket = async (req: CustomRequest, res: Response) => {
    try {
      const { ticket } = req.body;

      if (!ticket || !ticket.subject || !ticket.description) {
        return res.status(400).json({
          success: false,
          message: "Ticket subject and description are required",
        });
      }

      const analysis = await openRouterService.analyzeTicket(ticket);

      return res.status(200).json({
        success: true,
        data: analysis,
      });
    } catch (error: any) {
      ErrorService.handleError(error, res);
    }
  };

  /**
   * Generate smart chat replies
   */
  generateSmartReplies = async (req: CustomRequest, res: Response) => {
    try {
      const { conversationHistory, context } = req.body;

      if (!conversationHistory || !Array.isArray(conversationHistory)) {
        return res.status(400).json({
          success: false,
          message: "Conversation history is required",
        });
      }

      const replies = await openRouterService.generateSmartReplies({
        conversationHistory,
        context,
      });

      return res.status(200).json({
        success: true,
        data: { replies },
      });
    } catch (error: any) {
      ErrorService.handleError(error, res);
    }
  };

  /**
   * Generate email draft
   */
  generateEmailDraft = async (req: CustomRequest, res: Response) => {
    try {
      const { subject, recipientRole, context, tone } = req.body;

      if (!subject || !recipientRole) {
        return res.status(400).json({
          success: false,
          message: "Subject and recipient role are required",
        });
      }

      const draft = await openRouterService.generateEmailDraft({
        subject,
        recipientRole,
        context,
        tone,
      });

      return res.status(200).json({
        success: true,
        data: { draft },
      });
    } catch (error: any) {
      ErrorService.handleError(error, res);
    }
  };

  /**
   * Generate document template
   */
  generateDocumentTemplate = async (req: CustomRequest, res: Response) => {
    try {
      const { title, type, additionalRequirements } = req.body;

      if (!title || !type) {
        return res.status(400).json({
          success: false,
          message: "Title and type are required",
        });
      }

      const template = await openRouterService.generateDocumentTemplate({
        title,
        type,
        additionalRequirements,
      });

      return res.status(200).json({
        success: true,
        data: { template },
      });
    } catch (error: any) {
      ErrorService.handleError(error, res);
    }
  };

  /**
   * Generate property description
   */
  generatePropertyDescription = async (req: CustomRequest, res: Response) => {
    try {
      const { propertyData } = req.body;

      if (!propertyData) {
        return res.status(400).json({
          success: false,
          message: "Property data is required",
        });
      }

      const description = await openRouterService.generatePropertyDescription(propertyData);

      return res.status(200).json({
        success: true,
        data: { description },
      });
    } catch (error: any) {
      ErrorService.handleError(error, res);
    }
  };
}

export default new AIController();
