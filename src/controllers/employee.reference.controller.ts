import { Request, Response } from 'express';
import EmployeeReferenceService from '../services/employmentinfo.services';
import { employeeReferenceSchema } from '../validations/schemas/reference.schema';
import applicantService from '../webuser/services/applicantService';
import ErrorService from '../services/error.service';


class EmployeeReferenceController {

    async createEmployeeReference(req: Request, res: Response) {
        try {
            const applicationId = req.params.id;

            // Validate application ID
            if (!applicationId) {
                return res.status(400).json({
                    error: "Application ID is required",
                    details: ["Missing application ID in URL parameters"]
                });
            }

            // Verify application exists
            const application = await applicantService.getApplicationById(applicationId);
            if (!application) {
                return res.status(404).json({
                    error: "Application not found",
                    details: [`Application with ID ${applicationId} does not exist`]
                });
            }
            const { error, value } = employeeReferenceSchema.validate(req.body);
            if (error) return res.status(400).json({ error: error.details[0].message });

            const result = await EmployeeReferenceService.createEmployeeReference(value, applicationId);
            res.status(201).json(result);
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    }

    async updateEmployeeReference(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { error, value } = employeeReferenceSchema.validate(req.body);
            if (error) return res.status(400).json({ error: error.details[0].message });

            const result = await EmployeeReferenceService.updateEmployeeReference(id, value);
            res.status(200).json(result);
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    }

    async getEmployeeReferenceById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const result = await EmployeeReferenceService.getEmployeeReferenceById(id);
            if (!result) return res.status(404).json({ error: 'Employee reference not found' });
            res.status(200).json(result);
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    }

    async getAllEmployeeReferences(req: Request, res: Response) {
        try {
            const result = await EmployeeReferenceService.getAllEmployeeReferences();
            res.status(200).json(result);
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    }
}

export default new EmployeeReferenceController();