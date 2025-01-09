import fs from 'fs';
import path from 'path';
import { Response } from "express"
import errorService from "../../services/error.service"
import { CustomRequest } from "../../utils/types"
import TenantService from "../../tenant/services/tenants.services"
import { parseCSV, parseDateField } from '../../utils/filereader';
import UserServices from '../../services/user.services';
import { userRoles } from '@prisma/client';
import { LandlordService } from '../services/landlord.service';
import { tenantSchema } from '../validations/schema/tenancy.schema';


class TenantControls {
    private landlordService: LandlordService;

    constructor() {
        this.landlordService = new LandlordService();
    }

    getTenancies = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            const tenants = await TenantService.getAllTenants(landlordId);
            res.status(200).json({ tenants });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    getCurrentTenant = async (req: CustomRequest, res: Response) => {
        const landlordId = req.user?.landlords?.id;
        if (!landlordId) {
            return res.status(404).json({ error: 'kindly login as landlord' });
        }
        const currentTenants = await TenantService.getCurrenntTenantsForLandlord(landlordId);
        return res.status(200).json({ currentTenants });
    }
    getPreviousTenant = async (req: CustomRequest, res: Response) => {
        const landlordId = req.user?.landlords?.id;
        if (!landlordId) {
            return res.status(404).json({ error: 'kindly login as landlord' });
        }
        const previousTenants = await TenantService.getPreviousTenantsForLandlord(landlordId);
        return res.status(200).json({ previousTenants });
    }
    getApplicationCurrentLandlord = async (req: CustomRequest, res: Response) => {
        const landlordId = req.user?.landlords?.id;
        if (!landlordId) {
            return res.status(404).json({ error: 'kindly login as landlord' });
        }
        const previousTenants = await TenantService.getPreviousTenantsForLandlord(landlordId);
        return res.status(200).json({ previousTenants });
    }
    bulkTenantUpload = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) {
                return res.status(404).json({ error: 'kindly login as landlord' });
            }
            if (!req.file) return res.status(400).json({ error: 'No csv file uploaded.' });

            // const filePath = path.join(__dirname, '../..', req.file.path);
            // const fileContent = fs.readFileSync(filePath, 'utf-8');
            const filePath = req.file.path;
            // Read and process the CSV file
            const dataFetched = await parseCSV(filePath);
            let uploaded = []
            interface UploadError {
                email: string;
                errors: string | string[];
                
            }

            let uploadErrors: UploadError[] = [];

            // get the current landlord email domain
            const landlord = await this.landlordService.getLandlordById(landlordId);
            if (!landlord) return res.status(403).json({ message: "login as a landlord" })

            // console.log(dataFetched)
            for (const row of dataFetched) {
                try {
                    row.dateOfFirstRent = parseDateField(row.dateOfFirstRent);
                    row.leaseStartDate = parseDateField(row.leaseStartDate);
                    row.leaseEndDate = parseDateField(row.leaseEndDate);
                    row.dateOfBirth = parseDateField(row.dateOfBirth);

                    // Ensure `email` is a string
                    if (Array.isArray(row.email)) {
                        row.email = row.email[0]; // Use the first email in the array
                    }
    
                
                    // Validate the row using joi validations
                    const { error } = tenantSchema.validate(row, { abortEarly: false });
                    if (error) {
                        uploadErrors.push({
                            email: row.email,
                            errors: error.details.map(detail => detail.message),
                        });
                        continue;
                    }

                    // Check if the user already exists
                    const existingUser = await UserServices.findUserByEmail(row.email.toString());
                    if (existingUser) {
                        uploadErrors.push({
                            email: row.email,
                            errors: 'User already exists',
                        });
                        continue;
                    }

                    // Process email
                    const userEmail = row.email.toString().split('@')[0];
                    const tenantEmail = `${userEmail}${landlord.emailDomains}`;

                    // Create the new user
                    const newUser = await UserServices.createUser({
                        ...row,
                        landlordId,
                        role: userRoles.TENANT,
                        tenantWebUserEmail: tenantEmail,
                    }, true);

                    uploaded.push(newUser);
                } catch (err) {
                    // Log unexpected errors
                    uploadErrors.push({
                        email: row.email.toString(),
                        errors: `Unexpected error: ${err.message}`,
                    });
                }
            }
            // Delete the file after processing if needed
            fs.unlinkSync(filePath);
            // After processing the dataFetched array and populating the uploaded array

            if (uploaded.length > 0) {
                // Users were successfully uploaded
                return res.status(200).json({ uploaded, uploadErrors});
            } else {
                // No users were uploaded
                return res.status(400).json({ error: 'No users were uploaded.', uploadErrors});
            }

        } catch (error) {
            console.log(error)
            return res.status(500).json({ error: error.message });
        }
    }
}


export default new TenantControls()