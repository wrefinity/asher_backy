import { prismaClient } from "..";
import { Suggestion } from '@prisma/client';

export interface CreateSuggestionData {
  subject: string;
  description?: string;
  createdById: string;
}

export interface UpdateSuggestionData {
  subject?: string;
  description?: string;
  isDeleted?: boolean;
}

export class SuggestionService {
  async createSuggestion(data: CreateSuggestionData): Promise<Suggestion> {
    try {
      return await prismaClient.suggestion.create({
        data: {
          subject: data.subject,
          description: data.description,
          createdById: data.createdById,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  fullname: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      throw new Error(`Failed to create suggestion: ${error.message}`);
    }
  }

  async getSuggestions(userId?: string, page: number = 1, limit: number = 10): Promise<{ suggestions: Suggestion[], total: number }> {
    try {
      const skip = (page - 1) * limit;
      const whereClause = userId ? { createdById: userId, isDeleted: false } : { isDeleted: false };
      
      const [suggestions, total] = await Promise.all([
        prismaClient.suggestion.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    fullname: true,
                  },
                },
              },
            },
          },
        }),
        prismaClient.suggestion.count({ where: whereClause }),
      ]);

      return { suggestions, total };
    } catch (error) {
      throw new Error(`Failed to fetch suggestions: ${error.message}`);
    }
  }

  async getSuggestionById(id: string): Promise<Suggestion | null> {
    try {
      return await prismaClient.suggestion.findUnique({
        where: { id, isDeleted: false },
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  fullname: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      throw new Error(`Failed to fetch suggestion: ${error.message}`);
    }
  }

  async updateSuggestion(id: string, data: UpdateSuggestionData, userId: string): Promise<Suggestion> {
    try {
      // Verify the suggestion belongs to the user
      const suggestion = await prismaClient.suggestion.findFirst({
        where: { id, createdById: userId, isDeleted: false },
      });

      if (!suggestion) {
        throw new Error('Suggestion not found or access denied');
      }

      return await prismaClient.suggestion.update({
        where: { id },
        data: {
          subject: data.subject,
          description: data.description,
          isDeleted: data.isDeleted,
          updatedAt: new Date(),
        },
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  fullname: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      throw new Error(`Failed to update suggestion: ${error.message}`);
    }
  }

  async deleteSuggestion(id: string, userId: string): Promise<Suggestion> {
    try {
      // Verify the suggestion belongs to the user
      const suggestion = await prismaClient.suggestion.findFirst({
        where: { id, createdById: userId, isDeleted: false },
      });

      if (!suggestion) {
        throw new Error('Suggestion not found or access denied');
      }

      return await prismaClient.suggestion.update({
        where: { id },
        data: { isDeleted: true, updatedAt: new Date() },
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  fullname: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      throw new Error(`Failed to delete suggestion: ${error.message}`);
    }
  }

  async getSuggestionStats(userId?: string): Promise<{ total: number, active: number, deleted: number }> {
    try {
      const whereClause = userId ? { createdById: userId } : {};
      
      const [total, active, deleted] = await Promise.all([
        prismaClient.suggestion.count({ where: whereClause }),
        prismaClient.suggestion.count({ where: { ...whereClause, isDeleted: false } }),
        prismaClient.suggestion.count({ where: { ...whereClause, isDeleted: true } }),
      ]);

      return { total, active, deleted };
    } catch (error) {
      throw new Error(`Failed to fetch suggestion stats: ${error.message}`);
    }
  }
}