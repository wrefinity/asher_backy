import { Response } from "express";
import { CustomRequest } from "../utils/types";
import { SupportContentService } from "../services/supportContent.service";
import ErrorService from "../services/error.service";

class SupportContentController {
  // ============ FAQ Controllers ============
  createFAQ = async (req: CustomRequest, res: Response) => {
    try {
      const { question, answer, category, order, isPublished, systemId } = req.body;

      if (!question || !answer || !category) {
        return res.status(400).json({
          success: false,
          message: "Question, answer, and category are required",
        });
      }

      const faq = await SupportContentService.createFAQ({
        question,
        answer,
        category,
        order: order ?? 0,
        isPublished: isPublished ?? true,
        systemId: systemId,
        createdBy: req.user?.id,
      });

      return res.status(201).json({
        success: true,
        message: "FAQ created successfully",
        data: faq,
      });
    } catch (error: any) {
      ErrorService.handleError(error, res);
    }
  };

  getFAQs = async (req: CustomRequest, res: Response) => {
    try {
      const { category, isPublished, search, systemId } = req.query;

      const faqs = await SupportContentService.getFAQs({
        category: category as string,
        isPublished:
          isPublished === undefined
            ? undefined
            : isPublished === "true" || Boolean(isPublished) === true,
        search: search as string,
        systemId: systemId as string,
      });

      return res.status(200).json({
        success: true,
        data: faqs,
      });
    } catch (error: any) {
      console.error("Error in getFAQs controller:", error);
      console.error("Error details:", error.message, error.stack);
      ErrorService.handleError(error, res);
    }
  };

  getFAQById = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;

      const faq = await SupportContentService.getFAQById(id);

      if (!faq) {
        return res.status(404).json({
          success: false,
          message: "FAQ not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: faq,
      });
    } catch (error: any) {
      ErrorService.handleError(error, res);
    }
  };

  updateFAQ = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { question, answer, category, order, isPublished } = req.body;

      const faq = await SupportContentService.updateFAQ(id, {
        question,
        answer,
        category,
        order,
        isPublished,
        updatedBy: req.user?.id,
      });

      return res.status(200).json({
        success: true,
        message: "FAQ updated successfully",
        data: faq,
      });
    } catch (error: any) {
      ErrorService.handleError(error, res);
    }
  };

  deleteFAQ = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;

      await SupportContentService.deleteFAQ(id);

      return res.status(200).json({
        success: true,
        message: "FAQ deleted successfully",
      });
    } catch (error: any) {
      ErrorService.handleError(error, res);
    }
  };

  // Track FAQ view
  trackFAQView = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      await SupportContentService.trackFAQView(id);
      return res.status(200).json({
        success: true,
        message: "FAQ view tracked",
      });
    } catch (error: any) {
      ErrorService.handleError(error, res);
    }
  };

  // ============ Help Article Controllers ============
  createHelpArticle = async (req: CustomRequest, res: Response) => {
    try {
      const {
        title,
        description,
        content,
        category,
        readTime,
        thumbnail,
        isPublished,
        systemId,
      } = req.body;

      if (!title || !description || !content || !category || !readTime) {
        return res.status(400).json({
          success: false,
          message:
            "Title, description, content, category, and readTime are required",
        });
      }

      const article = await SupportContentService.createHelpArticle({
        title,
        description,
        content,
        category,
        readTime,
        thumbnail,
        isPublished: isPublished ?? true,
        // systemId: systemId,
        createdBy: req.user?.id,
      });

      return res.status(201).json({
        success: true,
        message: "Help article created successfully",
        data: article,
      });
    } catch (error: any) {
      ErrorService.handleError(error, res);
    }
  };

  getHelpArticles = async (req: CustomRequest, res: Response) => {
    try {
      const { category, isPublished, search, systemId } = req.query;

      const articles = await SupportContentService.getHelpArticles({
        category: category as string,
        isPublished:
          isPublished === undefined
            ? undefined
            : isPublished === "true" || Boolean(isPublished) === true,
        search: search as string,
        systemId: systemId as string,
      });

      return res.status(200).json({
        success: true,
        data: articles,
      });
    } catch (error: any) {
      console.error("Error in getHelpArticles controller:", error);
      console.error("Error details:", error.message, error.stack);
      ErrorService.handleError(error, res);
    }
  };

  getHelpArticleById = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;

      const article = await SupportContentService.getHelpArticleById(id);

      if (!article) {
        return res.status(404).json({
          success: false,
          message: "Help article not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: article,
      });
    } catch (error: any) {
      ErrorService.handleError(error, res);
    }
  };

  updateHelpArticle = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        content,
        category,
        readTime,
        thumbnail,
        isPublished,
      } = req.body;

      const article = await SupportContentService.updateHelpArticle(id, {
        title,
        description,
        content,
        category,
        readTime,
        thumbnail,
        isPublished,
        updatedBy: req.user?.id,
      });

      return res.status(200).json({
        success: true,
        message: "Help article updated successfully",
        data: article,
      });
    } catch (error: any) {
      ErrorService.handleError(error, res);
    }
  };

  deleteHelpArticle = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;

      await SupportContentService.deleteHelpArticle(id);

      return res.status(200).json({
        success: true,
        message: "Help article deleted successfully",
      });
    } catch (error: any) {
      ErrorService.handleError(error, res);
    }
  };

  // Track Help Article view
  trackHelpArticleView = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      await SupportContentService.trackHelpArticleView(id);
      return res.status(200).json({
        success: true,
        message: "Help article view tracked",
      });
    } catch (error: any) {
      ErrorService.handleError(error, res);
    }
  };

  // ============ Video Tutorial Controllers ============
  createVideoTutorial = async (req: CustomRequest, res: Response) => {
    try {
      const {
        title,
        description,
        videoUrl,
        thumbnail,
        duration,
        category,
        isPublished,
        systemId,
      } = req.body;

      if (
        !title ||
        !description ||
        !videoUrl ||
        !thumbnail ||
        !duration ||
        !category
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Title, description, videoUrl, thumbnail, duration, and category are required",
        });
      }

      const video = await SupportContentService.createVideoTutorial({
        title,
        description,
        videoUrl,
        thumbnail,
        duration,
        category,
        isPublished: isPublished ?? true,
        systemId: systemId,
        createdBy: req.user?.id,
      });

      return res.status(201).json({
        success: true,
        message: "Video tutorial created successfully",
        data: video,
      });
    } catch (error: any) {
      ErrorService.handleError(error, res);
    }
  };

  getVideoTutorials = async (req: CustomRequest, res: Response) => {
    try {
      const { category, isPublished, search } = req.query;

      const videos = await SupportContentService.getVideoTutorials({
        category: category as string,
        isPublished:
          isPublished === undefined
            ? undefined
            : isPublished === "true" || Boolean(isPublished) === true,
        search: search as string,
      });

      return res.status(200).json({
        success: true,
        data: videos,
      });
    } catch (error: any) {
      console.error("Error in getVideoTutorials controller:", error);
      console.error("Error details:", error.message, error.stack);
      ErrorService.handleError(error, res);
    }
  };

  getVideoTutorialById = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;

      const video = await SupportContentService.getVideoTutorialById(id);

      if (!video) {
        return res.status(404).json({
          success: false,
          message: "Video tutorial not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: video,
      });
    } catch (error: any) {
      ErrorService.handleError(error, res);
    }
  };

  updateVideoTutorial = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        videoUrl,
        thumbnail,
        duration,
        category,
        isPublished,
      } = req.body;

      const video = await SupportContentService.updateVideoTutorial(id, {
        title,
        description,
        videoUrl,
        thumbnail,
        duration,
        category,
        isPublished,
        updatedBy: req.user?.id,
      });

      return res.status(200).json({
        success: true,
        message: "Video tutorial updated successfully",
        data: video,
      });
    } catch (error: any) {
      ErrorService.handleError(error, res);
    }
  };

  deleteVideoTutorial = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;

      await SupportContentService.deleteVideoTutorial(id);

      return res.status(200).json({
        success: true,
        message: "Video tutorial deleted successfully",
      });
    } catch (error: any) {
      ErrorService.handleError(error, res);
    }
  };

  // Track Video Tutorial view
  trackVideoTutorialView = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      await SupportContentService.trackVideoTutorialView(id);
      return res.status(200).json({
        success: true,
        message: "Video tutorial view tracked",
      });
    } catch (error: any) {
      ErrorService.handleError(error, res);
    }
  };

}

export default new SupportContentController();

