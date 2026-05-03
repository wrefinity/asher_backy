import { Router } from 'express';
import { Authorize } from '../middlewares/authorize';
import propertyDocument from '../controllers/propertyDocument.controller';
import upload from '../configs/multer';
import { uploadToCloudinary } from '../middlewares/multerCloudinary';

class PropertyDocsRouter {
  public router: Router;
  authenticateService: Authorize;

  constructor() {
    this.router = Router();
    this.authenticateService = new Authorize();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post(
      '/uploads',
      this.authenticateService.authorize,
      upload.array('files'),
      uploadToCloudinary,
      propertyDocument.create
    );

    this.router.get('/props/:propertyId', propertyDocument.findAll);

    this.router.post(
      '/empty-trash',
      this.authenticateService.authorize,
      propertyDocument.emptyTrash
    );

    // Specific routes before generic /:id
    this.router.post(
      '/:id/restore',
      this.authenticateService.authorize,
      propertyDocument.restore
    );
    this.router.put(
      '/:id/favorite',
      this.authenticateService.authorize,
      propertyDocument.setFavorite
    );
    this.router.delete(
      '/:id/permanent',
      this.authenticateService.authorize,
      propertyDocument.permanentDelete
    );

    this.router.get('/:id', propertyDocument.findById);
    this.router.put('/:id', propertyDocument.update);
    this.router.delete(
      '/:id',
      this.authenticateService.authorize,
      propertyDocument.delete
    );
  }
}

export default new PropertyDocsRouter().router;
