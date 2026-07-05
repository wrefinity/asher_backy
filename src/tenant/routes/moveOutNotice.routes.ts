import { Router } from 'express';
import { Authorize } from '../../middlewares/authorize';
import { validateBody } from '../../middlewares/validation';
import Joi from 'joi';
import moveOutNoticeController from '../controllers/moveOutNotice.controller';

class MoveOutNoticeRouter {
  public router: Router;
  private authenticateService: Authorize;

  constructor() {
    this.router = Router();
    this.authenticateService = new Authorize();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.use(this.authenticateService.authorize);

    const createSchema = Joi.object({
      intendedMoveOutDate: Joi.date().iso().required(),
      reason: Joi.string().trim().min(1).required(),
      comments: Joi.string().allow('').optional(),
      type: Joi.string().valid('RELOCATING', 'LEAVING').required(),
      searchCriteria: Joi.object().optional(),
    });

    this.router.post('/', validateBody(createSchema), moveOutNoticeController.create);
    this.router.get('/', moveOutNoticeController.getCurrent);
  }
}

export default new MoveOutNoticeRouter().router;
