import { Router } from 'express';
import { Authorize } from '../../middlewares/authorize';
import { validateBody } from '../../middlewares/validation';
import { propertySearchSchema } from '../../validations/schemas/properties.schema';
import Joi from 'joi';
import relocationController from '../controllers/relocation.controller';

class RelocationRouter {
  public router: Router;
  private authenticateService: Authorize;

  constructor() {
    this.router = Router();
    this.authenticateService = new Authorize();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.use(this.authenticateService.authorize);

    const postInterestSchema = Joi.object({
      criteria: propertySearchSchema.required(),
      intendedMoveOutDate: Joi.date().iso().required(),
      reason: Joi.string().trim().optional(),
      comments: Joi.string().allow('').optional(),
    });

    this.router.post('/post-interest', validateBody(postInterestSchema), relocationController.postInterest);
    this.router.get('/interest', relocationController.getInterest);
    this.router.get('/eligibility', relocationController.getEligibility);
  }
}

export default new RelocationRouter().router;
