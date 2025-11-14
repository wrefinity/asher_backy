import { Response } from "express"
import errorService from "../../services/error.service"
import { CustomRequest } from "../../utils/types"
import TenantService from "../../tenant/services/tenants.services"
import UserServices from '../../services/user.services';
import { EnquireStatus, userRoles, YesNo } from '@prisma/client';
import { LandlordService } from '../services/landlord.service';
import { tenantArraySchema } from '../validations/schema/tenancy.schema';
import { LogsSchema } from '../../validations/schemas/logs.schema';
import { ViolationSchema } from '../../validations/schemas/violations';
import LogsServices from '../../services/logs.services';
import ComplaintServices from '../../services/complaintServices';
import ViolationService from '../../services/violations';
import PerformanceCalculator from '../../services/PerformanceCalculator';
import applicantService from "../../webuser/services/applicantService";
import { sendApplicationCompletionEmails } from "../../utils/emailer";


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
    // getCurrentTenant = async (req: CustomRequest, res: Response) => {
    //     const landlordId = req.user?.landlords?.id;
    //     if (!landlordId) {
    //         return res.status(404).json({ error: 'kindly login as landlord' });
    //     }
    //     const currentTenants = await TenantService.getCurrenntTenantsForLandlord(landlordId);
    //     return res.status(200).json({ currentTenants });
    // }
    getCurrentTenant = async (req: CustomRequest, res: Response) => {
        const landlordId = req.user?.landlords?.id;
        if (!landlordId) {
            return res.status(404).json({ error: 'kindly login as landlord' });
        }
        const currentTenants = await TenantService.getTenantsWithEnquiries(landlordId, EnquireStatus.EXISTING_TENANT);
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
    createApplicationFromLast = async (req: CustomRequest, res: Response) => {
        const userId = req.params.userId;
        const inviteId = req.params.inviteId;
        const { applicationFee } = req.body;
        
        if (!applicationFee) {
            return res.status(400).json({
                error: `applicationFee is required in the request body as one of: ${Object.values(YesNo).join(', ')}`
            });
        }
        const landlordId = req.user?.landlords?.id;
        if (!landlordId) {
            return res.status(404).json({ error: 'kindly login as landlord' });
        }

        const user = await UserServices.getUserById(userId);

        if (!user) {
            return res.status(404).json({ error: `User with ID ${userId} not found.` });
        }

        const application = await applicantService.createApplicationFromLast(userId, inviteId, applicationFee);
        if (!application) {
            return res.status(400).json({ error: 'Failed to create application.' });
        }
        await sendApplicationCompletionEmails(application);
        return res.status(200).json({ application });
    }

    bulkTenantUpload = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) {
                return res.status(403).json({ error: 'Access denied. Please log in as a landlord.' });
            }

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

            let rowErrors: string[] = [];
            // Validate row data
            const { error, value } = tenantArraySchema.validate(req.body, { abortEarly: false });
            if (error) {
                rowErrors.push(...error.details.map(detail => detail.message));
            }

            // Process each row
            for (const row of value) {
                try {
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
                        continue;
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

    getTenantPerformance = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) {
                return res.status(404).json({ error: 'kindly login as landlord' });
            }
            const tenantId = req.params.tenantId;
            const tenant = await TenantService.getTenantWithUserAndProfile(tenantId)

            if (!tenant?.propertyId)
                return res.status(404).json({ error: `tenant with the id :  ${tenantId} is not connected to a property` });

            const performance = await PerformanceCalculator.calculateOverallScore(
                tenant?.userId
            );
            return res.status(200).json({ performance });
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
            //   const agreementDocuments = application.agreementDocumentUrl.map((url, index) => ({
            //     id: `agreement-${application.id}-${index}`,
            //     documentName: `Tenant Agreement v${application.agreementVersion - index}`,
            //     documentUrl: [url], // Wrap in array to match propertyDocument structure
            //     docType: DocumentType.AGREEMENT_DOC,
            //     createdAt: application.lastAgreementUpdate || application.createdAt,
            //     updatedAt: application.lastAgreementUpdate || application.updatedAt,
            //     type: getMimeTypeFromUrl(url), // Adjust based on actual file type
            //     size: null, // Add actual size if available
            //   }));

            // Combine with other application documents
            const allDocuments = [
                // ...agreementDocuments,
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