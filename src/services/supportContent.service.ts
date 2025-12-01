import { prismaClient } from "..";
import { Prisma } from "@prisma/client";
import openRouterService from './openrouter.service';

export class SupportContentService {
  // ============ FAQ Methods ============
  static async createFAQ(data: {
    question: string;
    answer: string;
    category: string;
    order?: number;
    isPublished?: boolean;
    systemId?: string;
    createdBy?: string;
  }) {
    return await prismaClient.fAQ.create({
      data: {
        question: data.question,
        answer: data.answer,
        category: data.category,
        order: data.order ?? 0,
        isPublished: data.isPublished ?? true,
        systemId: data.systemId,
        createdBy: data.createdBy,
      },
    });
  }

  static async getFAQs(filters?: {
    category?: string;
    isPublished?: boolean;
    search?: string;
    systemId?: string;
  }) {
    try {
      const where: Prisma.FAQWhereInput = {};

      if (filters?.category) {
        where.category = filters.category;
      }

      if (filters?.isPublished !== undefined) {
        where.isPublished = filters.isPublished;
      }

      if (filters?.systemId) {
        where.systemId = filters.systemId;
      }

      if (filters?.search) {
        where.OR = [
          { question: { contains: filters.search, mode: "insensitive" } },
          { answer: { contains: filters.search, mode: "insensitive" } },
        ];
      }

      return await prismaClient.fAQ.findMany({
        where,
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        include: {
          creator: {
            select: {
              id: true,
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
          updater: {
            select: {
              id: true,
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
      });
    } catch (error: any) {
      console.error("Error in getFAQs service:", error);
      // If table doesn't exist, return empty array instead of throwing
      if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
        console.warn("FAQ table does not exist yet. Please run Prisma migrations.");
        return [];
      }
      throw error;
    }
  }

  static async getFAQById(id: string) {
    const faq = await prismaClient.fAQ.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
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
        updater: {
          select: {
            id: true,
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
    });

    if (faq) {
      // Increment views
      await prismaClient.fAQ.update({
        where: { id },
        data: { views: { increment: 1 } },
      });
    }

    return faq;
  }

  static async updateFAQ(
    id: string,
    data: {
      question?: string;
      answer?: string;
      category?: string;
      order?: number;
      isPublished?: boolean;
      updatedBy?: string;
    }
  ) {
    return await prismaClient.fAQ.update({
      where: { id },
      data: {
        ...data,
        updatedBy: data.updatedBy,
      },
    });
  }

  static async deleteFAQ(id: string) {
    return await prismaClient.fAQ.delete({
      where: { id },
    });
  }

  // ============ Help Article Methods ============
  static async createHelpArticle(data: {
    title: string;
    description: string;
    content: string;
    category: string;
    readTime: string;
    thumbnail?: string;
    isPublished?: boolean;
    createdBy?: string;
  }) {
    return await prismaClient.helpArticle.create({
      data: {
        title: data.title,
        description: data.description,
        content: data.content,
        category: data.category,
        readTime: data.readTime,
        thumbnail: data.thumbnail,
        isPublished: data.isPublished ?? true,
        createdBy: data.createdBy,
      },
    });
  }

  static async getHelpArticles(filters?: {
    category?: string;
    isPublished?: boolean;
    search?: string;
    systemId?: string;
  }) {
    try {
      const where: Prisma.HelpArticleWhereInput = {};

      if (filters?.category) {
        where.category = filters.category;
      }

      if (filters?.isPublished !== undefined) {
        where.isPublished = filters.isPublished;
      }

      if (filters?.systemId) {
        where.systemId = filters.systemId;
      }

      if (filters?.search) {
        where.OR = [
          { title: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } },
          { content: { contains: filters.search, mode: "insensitive" } },
        ];
      }

      return await prismaClient.helpArticle.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          creator: {
            select: {
              id: true,
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
          updater: {
            select: {
              id: true,
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
      });
    } catch (error: any) {
      console.error("Error in getHelpArticles service:", error);
      // If table doesn't exist, return empty array instead of throwing
      if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
        console.warn("HelpArticle table does not exist yet. Please run Prisma migrations.");
        return [];
      }
      throw error;
    }
  }

  static async getHelpArticleById(id: string) {
    const article = await prismaClient.helpArticle.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
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
        updater: {
          select: {
            id: true,
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
    });

    if (article) {
      // Increment views
      await prismaClient.helpArticle.update({
        where: { id },
        data: { views: { increment: 1 } },
      });
    }

    return article;
  }

  // Track view for FAQ (without fetching full content)
  static async trackFAQView(id: string) {
    await prismaClient.fAQ.update({
      where: { id },
      data: { views: { increment: 1 } },
    });
    return { success: true };
  }

  // Track view for Help Article (without fetching full content)
  static async trackHelpArticleView(id: string) {
    await prismaClient.helpArticle.update({
      where: { id },
      data: { views: { increment: 1 } },
    });
    return { success: true };
  }

  // Track view for Video Tutorial (without fetching full content)
  static async trackVideoTutorialView(id: string) {
    await prismaClient.videoTutorial.update({
      where: { id },
      data: { views: { increment: 1 } },
    });
    return { success: true };
  }

  static async updateHelpArticle(
    id: string,
    data: {
      title?: string;
      description?: string;
      content?: string;
      category?: string;
      readTime?: string;
      thumbnail?: string;
      isPublished?: boolean;
      updatedBy?: string;
    }
  ) {
    return await prismaClient.helpArticle.update({
      where: { id },
      data: {
        ...data,
        updatedBy: data.updatedBy,
      },
    });
  }

  static async deleteHelpArticle(id: string) {
    return await prismaClient.helpArticle.delete({
      where: { id },
    });
  }

  // ============ Video Tutorial Methods ============
  static async createVideoTutorial(data: {
    title: string;
    description: string;
    videoUrl: string;
    thumbnail: string;
    duration: string;
    category: string;
    isPublished?: boolean;
    systemId?: string;
    createdBy?: string;
  }) {
    return await prismaClient.videoTutorial.create({
      data: {
        title: data.title,
        description: data.description,
        videoUrl: data.videoUrl,
        thumbnail: data.thumbnail,
        duration: data.duration,
        category: data.category,
        isPublished: data.isPublished ?? true,
        systemId: data.systemId,
        createdBy: data.createdBy,
      },
    });
  }

  static async getVideoTutorials(filters?: {
    category?: string;
    isPublished?: boolean;
    search?: string;
    systemId?: string;
  }) {
    try {
      const where: Prisma.VideoTutorialWhereInput = {};

      if (filters?.category) {
        where.category = filters.category;
      }

      if (filters?.isPublished !== undefined) {
        where.isPublished = filters.isPublished;
      }

      if (filters?.systemId) {
        where.systemId = filters.systemId;
      }

      if (filters?.search) {
        where.OR = [
          { title: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } },
        ];
      }

      return await prismaClient.videoTutorial.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          creator: {
            select: {
              id: true,
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
          updater: {
            select: {
              id: true,
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
      });
    } catch (error: any) {
      console.error("Error in getVideoTutorials service:", error);
      // If table doesn't exist, return empty array instead of throwing
      if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
        console.warn("VideoTutorial table does not exist yet. Please run Prisma migrations.");
        return [];
      }
      throw error;
    }
  }

  static async getVideoTutorialById(id: string) {
    const video = await prismaClient.videoTutorial.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
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
        updater: {
          select: {
            id: true,
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
    });

    if (video) {
      // Increment views
      await prismaClient.videoTutorial.update({
        where: { id },
        data: { views: { increment: 1 } },
      });
    }

    return video;
  }

  static async updateVideoTutorial(
    id: string,
    data: {
      title?: string;
      description?: string;
      videoUrl?: string;
      thumbnail?: string;
      duration?: string;
      category?: string;
      isPublished?: boolean;
      updatedBy?: string;
    }
  ) {
    return await prismaClient.videoTutorial.update({
      where: { id },
      data: {
        ...data,
        updatedBy: data.updatedBy,
      },
    });
  }

  static async deleteVideoTutorial(id: string) {
    return await prismaClient.videoTutorial.delete({
      where: { id },
    });
  }

  // ==================== AI-POWERED FEATURES ====================

  /**
   * Generate video summary and metadata with AI
   */
  static async generateVideoSummaryWithAI(videoId: string) {
    try {
      const video = await prismaClient.videoTutorial.findUnique({
        where: { id: videoId },
      });

      if (!video) {
        throw new Error('Video tutorial not found');
      }

      const summary = await openRouterService.generateVideoSummary({
        videoTitle: video.title,
        videoDescription: video.description,
        duration: video.duration,
      });

      // Update video with AI-generated summary
      await prismaClient.videoTutorial.update({
        where: { id: videoId },
        data: {
          description: summary.summary,
        },
      });

      return summary;
    } catch (error) {
      console.error('Error generating video summary with AI:', error);
      throw new Error('Failed to generate video summary with AI');
    }
  }

  /**
   * Generate help article with AI
   */
  static async generateHelpArticleWithAI(params: {
    topic: string;
    targetAudience?: string;
    category: string;
    createdBy?: string;
  }) {
    try {
      const article = await openRouterService.generateHelpArticle({
        topic: params.topic,
        targetAudience: params.targetAudience || 'property managers',
      });

      // Create help article in database
      return await this.createHelpArticle({
        title: article.title,
        description: article.summary,
        content: article.content,
        category: params.category,
        readTime: '5 min read',
        isPublished: true,
        createdBy: params.createdBy,
      });
    } catch (error) {
      console.error('Error generating help article with AI:', error);
      throw new Error('Failed to generate help article with AI');
    }
  }

  /**
   * Generate FAQs from support tickets with AI
   */
  static async generateFAQsFromTickets(params: {
    category: string;
    createdBy?: string;
  }) {
    try {
      // Fetch recent resolved tickets
      const tickets = await prismaClient.supportTicket.findMany({
        where: {
          status: 'RESOLVED',
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        include: {
          messages: true,
        },
      });

      const ticketData = tickets.map(t => ({
        subject: t.subject,
        description: t.description,
        resolution: t.messages[0]?.content || 'Resolved',
      }));

      const faqs = await openRouterService.generateFAQFromTickets(ticketData);

      // Create FAQs in database
      const createdFAQs = [];
      for (const faq of faqs) {
        const created = await this.createFAQ({
          question: faq.question,
          answer: faq.answer,
          category: faq.category,
          isPublished: true,
          createdBy: params.createdBy,
        });
        createdFAQs.push(created);
      }

      return createdFAQs;
    } catch (error) {
      console.error('Error generating FAQs from tickets with AI:', error);
      throw new Error('Failed to generate FAQs from tickets with AI');
    }
  }

  /**
   * Enhance help article content with AI
   */
  static async enhanceHelpArticleWithAI(
    articleId: string,
    enhancementType: 'grammar' | 'tone' | 'expand' | 'summarize',
    updatedBy?: string
  ) {
    try {
      const article = await this.getHelpArticleById(articleId);
      if (!article) {
        throw new Error('Help article not found');
      }

      const enhancedContent = await openRouterService.enhanceContent({
        content: article.content,
        enhancementType: enhancementType,
      });

      return await this.updateHelpArticle(articleId, {
        content: enhancedContent,
        updatedBy: updatedBy,
      });
    } catch (error) {
      console.error('Error enhancing help article with AI:', error);
      throw new Error('Failed to enhance help article with AI');
    }
  }

  /**
   * Enhance FAQ answer with AI
   */
  static async enhanceFAQWithAI(
    faqId: string,
    enhancementType: 'grammar' | 'tone' | 'expand' | 'summarize',
    updatedBy?: string
  ) {
    try {
      const faq = await this.getFAQById(faqId);
      if (!faq) {
        throw new Error('FAQ not found');
      }

      const enhancedAnswer = await openRouterService.enhanceContent({
        content: faq.answer,
        enhancementType: enhancementType,
      });

      return await this.updateFAQ(faqId, {
        answer: enhancedAnswer,
        updatedBy: updatedBy,
      });
    } catch (error) {
      console.error('Error enhancing FAQ with AI:', error);
      throw new Error('Failed to enhance FAQ with AI');
    }
  }
}

