import express from 'express';
import InspectionController from '../controllers/inspection.controller';

class InspectionRoutes {
  private router: express.Router;

  constructor() {
    this.router = express.Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.post('/',InspectionController.createInspection.bind(InspectionController));
    this.router.get('/', InspectionController.getInspections.bind(InspectionController));
    this.router.put('/:id', InspectionController.updateInspection.bind(InspectionController));
    this.router.delete('/:id', InspectionController.deleteInspection.bind(InspectionController));
  }

  public getRouter() {
    return this.router;
  }
}

export default new InspectionRoutes().getRouter()