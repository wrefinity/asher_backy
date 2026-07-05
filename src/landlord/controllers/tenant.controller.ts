import { Response } from "express"
import errorService from "../../services/error.service"
import { CustomRequest } from "../../utils/types"
import TenantService from "../../tenant/services/tenants.services"
import TenantServiceMain from "../../services/tenant.service"
import UserServices from '../../services/user.services';
import { EnquireStatus, userRoles, YesNo, LogType, DocumentType } from '@prisma/client';
import { LandlordService } from '../services/landlord.service';
import { tenantArraySchema } from '../validations/schema/tenancy.schema';
import {
    formatJoiBulkUploadErrors,
    normalizeTenantBulkRow,
} from '../../utils/tenantBulkUploadNormalizer';
import { LogsSchema } from '../../validations/schemas/logs.schema';
import { ViolationSchema } from '../../validations/schemas/violations';
import LogsServices from '../../services/logs.services';
import ComplaintServices from '../../services/complaintServices';
import ViolationService from '../../services/violations';
import PerformanceCalculator from '../../services/PerformanceCalculator';
import applicantService from "../../webuser/services/applicantService";
import { sendApplicationCompletionEmails } from "../../utils/emailer";
import propertyServices from '../../services/propertyServices';
import moveOutNoticeService from '../../services/moveOutNotice.service';
import asherReferenceService from '../../services/asherReference.service';
import { pickBestEnquiry } from '../../utils/pickBestEnquiry';
import LandlordSettingsService from '../services/propertySetting.service';
import {
  parseGracePeriodDays,
  resolveFinancialRules,
} from '../../utils/globalSettings.util';
import {
  humanizeTenantBulkUploadError,
  isPlaceholderPropertyId,
  PROPERTY_ID_NOT_FOUND_MESSAGE,
  PROPERTY_ID_PLACEHOLDER_MESSAGE,
} from '../../utils/tenantBulkUploadErrors';
import TenantJourneyService from '../../tenant/services/tenantJourney.service';





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
    getTenanciesCategorized = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            const tenants = await TenantServiceMain.getTenantsForLandlord(landlordId);
            res.status(200).json({ tenants });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    getTenanciesCategorizedByProperty = async (req: CustomRequest, res: Response) => {
        try {
            const propertyId = req.params.propertyId;
            console.log("Property ID:", propertyId); // Debug log
            const tenants = await TenantServiceMain.getTenantsByLeaseStatus(propertyId);
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
        const rawTenants = await TenantService.getTenantsWithEnquiries(landlordId, EnquireStatus.EXISTING_TENANT);
        
        const normalizedTenants = await Promise.all(
            rawTenants.map(async (tenant: any) => {
                let enriched = tenant;

                if (tenant.PropertyEnquiry && tenant.PropertyEnquiry.length > 0) {
                    const bestEnquiry = pickBestEnquiry(tenant.PropertyEnquiry);
                    if (!bestEnquiry) return enriched;

                    const normalizedEnquiries = await Promise.all(
                        [bestEnquiry].map(async (enquiry: any) => {
                            const log = enquiry.logs;
                            const propertyListingId =
                                enquiry.propertyListingId || log?.propertyListingId;
                            
                            if (!propertyListingId) {
                                return enquiry;
                            }
                            
                            try {
                                const normalizedListing = await propertyServices.getPropertyListingByListingIdNew(propertyListingId);
                                
                                if (normalizedListing) {
                                    return {
                                        ...enquiry,
                                        listing: normalizedListing
                                    };
                                }
                            } catch (error) {
                                console.error(`Failed to normalize listing for enquiry ${enquiry.id}:`, error);
                            }
                            
                            return enquiry;
                        })
                    );
                    
                    enriched = {
                        ...tenant,
                        PropertyEnquiry: normalizedEnquiries
                    };
                }

                try {
                    const userId = tenant.user?.id || tenant.userId;
                    const tenantName =
                        tenant.user?.profile?.fullname ||
                        [tenant.user?.profile?.firstName, tenant.user?.profile?.lastName]
                            .filter(Boolean)
                            .join(' ') ||
                        undefined;
                    const asherReference = userId
                        ? await asherReferenceService.buildForUserId(userId, {
                              fullName: tenantName,
                              currentProperty: tenant.property?.name,
                          })
                        : null;
                    if (asherReference) {
                        enriched = {
                            ...enriched,
                            referenceMode: 'ASHER_VOUCHED',
                            asherReference,
                        };
                    } else {
                        enriched = { ...enriched, referenceMode: 'TRADITIONAL' };
                    }
                } catch (err) {
                    console.warn(`Failed to build Asher reference for tenant ${tenant.id}`, err);
                    enriched = { ...enriched, referenceMode: 'TRADITIONAL' };
                }
                
                return enriched;
            })
        );
        
        return res.status(200).json({ currentTenants: normalizedTenants });
    }
    getCurrentTenantOnProperty = async (req: CustomRequest, res: Response) => {
        const landlordId = req.user?.landlords?.id;
        if (!landlordId) {
            return res.status(404).json({ error: 'kindly login as landlord' });
        }
        const propertyId = req.params.propertyId;
        const currentTenants = await TenantService.getAllTenantsOnProperty(landlordId, propertyId);
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

        const result = await applicantService.createApplicationFromLast(userId, inviteId, applicationFee);
        if (!result || !result.application) {
            return res.status(400).json({ error: 'Failed to create application.' });
        }
        // send emails to guarantor, employer and landlord (reference)
        await sendApplicationCompletionEmails(result.application);
        // inviteId is required Applications page loads by invite id (GET /invites/:id)
        return res.status(200).json({ application: result.application, inviteId });
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

            // Auto-correct fixable format issues, then validate with Joi.
            const rawRows = Array.isArray(req.body) ? req.body : [req.body];
            const normalizedBody = rawRows.map(row => normalizeTenantBulkRow(row).row);

            const { error, value } = tenantArraySchema.validate(normalizedBody, {
                abortEarly: false,
            });
            if (error) {
                return res.status(400).json({
                    error: 'Validation failed',
                    uploadErrors: [
                        {
                            email: 'Bulk Upload',
                            errors: formatJoiBulkUploadErrors(error.details),
                        },
                    ],
                });
            }

            // Process each row
            for (const row of value) {
                try {
                    const rowErrors: string[] = [];
                    const userEmail = row.email.toString().split('@')[0];
                    const tenantEmail = `${userEmail}${landlord.emailDomains}`;

                    if (isPlaceholderPropertyId(row.propertyId)) {
                        rowErrors.push(PROPERTY_ID_PLACEHOLDER_MESSAGE);
                    } else {
                        const property = await propertyServices.checkLandlordPropertyExist(
                            landlordId,
                            row.propertyId
                        );
                        if (!property) {
                            rowErrors.push(PROPERTY_ID_NOT_FOUND_MESSAGE);
                        }
                    }

                    if (rowErrors.length > 0) {
                        uploadErrors.push({ email: row.email, errors: rowErrors });
                        continue;
                    }

                    const existingUser = await UserServices.findUserByEmail(row.email.toString());

                    if (existingUser) {
                        const { prismaClient } = await import('../..');
                        const duplicateActiveLease = await prismaClient.tenants.findFirst({
                            where: {
                                userId: existingUser.id,
                                landlordId,
                                propertyId: row.propertyId,
                                isCurrentLease: true,
                            },
                        });

                        if (duplicateActiveLease) {
                            rowErrors.push(
                                'This person is already an active tenant on this property. Use a different property, or end their current lease first.'
                            );
                        } else {
                            const linkedUser = await UserServices.createUser(
                                {
                                    ...row,
                                    landlordId,
                                    role: userRoles.TENANT,
                                    tenantWebUserEmail: tenantEmail,
                                    createdById: req.user?.id,
                                },
                                false,
                                req.user?.id,
                                true
                            );
                            uploaded.push(linkedUser);
                        }
                    } else {
                        const newUser = await UserServices.createUser(
                            {
                                ...row,
                                landlordId,
                                role: userRoles.TENANT,
                                tenantWebUserEmail: tenantEmail,
                                createdById: req.user?.id,
                            },
                            true
                        );
                        uploaded.push(newUser);
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
                } catch (err) {
                    const friendlyMessage = humanizeTenantBulkUploadError(err);
                    let existingError = uploadErrors.find(
                        uploadErr => uploadErr.email === row.email
                    );
                    if (existingError) {
                        existingError.errors.push(friendlyMessage);
                    } else {
                        uploadErrors.push({ email: row.email, errors: [friendlyMessage] });
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
            const tenantId = req.params.tenantId;
            const milestones = await TenantJourneyService.getMilestonesForLandlordTenant(
                tenantId,
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
            if (!tenant || tenant.isDeleted) {
                return res.status(404).json({ error: 'Tenant not found' });
            }
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

            const agreementDocuments = (application.agreementDocument || []).flatMap(
                (agreement: any, index: number) =>
                    (agreement.documentUrl || []).map((url: string, urlIndex: number) => ({
                        id: agreement.id ? `${agreement.id}-${urlIndex}` : `agreement-${application.id}-${index}-${urlIndex}`,
                        documentName: `Signed lease agreement${agreement.templateVersion ? ` (v${agreement.templateVersion})` : ''}`,
                        documentUrl: [url],
                        docType: DocumentType.AGREEMENT_DOC,
                        createdAt: agreement.completedAt || agreement.signedByLandlordAt || agreement.createdAt,
                        updatedAt: agreement.updatedAt || agreement.createdAt,
                        type: 'application/pdf',
                        size: null,
                        applicationId: application.id,
                    }))
            );

            const allDocuments = [
                ...agreementDocuments,
                ...application.documents.map((doc: any) => ({
                    ...doc,
                    documentUrl: doc.documentUrl,
                    docType: doc.docType,
                    createdAt: doc.createdAt,
                    updatedAt: doc.updatedAt,
                })),
            ];
            // Response structure
            return res.status(201).json({
                documents: allDocuments
            });
        } catch (error) {
            errorService.handleError(error, res);
        }
    };

    /**
     * Adjust tenant rent
     * PATCH /api/landlord/tenants/:tenantId/rent
     */
    adjustTenantRent = async (req: CustomRequest, res: Response) => {
        try {
            const { tenantId } = req.params;
            const landlordId = req.user?.landlords?.id;
            
            if (!landlordId) {
                return res.status(401).json({ error: 'Please login as landlord' });
            }

            const { scheduledRent, startDate, dueDate, gracePeriod, lateFeeType, lateFeeAmount, createBill } = req.body;

            // Validate required fields
            if (!scheduledRent || scheduledRent <= 0) {
                return res.status(400).json({ error: 'Scheduled rent must be a positive number' });
            }

            if (!startDate || !dueDate) {
                return res.status(400).json({ error: 'Start date and due date are required' });
            }

            // Verify tenant belongs to landlord
            const tenant = await TenantService.getTenantByUserIdAndLandlordId(undefined, landlordId, tenantId);
            
            if (!tenant) {
                return res.status(404).json({ error: 'Tenant not found or does not belong to you' });
            }

            // Import prismaClient and get old rent value before update
            const { prismaClient } = await import('../..');
            
            const property = await prismaClient.properties.findUnique({
                where: { id: tenant.propertyId },
                select: { price: true, priceFrequency: true, landlordId: true },
            });
            const oldRent = property?.price ? Number(property.price) : 0;

            const globalSettings = await LandlordSettingsService.getAllGlobalSettings(landlordId);
            const baseRules = resolveFinancialRules(
                globalSettings,
                Number(scheduledRent),
                property?.priceFrequency
            );

            const graceDays =
                parseGracePeriodDays(gracePeriod) ??
                baseRules.graceDays;

            const lateFeePercentage =
                lateFeeType === 'percentage' && lateFeeAmount != null
                    ? Number(lateFeeAmount)
                    : undefined;
            const lateFeeFixed =
                lateFeeType === 'fixed' && lateFeeAmount != null
                    ? Number(lateFeeAmount)
                    : undefined;

            await LandlordSettingsService.upsertPropertyLateFeeSettings({
                landlordId,
                propertyId: tenant.propertyId,
                lateFeePercentage,
                lateFeeFixed,
                gracePeriodDays: graceDays,
                lateFeeFrequency: globalSettings?.lateFeeFrequency ?? baseRules.lateFeeFrequency,
            });

            // Update property price (this affects the tenant's rent)
            const updatedProperty = await prismaClient.properties.update({
                where: { id: tenant.propertyId },
                data: {
                    price: scheduledRent,
                }
            });

            // Create log entry to track rent adjustment history
            await LogsServices.createLog({
                events: `Rent adjusted from ${oldRent} to ${scheduledRent} for tenant ${tenantId}. Late fee: ${lateFeeType === 'percentage' ? `${lateFeeAmount}%` : lateFeeFixed}, grace: ${graceDays} days.`,
                type: LogType.ACTIVITY,
                propertyId: tenant.propertyId,
                createdById: req.user?.id,
                subjects: `Rent Adjustment: ${oldRent} → ${scheduledRent}`,
            });

            let rentIncreaseBill = null;
            const shouldCreateBill = createBill !== false;
            const { serverInstance } = await import('../..');
            if (shouldCreateBill && Number(scheduledRent) > oldRent) {
                try {
                    const billTemplateService = (await import('../../services/billTemplate.service')).default;
                    rentIncreaseBill = await billTemplateService.createRentIncreaseBill({
                        landlordId,
                        propertyId: tenant.propertyId,
                        tenantId,
                        oldRent,
                        newRent: Number(scheduledRent),
                        dueDate: new Date(dueDate),
                    });
                    if (rentIncreaseBill && serverInstance.paymentNotificationService) {
                        await serverInstance.paymentNotificationService.sendNewBillNotification(rentIncreaseBill.id);
                    }
                } catch (billError) {
                    console.error('Failed to create rent increase bill:', billError);
                }
            } else if (
                Number(scheduledRent) !== oldRent &&
                serverInstance.paymentNotificationService &&
                tenant.userId
            ) {
                await serverInstance.paymentNotificationService.sendRentAdjustmentNotification(
                    tenant.userId,
                    oldRent,
                    Number(scheduledRent),
                    updatedProperty.currency ? String(updatedProperty.currency) : undefined,
                    req.user?.id,
                    landlordId
                );
            }

            return res.status(200).json({
                success: true,
                message: 'Rent adjusted successfully',
                data: {
                    tenantId,
                    propertyId: tenant.propertyId,
                    oldRent,
                    newRent: scheduledRent,
                    property: updatedProperty,
                    rentIncreaseBill,
                    lateFeeSettings: {
                        gracePeriodDays: graceDays,
                        lateFeeType,
                        lateFeeAmount: Number(lateFeeAmount) || 0,
                        lateFeeFrequency: globalSettings?.lateFeeFrequency ?? baseRules.lateFeeFrequency,
                    },
                }
            });
        } catch (error) {
            errorService.handleError(error, res);
        }
    };

    /**
     * Update tenant lease dates
     * PATCH /api/landlord/tenants/:tenantId/lease-dates
     */
    updateLeaseDates = async (req: CustomRequest, res: Response) => {
        try {
            const { tenantId } = req.params;
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(401).json({ error: 'Please login as landlord' });

            const tenant = await TenantService.getTenantByUserIdAndLandlordId(undefined, landlordId, tenantId);
            if (!tenant) return res.status(404).json({ error: 'Tenant not found or does not belong to you' });

            const { leaseStartDate, leaseEndDate } = req.body;
            const data: { leaseStartDate?: Date; leaseEndDate?: Date } = {};
            if (leaseStartDate) data.leaseStartDate = new Date(leaseStartDate);
            if (leaseEndDate) data.leaseEndDate = new Date(leaseEndDate);
            if (Object.keys(data).length === 0) return res.status(400).json({ error: 'Provide at least leaseStartDate or leaseEndDate' });

            const { prismaClient } = await import('../..');
            const updated = await prismaClient.tenants.update({
                where: { id: tenantId },
                data,
            });

            await LogsServices.createLog({
                events: `Lease dates updated for tenant ${tenantId}`,
                type: LogType.ACTIVITY,
                propertyId: tenant.propertyId,
                createdById: req.user?.id,
                subjects: 'Lease dates updated',
            });

            return res.status(200).json({ success: true, message: 'Lease dates updated', data: updated });
        } catch (error) {
            errorService.handleError(error, res);
        }
    };

    /**
     * Extend lease by a period (same rent)
     * POST /api/landlord/tenants/:tenantId/lease/extend
     */
    extendLease = async (req: CustomRequest, res: Response) => {
        try {
            const { tenantId } = req.params;
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(401).json({ error: 'Please login as landlord' });

            const tenant = await TenantService.getTenantByUserIdAndLandlordId(undefined, landlordId, tenantId);
            if (!tenant) return res.status(404).json({ error: 'Tenant not found or does not belong to you' });

            const { period, unit } = req.body as { period: number; unit: 'WEEKS' | 'MONTHS' | 'YEARS' };
            if (!period || period <= 0 || !unit) return res.status(400).json({ error: 'Provide period (number) and unit (WEEKS|MONTHS|YEARS)' });

            const currentEnd = tenant.leaseEndDate ? new Date(tenant.leaseEndDate) : new Date();
            const add = (d: Date, n: number, u: string) => {
                const next = new Date(d);
                if (u === 'WEEKS') next.setDate(next.getDate() + n * 7);
                else if (u === 'MONTHS') next.setMonth(next.getMonth() + n);
                else if (u === 'YEARS') next.setFullYear(next.getFullYear() + n);
                return next;
            };
            const newEnd = add(currentEnd, period, unit);

            const { prismaClient } = await import('../..');
            const updated = await prismaClient.tenants.update({
                where: { id: tenantId },
                data: { leaseEndDate: newEnd },
            });

            await LogsServices.createLog({
                events: `Lease extended by ${period} ${unit} for tenant ${tenantId}`,
                type: LogType.ACTIVITY,
                propertyId: tenant.propertyId,
                createdById: req.user?.id,
                subjects: 'Lease extended',
            });

            return res.status(200).json({ success: true, message: 'Lease extended', data: updated });
        } catch (error) {
            errorService.handleError(error, res);
        }
    };

    /**
     * Terminate lease (set end date and isCurrentLease false)
     * POST /api/landlord/tenants/:tenantId/lease/terminate
     */
    terminateLease = async (req: CustomRequest, res: Response) => {
        try {
            const { tenantId } = req.params;
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(401).json({ error: 'Please login as landlord' });

            const tenant = await TenantService.getTenantByUserIdAndLandlordId(undefined, landlordId, tenantId);
            if (!tenant) return res.status(404).json({ error: 'Tenant not found or does not belong to you' });

            const endDate = req.body.endDate ? new Date(req.body.endDate) : new Date();

            const { prismaClient } = await import('../..');
            const updated = await prismaClient.tenants.update({
                where: { id: tenantId },
                data: { leaseEndDate: endDate, isCurrentLease: false },
            });

            await LogsServices.createLog({
                events: `Lease terminated for tenant ${tenantId} effective ${endDate.toISOString().split('T')[0]}`,
                type: LogType.ACTIVITY,
                propertyId: tenant.propertyId,
                createdById: req.user?.id,
                subjects: 'Lease terminated',
            });

            return res.status(200).json({ success: true, message: 'Lease terminated', data: updated });
        } catch (error) {
            errorService.handleError(error, res);
        }
    };

    /**
     * List lease extension requests for a tenant (landlord view)
     * GET /api/landlord/tenants/:tenantId/lease-extension/requests
     */
    getLeaseExtensionRequests = async (req: CustomRequest, res: Response) => {
        try {
            const { tenantId } = req.params;
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(401).json({ error: 'Please login as landlord' });

            const tenant = await TenantService.getTenantByUserIdAndLandlordId(undefined, landlordId, tenantId);
            if (!tenant) return res.status(404).json({ error: 'Tenant not found or does not belong to you' });

            const { prismaClient } = await import('../..');
            const requests = await prismaClient.leaseExtensionRequest.findMany({
                where: { tenantId },
                orderBy: { createdAt: 'desc' },
            });

            return res.status(200).json({ data: requests });
        } catch (error) {
            errorService.handleError(error, res);
        }
    };

    /**
     * Landlord respond to tenant's lease extension request
     * POST /api/landlord/tenants/:tenantId/lease-extension/:requestId/respond
     */
    respondToLeaseExtensionRequest = async (req: CustomRequest, res: Response) => {
        try {
            const { tenantId, requestId } = req.params;
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(401).json({ error: 'Please login as landlord' });

            const tenant = await TenantService.getTenantByUserIdAndLandlordId(undefined, landlordId, tenantId);
            if (!tenant) return res.status(404).json({ error: 'Tenant not found or does not belong to you' });

            const { response } = req.body as { response: 'APPROVED' | 'REJECTED' };
            if (!response || !['APPROVED', 'REJECTED'].includes(response))
                return res.status(400).json({ error: 'Provide response: APPROVED or REJECTED' });

            const { prismaClient } = await import('../..');
            const extRequest = await prismaClient.leaseExtensionRequest.findFirst({
                where: { id: requestId, tenantId },
            });
            if (!extRequest) return res.status(404).json({ error: 'Extension request not found' });
            if (extRequest.status !== 'PENDING') return res.status(400).json({ error: 'Request already responded' });

            const updated = await prismaClient.leaseExtensionRequest.update({
                where: { id: requestId },
                data: {
                    status: response,
                    respondedBy: req.user?.id,
                    respondedAt: new Date(),
                },
            });

            if (response === 'APPROVED') {
                const currentEnd = tenant.leaseEndDate ? new Date(tenant.leaseEndDate) : new Date();
                const add = (d: Date, n: number, u: string) => {
                    const next = new Date(d);
                    if (u === 'WEEKS') next.setDate(next.getDate() + n * 7);
                    else if (u === 'MONTHS') next.setMonth(next.getMonth() + n);
                    else if (u === 'YEARS') next.setFullYear(next.getFullYear() + n);
                    return next;
                };
                const newEnd = add(currentEnd, extRequest.period, extRequest.unit);
                await prismaClient.tenants.update({
                    where: { id: tenantId },
                    data: { leaseEndDate: newEnd },
                });
                await LogsServices.createLog({
                    events: `Lease extension request ${requestId} approved; tenant ${tenantId} lease extended`,
                    type: LogType.ACTIVITY,
                    propertyId: tenant.propertyId,
                    createdById: req.user?.id,
                    subjects: 'Lease extension approved',
                });
            }

            return res.status(200).json({ success: true, message: `Request ${response.toLowerCase()}`, data: updated });
        } catch (error) {
            errorService.handleError(error, res);
        }
    };

    /**
     * Suspend or restore tenant app access
     * PATCH /api/landlord/tenants/:tenantId/app-access
     */
    setTenantAppAccess = async (req: CustomRequest, res: Response) => {
        try {
            const { tenantId } = req.params;
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(401).json({ error: 'Please login as landlord' });

            const suspended = Boolean(req.body?.suspended);
            const updated = await TenantService.setTenantAppAccessSuspended(
                landlordId,
                tenantId,
                suspended
            );

            await LogsServices.createLog({
                events: suspended
                    ? `Tenant app access suspended for ${tenantId}`
                    : `Tenant app access restored for ${tenantId}`,
                type: LogType.ACTIVITY,
                propertyId: updated.propertyId,
                createdById: req.user?.id,
                subjects: suspended ? 'Tenant access suspended' : 'Tenant access restored',
            });

            return res.status(200).json({
                success: true,
                message: suspended
                    ? 'Tenant app access has been suspended'
                    : 'Tenant app access has been restored',
                data: updated,
            });
        } catch (error) {
            errorService.handleError(error, res);
        }
    };

    /**
     * Soft-delete a tenant record and revoke app access
     * DELETE /api/landlord/tenants/:tenantId
     */
    deleteTenant = async (req: CustomRequest, res: Response) => {
        try {
            const { tenantId } = req.params;
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(401).json({ error: 'Please login as landlord' });

            const updated = await TenantService.softDeleteTenant(landlordId, tenantId);

            await LogsServices.createLog({
                events: `Tenant ${tenantId} removed from landlord portfolio`,
                type: LogType.ACTIVITY,
                propertyId: updated.propertyId,
                createdById: req.user?.id,
                subjects: 'Tenant deleted',
            });

            return res.status(200).json({
                success: true,
                message: 'Tenant removed successfully',
                data: updated,
            });
        } catch (error) {
            errorService.handleError(error, res);
        }
    };

    /**
     * Bulk soft-delete tenants
     * POST /api/landlord/tenants/bulk-delete
     */
    bulkDeleteTenants = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(401).json({ error: 'Please login as landlord' });

            const tenantIds = Array.isArray(req.body?.tenantIds) ? req.body.tenantIds : [];
            if (tenantIds.length === 0) {
                return res.status(400).json({ error: 'tenantIds array is required' });
            }

            const result = await TenantService.bulkSoftDeleteTenants(landlordId, tenantIds);

            if (result.deleted.length > 0) {
                await LogsServices.createLog({
                    events: `Bulk tenant delete: ${result.deleted.length} tenant(s) removed`,
                    type: LogType.ACTIVITY,
                    createdById: req.user?.id,
                    subjects: 'Bulk tenant delete',
                });
            }

            return res.status(200).json({
                success: result.errors.length === 0,
                message:
                    result.deleted.length > 0
                        ? `${result.deleted.length} tenant(s) removed`
                        : 'No tenants were removed',
                ...result,
            });
        } catch (error) {
            errorService.handleError(error, res);
        }
    };

    /**
     * List move-out notices for landlord's tenants
     * GET /api/landlord/tenants/move-out-notices
     */
    getMoveOutNotices = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(401).json({ error: 'Please login as landlord' });

            const status = req.query.status as string | undefined;
            const notices = await moveOutNoticeService.listForLandlord(
                landlordId,
                status === 'PENDING' || status === 'ACKNOWLEDGED' ? status : undefined
            );

            return res.status(200).json({ success: true, data: notices });
        } catch (error) {
            errorService.handleError(error, res);
        }
    };

    /**
     * Pending move-out notice count (dashboard badge)
     * GET /api/landlord/tenants/move-out-notices/pending-count
     */
    getPendingMoveOutNoticeCount = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(401).json({ error: 'Please login as landlord' });

            const count = await moveOutNoticeService.countPendingForLandlord(landlordId);
            return res.status(200).json({ success: true, data: { count } });
        } catch (error) {
            errorService.handleError(error, res);
        }
    };

    /**
     * GET /api/landlord/tenants/:tenantId/asher-reference
     */
    getAsherReference = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            const { tenantId } = req.params;
            if (!landlordId) return res.status(401).json({ error: 'Please login as landlord' });

            const { prismaClient } = await import('../..');
            const tenant = await TenantService.getTenantByUserIdAndLandlordId(undefined, landlordId, tenantId);
            const hasEnquiry = await prismaClient.propertyEnquiry.findFirst({
                where: { tenantId, landlordId },
            });

            if (!tenant && !hasEnquiry) {
                return res.status(404).json({ error: 'Tenant not found or no enquiry with this tenant' });
            }

            const tenantRecord = tenant || (await prismaClient.tenants.findUnique({
                where: { id: tenantId },
                include: {
                    user: {
                        select: {
                            id: true,
                            profile: { select: { fullname: true, firstName: true, lastName: true } },
                        },
                    },
                    property: { select: { name: true } },
                },
            }));

            if (!tenantRecord?.user?.id) {
                return res.status(404).json({ error: 'Tenant user not found' });
            }

            const tenantName =
                tenantRecord.user.profile?.fullname ||
                [tenantRecord.user.profile?.firstName, tenantRecord.user.profile?.lastName]
                    .filter(Boolean)
                    .join(' ');

            const asherReference = await asherReferenceService.buildForUserId(tenantRecord.user.id, {
                fullName: tenantName,
                currentProperty: tenantRecord.property?.name,
            });

            if (!asherReference) {
                return res.status(403).json({
                    error: 'Tenant does not qualify for Asher vouched reference',
                    referenceMode: 'TRADITIONAL',
                });
            }

            return res.status(200).json({
                success: true,
                referenceMode: 'ASHER_VOUCHED',
                data: asherReference,
            });
        } catch (error) {
            errorService.handleError(error, res);
        }
    };

    acknowledgeMoveOutNotice = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            const userId = req.user?.id;
            if (!landlordId || !userId) return res.status(401).json({ error: 'Please login as landlord' });

            const { noticeId } = req.params;
            try {
                const updated = await moveOutNoticeService.acknowledge(noticeId, landlordId, userId);
                return res.status(200).json({
                    success: true,
                    message: 'Move-out notice acknowledged',
                    data: updated,
                });
            } catch (err) {
                if (err instanceof Error) {
                    if (err.message === 'NOTICE_NOT_FOUND') {
                        return res.status(404).json({ error: 'Move-out notice not found' });
                    }
                    if (err.message === 'NOTICE_ALREADY_ACKNOWLEDGED') {
                        return res.status(400).json({ error: 'Notice already acknowledged' });
                    }
                }
                throw err;
            }
        } catch (error) {
            errorService.handleError(error, res);
        }
    };
}


export default new TenantControls()