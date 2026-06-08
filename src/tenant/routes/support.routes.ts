import { Router } from 'express';
import { Authorize } from '../../middlewares/authorize';
import TenantSupportController from '../controllers/support.controller';

class TenantSupportRouter {
  public router: Router;
  authenticateService: Authorize;

  constructor() {
    this.router = Router();
    this.authenticateService = new Authorize();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.use(this.authenticateService.requireTenantContext());
    this.router.post('/', TenantSupportController.createTicket);
    this.router.get('/', TenantSupportController.getMyTickets);
    this.router.get('/:ticketId', TenantSupportController.getTicket);
    this.router.post('/:ticketId/messages', TenantSupportController.addMessage);
  }
}

export default new TenantSupportRouter().router;
