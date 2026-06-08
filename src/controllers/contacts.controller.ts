import { Response } from "express";
import { CustomRequest } from "../utils/types";
import MessagingCircleService from "../services/messagingCircle.service";
import ErrorService from "../services/error.service";

class ContactsController {
  getContacts = async (req: CustomRequest, res: Response) => {
    try {
      const search = typeof req.query.search === "string" ? req.query.search : "";
      const contacts = await MessagingCircleService.getContacts(req.user.id, search);
      return res.status(200).json({ data: contacts });
    } catch (error) {
      ErrorService.handleError(error, res);
    }
  };
}

export default new ContactsController();
