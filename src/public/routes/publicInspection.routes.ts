import { Router } from 'express';
import PublicInspectionController from '../controllers/publicInspection.controller';
import upload from '../../configs/multer';

class PublicInspectionRoutes {
  public router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Portal (multi-inspection)
    this.router.get('/portal/:token', PublicInspectionController.getPortal);
    this.router.get(
      '/portal/:token/jobs/:inspectionId',
      PublicInspectionController.getInspection
    );
    this.router.put(
      '/portal/:token/jobs/:inspectionId/sections',
      PublicInspectionController.saveSections
    );
    this.router.post(
      '/portal/:token/jobs/:inspectionId/photos',
      upload.single('photo'),
      PublicInspectionController.uploadPhoto
    );
    this.router.post(
      '/portal/:token/jobs/:inspectionId/submit',
      PublicInspectionController.submit
    );

    // Legacy single-token endpoints (still work via portal resolution)
    this.router.get('/:token', PublicInspectionController.getByToken);
    this.router.put('/:token/sections', PublicInspectionController.saveSections);
    this.router.post(
      '/:token/photos',
      upload.single('photo'),
      PublicInspectionController.uploadPhoto
    );
    this.router.post('/:token/submit', PublicInspectionController.submit);
  }
}

export default new PublicInspectionRoutes().router;
