import { Router } from 'express';
import { userRoles } from '@prisma/client';
import { Authorize } from '../../middlewares/authorize';
import tenantInspectionController from '../controllers/inspection.controller';

class TenantInspectionRouter {
  public router: Router;
  authenticateService: Authorize;

  constructor() {
    this.router = Router();
    this.authenticateService = new Authorize();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Apply authentication and tenant role check to all routes
    this.router.use(this.authenticateService.authorize);
    this.router.use(this.authenticateService.authorizeRole(userRoles.TENANT));

    // Specific routes first (before param routes)
    this.router.get('/tenant/stats', tenantInspectionController.getTenantInspectionStats);
    this.router.get('/tenant', tenantInspectionController.getTenantInspections);
    
    // Param routes (must come after specific routes)
    this.router.get('/:id/certificate', tenantInspectionController.getInspectionCertificate);
    this.router.post('/:id/acknowledge', tenantInspectionController.acknowledgeInspection);
    this.router.get('/:id', tenantInspectionController.getInspectionById);
  }
}

export default new TenantInspectionRouter().router;
