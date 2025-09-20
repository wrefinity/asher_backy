import { Response } from 'express';
import { SuggestionService, CreateSuggestionData, UpdateSuggestionData } from '../services/suggestion.service';
import { CustomRequest } from '../utils/types';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

class SuggestionController {
    private suggestionService: SuggestionService;

    constructor() {
        this.suggestionService = new SuggestionService();
    }

    createSuggestion = asyncHandler(async (req: CustomRequest, res: Response) => {
        const { subject, description } = req.body;
        const userId = req.user.id;

        if (!subject || !description) {
            throw ApiError.validationError('Subject and description are required');
        }

        const suggestionData: CreateSuggestionData = {
            subject,
            description,
            createdById: userId,
        };

        const suggestion = await this.suggestionService.createSuggestion(suggestionData);
        if (!suggestion) {
            throw ApiError.internal('Failed to create suggestion');
        }
        return res
            .status(201)
            .json(ApiResponse.created(suggestion, "suggestion created successfully"));
    });

    getSuggestions = asyncHandler(async (req: CustomRequest, res: Response) => {
        const userId = req.query.userId as string || undefined;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const result = await this.suggestionService.getSuggestions(userId, page, limit);

        return res.status(200).json(
            ApiResponse.paginated(
                result.suggestions,
                {
                    page,
                    limit,
                    total: result.total,
                    pages: Math.ceil(result.total / limit),
                }
            ))
    });

    getSuggestionById = asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const suggestion = await this.suggestionService.getSuggestionById(id);

        if (!suggestion) {
            throw ApiError.notFound('Suggestion not found');
        }
        return res.status(200).json(ApiResponse.success(suggestion));
    });

    updateSuggestion = asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const { subject, description, isDeleted } = req.body;
        const userId = req.user.id;

        const updateData: UpdateSuggestionData = {
            subject,
            description,
            isDeleted,
        };

        const suggestion = await this.suggestionService.updateSuggestion(id, updateData, userId);

        if (!suggestion) {
            return res
                .status(404)
                .json(ApiError.notFound('Suggestion not found'));
        }
        return res
            .status(200)
            .json(ApiResponse.success(suggestion, 'Suggestion updated successfully'));
    });

    deleteSuggestion = asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const userId = req.user.id;

        const suggestion = await this.suggestionService.deleteSuggestion(id, userId);
        if (!suggestion) {
            return res
                .status(404)
                .json(ApiError.notFound('Suggestion not found'));
        }
        return res
            .status(200)
            .json(ApiResponse.success(suggestion, 'Suggestion deleted successfully'));
    });

    getSuggestionStats = asyncHandler(async (req: CustomRequest, res: Response) => {
        const userId = req.query.userId as string || undefined;
        const stats = await this.suggestionService.getSuggestionStats(userId);
        return res.status(200).json(ApiResponse.success(stats));
    });
}

export default new SuggestionController();