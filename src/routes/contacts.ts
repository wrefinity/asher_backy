import { Router } from "express";
import { Authorize } from "../middlewares/authorize";
import ContactsController from "../controllers/contacts.controller";
import { requireMessagingAccess } from "../middlewares/requireMessagingAccess";

class ContactsRouter {
  public router: Router;
  authenticateService: Authorize;

  constructor() {
    this.router = Router();
    this.authenticateService = new Authorize();
    this.router.use(
      this.authenticateService.authorize,
      requireMessagingAccess()
    );
    this.router.get("/", ContactsController.getContacts);
  }
}

export default new ContactsRouter().router;
