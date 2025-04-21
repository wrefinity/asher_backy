import fs from 'fs';
import moment from 'moment';
import { Response } from "express"
import errorService from "../../services/error.service"
import { CustomRequest } from "../../utils/types"
import { getMimeTypeFromUrl } from "../../utils/helpers"
import TenantService from "../../tenant/services/tenants.services"
import { parseCSV, parseDateField } from '../../utils/filereader';
import { parseDateFieldNew } from '../../utils/helpers';
import UserServices from '../../services/user.services';
import { userRoles, DocumentType } from '@prisma/client';
import { LandlordService } from '../services/landlord.service';
import { tenantSchema } from '../validations/schema/tenancy.schema';
import { LogsSchema } from '../../validations/schemas/logs.schema';
import { ViolationSchema } from '../../validations/schemas/violations';
import LogsServices from '../../services/logs.services';
import ComplaintServices from '../../services/complaintServices';
import ViolationService from '../../services/violations';
import logsServices from '../../services/logs.services';
import { LogType } from '@prisma/client';
import property from '../../routes/property';
import { PropertyDocumentService } from '../../services/propertyDocument.service';


const normalizePhoneNumber = (phone: any): string => {
    if (!phone) return '';

    // Convert from exponential notation if necessary
    let phoneStr = typeof phone === "number" ? phone.toFixed(0) : phone.toString();

    // Remove non-digit characters
    phoneStr = phoneStr.replace(/\D/g, '');

    return phoneStr;
};


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
    getAllCurrentTenant = async (req: CustomRequest, res: Response) => {
        const landlordId = req.user?.landlords?.id;
        if (!landlordId) {
            return res.status(404).json({ error: 'kindly login as landlord' });
        }
        const currentTenants = await TenantService.getCurrentTenantsGeneric();
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
                return res.status(403).json({ error: 'Access denied. Please log in as a landlord.' });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'No CSV file uploaded. Please upload a valid file.' });
            }

            const filePath = req.file.path;

            let uploaded: any[] = [];
            interface UploadError {
                email: string;
                errors: string[];
                row?: any;
            }
            let uploadErrors: UploadError[] = [];

            // Fetch landlord details
            const landlord = await this.landlordService.getLandlordById(landlordId);
            if (!landlord) {
                return res.status(403).json({ error: "Invalid landlord. Please re-login." });
            }

            // Read CSV file safely
            let dataFetched;
            try {
                dataFetched = await parseCSV(filePath);
            } catch (err) {
                return res.status(500).json({ error: 'Error parsing CSV file.', details: err.message });
            }

            // Process each row
            for (const row of dataFetched) {
                let rowErrors: string[] = [];
                try {
                    if (!row.email) {
                        rowErrors.push("Missing email field.");
                    }

                    // Format and validate phone number
                    row.phoneNumber = normalizePhoneNumber(row.phoneNumber);

                    if (!row.phoneNumber || row.phoneNumber.length < 10) {
                        rowErrors.push(`Invalid phone number format: "${row.phoneNumber}"`);
                    }

                    // Convert date fields safely
                    const dateFields = [
                        { key: "dateOfFirstRent", label: "Date of First Rent" },
                        { key: "leaseStartDate", label: "Lease Start Date" },
                        { key: "leaseEndDate", label: "Lease End Date" },
                        { key: "dateOfBirth", label: "Date of Birth" },
                        { key: "expiryDate", label: "Expiry Date" },
                        { key: "employmentStartDate", label: "Employment Start Date" }
                    ];

                    for (const field of dateFields) {
                        try {
                            if (row[field.key]) {
                                row[field.key] = parseDateFieldNew(row[field.key]?.toString(), field.label);
                            }
                        } catch (dateError) {
                            rowErrors.push(dateError.message);
                        }
                    }

                    // Validate row data
                    const { error } = tenantSchema.validate(row, { abortEarly: false });
                    if (error) {
                        rowErrors.push(...error.details.map(detail => detail.message));
                    }

                    // Check for existing user
                    const existingUser = await UserServices.findUserByEmail(row.email.toString());
                    if (existingUser) {
                        rowErrors.push("User already exists.");
                    }

                    if (rowErrors.length > 0) {
                        let existingError = uploadErrors.find(err => err.email === row.email);
                        if (existingError) {
                            existingError.errors.push(...rowErrors);
                        } else {
                            uploadErrors.push({ email: row.email, errors: rowErrors });
                        }
                        continue; // Skip processing for this row
                    }

                    // Generate tenant email
                    const userEmail = row.email.toString().split('@')[0];
                    const tenantEmail = `${userEmail}${landlord.emailDomains}`;

                    // Create new user
                    const newUser = await UserServices.createUser({
                        ...row,
                        landlordId,
                        role: userRoles.TENANT,
                        tenantWebUserEmail: tenantEmail,
                    }, true);
                   
                  

                    uploaded.push(newUser);
                } catch (err) {
                    let existingError = uploadErrors.find(err => err.email === row.email);
                    if (existingError) {
                        existingError.errors.push(`Unexpected error: ${err.message}`);
                    } else {
                        uploadErrors.push({ email: row.email, errors: [`Unexpected error: ${err.message}`] });
                    }
                }
            }

            // Delete the CSV file
            fs.unlinkSync(filePath);

            // Return response
            if (uploaded.length > 0) {
                return res.status(200).json({ uploaded, uploadErrors });
            } else {
                return res.status(400).json({ error: 'No users were uploaded.', uploadErrors });
            }
        } catch (error) {
            return res.status(500).json({ error: 'Server error occurred.', details: error.message });
        }
    };
    // tenants milestone section
    createTenantMileStones = async (req: CustomRequest, res: Response) => {

        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) {
                return res.status(404).json({ error: 'kindly login as landlord' });
            }
            const { error, value } = await LogsSchema.validate(req.body);
            if (error) return res.status(400).json({ message: error.details[0].message });

            // LogsSchema
            const { userId, ...data } = value;

            const userExist = UserServices.getUserById(String(userId));
            if (!userExist)
                return res.status(404).json({ error: `tenant with the userId :  ${userId} doesnot exist` });
            // get the property attached to current tenant
            const tenant = await TenantService.getTenantByUserIdAndLandlordId(userId, landlordId)

            const milestones = await LogsServices.createLog({
                propertyId: tenant.propertyId,
                createdById: userId,
                ...data
            });
            return res.status(201).json({ milestones });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    getTenantMileStones = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) {
                return res.status(404).json({ error: 'kindly login as landlord' });
            }
            const tenantId = req.params.tenantId
            // const tenantUserId = req.params.tenantUserId
            // const userExist = UserServices.getUserById(String(tenantUserId));
            // if (!userExist)
            //     return res.status(404).json({ error: `tenant with the userId :  ${tenantUserId} doesnot exist` });
            // get the property attached to current tenant
            // const tenant = await TenantService.getTenantByUserIdAndLandlordId(tenantUserId, landlordId)
            const tenant = await TenantService.getTenantWithUserAndProfile(tenantId)

            if (!tenant?.propertyId)
                return res.status(404).json({ error: `tenant with the id :  ${tenantId} is not connected to a property` });

            const milestones = await LogsServices.getLandlordTenantsLogsByProperty(
                tenant.propertyId,
                tenant.userId,
                landlordId
            );
            return res.status(200).json({ milestones });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    getTenantComplaints = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) {
                return res.status(404).json({ error: 'kindly login as landlord' });
            }
            const tenantId = req.params.tenantId
            // const userExist = UserServices.getUserById(String(tenantUserId));
            // if (!userExist)
            //     return res.status(404).json({ error: `tenant with the userId :  ${tenantUserId} doesnot exist` });
            // // get the property attached to current tenant
            // const tenant = await TenantService.getTenantByUserIdAndLandlordId(tenantUserId, landlordId)
            const tenant = await TenantService.getTenantWithUserAndProfile(tenantId)
            if (!tenant?.propertyId)
                return res.status(404).json({ error: `tenant with the id :  ${tenantId} is not connected to a property` });

            const complaints = await ComplaintServices.getLandlordPropsTenantComplaints(
                tenant.userId,
                tenant?.propertyId,
                landlordId
            );
            return res.status(200).json({ complaints });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    getTenantCommunicationLogs = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) {
                return res.status(404).json({ error: 'kindly login as landlord' });
            }
            const tenantId = req.params.tenantId
            // const userExist = UserServices.getUserById(String(tenantUserId));
            // if (!userExist)
            //     return res.status(404).json({ error: `tenant with the userId :  ${tenantUserId} doesnot exist` });
            // // get the property attached to current tenant
            // const tenant = await TenantService.getTenantByUserIdAndLandlordId(tenantUserId, landlordId)
            const tenant = await TenantService.getTenantWithUserAndProfile(tenantId)
            if (!tenant?.propertyId)
                return res.status(404).json({ error: `tenant with the id :  ${tenantId} is not connected to a property` });

            const complaints = await LogsServices.getCommunicationLog(
                tenant?.propertyId,
                tenant.userId,
                landlordId
            );
            return res.status(200).json({ complaints });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    createTenantViolation = async (req, res) => {
        try {
            const { error, value } = ViolationSchema.validate(req.body);

            if (error) {
                return res.status(400).json({
                    message: error.details[0].message,
                });
            }
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) {
                return res.status(404).json({ error: 'kindly login as landlord' });
            }
            const violation = await ViolationService.create(
                {
                    ...value,
                    createdById: req.user?.id
                }
            );
            return res.status(201).json({
                message: 'Violation created successfully',
                violation // Here you can send back the created violation
            });

        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    getTenantViolations = async (req, res) => {
        try {
            const tenantId = req.params.tenantId;
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) {
                return res.status(404).json({ error: 'kindly login as landlord' });
            }
            const violation = await ViolationService.getViolationTenantId(tenantId)
            return res.status(201).json({
                violation
            });

        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    getTenant = async (req, res) => {
        try {
            const tenantId = req.params.tenantId;
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) {
                return res.status(404).json({ error: 'kindly login as landlord' });
            }
            const tenant = await TenantService.getTenantByUserIdAndLandlordId(undefined, landlordId, tenantId)
            return res.status(201).json({
                tenant
            });

        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    getterTenantsDocument = async (req: CustomRequest, res: Response) => {
        try {
            const tenantId = req.params.tenantId;
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) {
                return res.status(404).json({ error: 'kindly login as landlord' });
            }
            const tenantWithApplication = await TenantService.getTenantByUserIdAndLandlordId(undefined, landlordId, tenantId)

            if (!tenantWithApplication?.application) {
                throw new Error("Tenant application not found");
              }
              
              const application = tenantWithApplication.application;

              // Serialize agreement documents from application.agreementDocumentUrl
              const agreementDocuments = application.agreementDocumentUrl.map((url, index) => ({
                id: `agreement-${application.id}-${index}`,
                documentName: `Tenant Agreement v${application.agreementVersion - index}`,
                documentUrl: [url], // Wrap in array to match propertyDocument structure
                docType: DocumentType.AGREEMENT_DOC,
                createdAt: application.lastAgreementUpdate || application.createdAt,
                updatedAt: application.lastAgreementUpdate || application.updatedAt,
                type: getMimeTypeFromUrl(url), // Adjust based on actual file type
                size: null, // Add actual size if available
              }));
              
              // Combine with other application documents
              const allDocuments = [
                ...agreementDocuments,
                ...application.documents.map(doc => ({
                  ...doc,
                  documentUrl: doc.documentUrl,
                  docType: doc.docType,
                  createdAt: doc.createdAt,
                  updatedAt: doc.updatedAt
                }))
              ];
              // Response structure
            return res.status(201).json({
                documents: allDocuments
            }); 
        } catch (error) {
            errorService.handleError(error, res);
        }
    };
}


export default new TenantControls()