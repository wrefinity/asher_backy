import { Request, Response } from "express"
import errorService from "../services/error.service"
import { CustomRequest } from "../utils/types"
import { CommentService } from "../services/community.post.comment"
import { createCommentSchema, toggleCommentLikeSchema} from "../validations/schemas/community"


class CommunityPostCommentController {
    constructor() { }

    create = async (req: CustomRequest, res: Response) => {
        
        try {
            const { error, value } = createCommentSchema.validate(req.body);
            if (error) return res.status(400).json({ message: error.details[0].message });
    
            const userId = req.user.id;
            const comment = await CommentService.create({ ...value, authorId: userId });
            res.status(201).json({ message: 'Comment created', data: comment });
            
        } catch (error) { 
            errorService.handleError(error, res)
        }
    }

    getByPost = async (req: Request, res: Response) => {
        const { postId } = req.params;
        const comments = await CommentService.getByPost(postId);
        res.json({ data: comments });
    }

    getById = async (req: CustomRequest, res: Response) => {
        try {
            const { commentId } = req.params;
            const comment = await CommentService.getById(commentId);
            if (!comment) return res.status(404).json({ message: 'Comment not found' });
            res.json({ data: comment });

        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    toggleCommentLike = async (req: CustomRequest, res: Response) => {
        try {
            const { error, value } = toggleCommentLikeSchema.validate(req.body);
            if (error) return res.status(400).json({ message: error.details[0].message });

            const result = await CommentService.toggleCommentLike(value, req.user?.id);
            return res.json(result);

        } catch (error) {
            errorService.handleError(error, res)
        }
     
    }

    delete = async (req: CustomRequest, res: Response) => {
        try {
            const { commentId } = req.params;
            await CommentService.delete(commentId);
            res.json({ message: 'Comment deleted' });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
}

export default new CommunityPostCommentController()