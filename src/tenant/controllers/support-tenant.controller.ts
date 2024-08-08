import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import errorService from "../../services/error.service";
import SupportSchema from "../schema/supportSchema";
import supportTenantServices from "../services/support-tenant.services";

class SupportTenantController {
    async createsupportTenantTicket(req: CustomRequest, res: Response) {
        const tenantId = req.user.id;

        try {
            const { error, value } = SupportSchema.create().validate(req.body)
            if (error) {
                return res.status(400).json({ message: error.details[0].message })
            }
            const data = { ...value }
            const attachment = req.body.cloudinaryUrls
            delete data['cloudinaryUrls']

            const ticket = await supportTenantServices.createSupportTenantTicket({ ...data, attachment }, tenantId);
            res.status(201).json(ticket);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async getSupportTenantTickets(req: CustomRequest, res: Response) {
        const tenantId = req.user.id;
        try {
            const { ticketId } = req.params;
            const tickets = await supportTenantServices.getSupportTenantTicket(ticketId, tenantId);
            res.status(200).json(tickets);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }
}

export default new SupportTenantController();