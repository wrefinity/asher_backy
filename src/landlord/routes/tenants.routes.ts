import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import TenantLandlordController from "../controllers/tenant.controller";
import DocumentRequestController from "../controllers/documentRequest.controller";
import { uploadcsv } from "../../configs/multer";
import upload from "../../configs/multer";
class TenantsLandlordRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router()
        this.authenticateService = new Authorize()
        this.initializeRoutes()
    }

    private initializeRoutes() {
        // tenants modules under landlord
        this.router.get('/get', TenantLandlordController.getTenancies);
        this.router.get('/currents', TenantLandlordController.getCurrentTenant);
        this.router.get('/current-present-future/:propertyId', TenantLandlordController.getTenanciesCategorizedByProperty);
        this.router.get('/current-present-future-all', TenantLandlordController.getTenanciesCategorized);
        this.router.get('/property/:propertyId', TenantLandlordController.getCurrentTenantOnProperty);
        this.router.get('/currents/all', TenantLandlordController.getAllCurrentTenant);
        this.router.get('/previous', TenantLandlordController.getPreviousTenant);
        //  this.router.post('/upload', uploadcsv.single("files"), TenantLandlordController.bulkTenantUpload)
        this.router.post('/upload', TenantLandlordController.bulkTenantUpload)
        this.router.post('/milestones/', TenantLandlordController.createTenantMileStones)
        this.router.get('/milestones/:tenantId', TenantLandlordController.getTenantMileStones)
        this.router.get('/scores/:tenantId', TenantLandlordController.getTenantPerformance)
        this.router.get('/communication-logs/:tenantId', TenantLandlordController.getTenantCommunicationLogs)
        //  tenant complaints 
        this.router.get('/complaints/:tenantId', TenantLandlordController.getTenantComplaints)
        this.router.post('/violations', TenantLandlordController.createTenantViolation)
        this.router.get('/violations/:tenantId', TenantLandlordController.getTenantViolations)
        // Document requests (more specific routes first)
        this.router.post('/:tenantId/document-requests', DocumentRequestController.createDocumentRequest)
        this.router.get('/:tenantId/document-requests', DocumentRequestController.getDocumentRequests)
        this.router.post('/document-requests/:id/fulfill', upload.single('file'), DocumentRequestController.fulfillDocumentRequest)
        // Rent adjustment route (before generic :tenantId routes)
        this.router.patch('/:tenantId/rent', TenantLandlordController.adjustTenantRent)
        // Other tenant routes
        this.router.get('/get/:tenantId', TenantLandlordController.getTenant)
        this.router.get('/documents/:tenantId', TenantLandlordController.getterTenantsDocument)
        this.router.patch('/create-tenant-application-info/:userId/:inviteId', TenantLandlordController.createApplicationFromLast)
    }
}

export default new TenantsLandlordRouter().router