import { Router } from 'express';
import InspectionController from '../controllers/inspection.controller';
import upload from '../../configs/multer';

class InspectionRoutes {
  public router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Register routes - order matters! Specific routes before parameterized routes

    // GET /api/landlord/inspections/statistics - Get inspection statistics
    this.router.get('/statistics', InspectionController.getStatistics.bind(InspectionController));

    // GET /api/landlord/inspections - Get all inspections
    this.router.get('/all-inspections', InspectionController.getLandlordInspections.bind(InspectionController));
    this.router.get('/property-inspections/:propertyId', InspectionController.getLandlordPropertyInspection.bind(InspectionController));

    // POST /api/landlord/inspections - Create new inspection
    this.router.post('/', InspectionController.createInspection.bind(InspectionController));

    // GET /api/landlord/inspections/:id/complete - Get complete inspection with all details
    this.router.get('/:id/complete', InspectionController.getCompleteInspection.bind(InspectionController));

    // GET /api/landlord/inspections/:id - Get inspection by ID
    this.router.get('/:id', InspectionController.getInspectionById.bind(InspectionController));

    // PUT /api/landlord/inspections/:id - Update inspection
    this.router.put('/:id', InspectionController.updateInspection.bind(InspectionController));

    // DELETE /api/landlord/inspections/:id - Delete inspection
    this.router.delete('/:id', InspectionController.deleteInspection.bind(InspectionController));

    // POST /api/landlord/inspections/:id/sections - Save inspection sections and items
    this.router.post('/:id/sections', InspectionController.saveSections.bind(InspectionController));

    // POST /api/landlord/inspections/:id/upload-photo - Upload photo for inspection
    this.router.post('/:id/upload-photo', upload.single('photo'), InspectionController.uploadPhoto.bind(InspectionController));

    // POST /api/landlord/inspections/:id/generate-certificate - Generate PDF certificate
    this.router.post('/:id/generate-certificate', InspectionController.generateCertificate.bind(InspectionController));

    // POST /api/landlord/inspections/:id/share - Share inspection with tenant
    this.router.post('/:id/share', InspectionController.shareWithTenant.bind(InspectionController));
  }
}

export default new InspectionRoutes().router;