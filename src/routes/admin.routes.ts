import { Router } from "express";
import { Authorize } from "../middlewares/authorize";
import AdminController from "../controllers/admin.controller";
import upload from "../configs/multer";
import { userRoles } from "@prisma/client";

class AdminRouter {
    public router: Router;
    authenticateService: Authorize;

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // Public endpoint for setting password (no auth required - uses token)
        // IMPORTANT: This must be defined BEFORE any auth middleware routes
        this.router.post(
            "/set-landlord-password",
            AdminController.setLandlordPassword
        );

        // Public endpoint for getting published documents (for frontend consumption)
        // Only returns published documents filtered by systemId
        this.router.get(
            "/documents/public",
            AdminController.getPublishedDocuments
        );

        // Admin endpoints - require authentication and ADMIN role
        this.router.post(
            "/invite-landlord",
            this.authenticateService.authorize,
            // TODO: Add admin role check middleware
            AdminController.inviteLandlord
        );

        // System statistics endpoints - require authentication
        this.router.get(
            "/stats",
            this.authenticateService.authorize,
            AdminController.getSystemStats
        );

        this.router.get(
            "/activity",
            this.authenticateService.authorize,
            AdminController.getActivityData
        );

        this.router.get(
            "/system-health",
            this.authenticateService.authorize,
            AdminController.getSystemHealth
        );

        this.router.get(
            "/landlords",
            this.authenticateService.authorize,
            AdminController.getAllLandlords
        );

        this.router.get(
            "/landlords/identity-verifications/pending",
            this.authenticateService.authorize,
            this.authenticateService.authorizeRole(userRoles.ADMIN),
            AdminController.getPendingIdentityVerifications
        );

        this.router.post(
            "/landlords/:landlordId/identity-verification/approve",
            this.authenticateService.authorize,
            this.authenticateService.authorizeRole(userRoles.ADMIN),
            AdminController.approveLandlordIdentity
        );

        this.router.post(
            "/landlords/:landlordId/identity-verification/reject",
            this.authenticateService.authorize,
            this.authenticateService.authorizeRole(userRoles.ADMIN),
            AdminController.rejectLandlordIdentity
        );

        // Vendors (Part 1 of VENDOR_APP_FLOW_SPEC.md) - mirrors the landlord
        // blocks above.
        this.router.get(
            "/vendors",
            this.authenticateService.authorize,
            AdminController.getAllVendors
        );

        this.router.get(
            "/vendors/verifications/pending",
            this.authenticateService.authorize,
            this.authenticateService.authorizeRole(userRoles.ADMIN),
            AdminController.getPendingVendorVerifications
        );

        this.router.post(
            "/vendors/:vendorId/verification/approve",
            this.authenticateService.authorize,
            this.authenticateService.authorizeRole(userRoles.ADMIN),
            AdminController.approveVendorVerification
        );

        this.router.post(
            "/vendors/:vendorId/verification/reject",
            this.authenticateService.authorize,
            this.authenticateService.authorizeRole(userRoles.ADMIN),
            AdminController.rejectVendorVerification
        );

        // Public - the Vendor app reads this during onboarding, before it
        // has an authenticated session (register-vendor is the final step).
        this.router.get(
            "/vendors/document-requirements/active",
            async (req, res) => {
                const { getActiveDocumentRequirements } = await import(
                    "../services/vendorDocumentRequirement.service"
                );
                const requirements = await getActiveDocumentRequirements();
                res.status(200).json({ success: true, data: requirements });
            }
        );

        this.router.get(
            "/vendors/document-requirements",
            this.authenticateService.authorize,
            this.authenticateService.authorizeRole(userRoles.ADMIN),
            AdminController.getVendorDocumentRequirements
        );

        this.router.post(
            "/vendors/document-requirements",
            this.authenticateService.authorize,
            this.authenticateService.authorizeRole(userRoles.ADMIN),
            AdminController.createVendorDocumentRequirement
        );

        this.router.patch(
            "/vendors/document-requirements/:requirementId",
            this.authenticateService.authorize,
            this.authenticateService.authorizeRole(userRoles.ADMIN),
            AdminController.updateVendorDocumentRequirement
        );

        this.router.delete(
            "/vendors/document-requirements/:requirementId",
            this.authenticateService.authorize,
            this.authenticateService.authorizeRole(userRoles.ADMIN),
            AdminController.deleteVendorDocumentRequirement
        );

        this.router.post(
            "/landlords/:userId/resend-invite",
            this.authenticateService.authorize,
            AdminController.resendLandlordInvite
        );

        this.router.post(
            "/landlords/:userId/temp-password",
            this.authenticateService.authorize,
            AdminController.setLandlordTempPassword
        );

        this.router.delete(
            "/landlords/:userId/invite",
            this.authenticateService.authorize,
            AdminController.cancelLandlordInvite
        );

        this.router.delete(
            "/landlords/:userId",
            this.authenticateService.authorize,
            AdminController.deleteLandlordAccount
        );

        this.router.post(
            "/landlords/:userId/suspend",
            this.authenticateService.authorize,
            AdminController.setLandlordSuspension
        );

        // Public endpoint for landlords to get admin users for chat
        this.router.get(
            "/admin-users",
            AdminController.getAllAdminUsers
        );

        // Admin endpoints to see ALL data in database
        this.router.get(
            "/emails",
            this.authenticateService.authorize,
            AdminController.getAllEmails
        );

        this.router.get(
            "/chat-rooms",
            this.authenticateService.authorize,
            AdminController.getAllChatRooms
        );

        this.router.get(
            "/chat-rooms/:chatRoomId/messages",
            this.authenticateService.authorize,
            AdminController.getChatRoomMessages
        );

        // Support tickets - Admin dedicated endpoints (require ADMIN role)
        this.router.get(
            "/tickets",
            this.authenticateService.authorize,
            this.authenticateService.authorizeRole(userRoles.ADMIN),
            AdminController.getAllTickets
        );

        this.router.get(
            "/tickets/:ticketId",
            this.authenticateService.authorize,
            this.authenticateService.authorizeRole(userRoles.ADMIN),
            AdminController.getTicketById
        );

        this.router.get(
            "/users/:userId/tickets",
            this.authenticateService.authorize,
            this.authenticateService.authorizeRole(userRoles.ADMIN),
            AdminController.getTicketsByUserId
        );

        this.router.post(
            "/tickets",
            this.authenticateService.authorize,
            this.authenticateService.authorizeRole(userRoles.ADMIN),
            AdminController.createTicket
        );

        this.router.patch(
            "/tickets/:ticketId",
            this.authenticateService.authorize,
            this.authenticateService.authorizeRole(userRoles.ADMIN),
            AdminController.updateTicket
        );

        this.router.patch(
            "/tickets/:ticketId/status",
            this.authenticateService.authorize,
            this.authenticateService.authorizeRole(userRoles.ADMIN),
            AdminController.updateTicketStatus
        );

        this.router.post(
            "/tickets/:ticketId/assign",
            this.authenticateService.authorize,
            this.authenticateService.authorizeRole(userRoles.ADMIN),
            AdminController.assignTicket
        );

        this.router.post(
            "/tickets/:ticketId/messages",
            this.authenticateService.authorize,
            this.authenticateService.authorizeRole(userRoles.ADMIN),
            AdminController.addMessageToTicket
        );

        // Document management routes
        this.router.get(
            "/documents",
            this.authenticateService.authorize,
            this.authenticateService.authorizeRole(userRoles.ADMIN),
            AdminController.getAllDocuments
        );

        // Document view tracking (public - no auth required)
        this.router.post(
            "/documents/:documentId/view",
            AdminController.trackDocumentView
        );

        this.router.post(
            "/documents",
            this.authenticateService.authorize,
            this.authenticateService.authorizeRole(userRoles.ADMIN),
            upload.array('files'),
            AdminController.createDocument
        );

        // Rich text document endpoint (no file upload)
        this.router.post(
            "/documents/rich-text",
            this.authenticateService.authorize,
            this.authenticateService.authorizeRole(userRoles.ADMIN),
            AdminController.createRichTextDocument
        );

        this.router.patch(
            "/documents/:documentId/status",
            this.authenticateService.authorize,
            AdminController.updateDocumentStatus
        );

        this.router.get(
            "/compliance/overview",
            this.authenticateService.authorize,
            this.authenticateService.authorizeRole(userRoles.ADMIN),
            AdminController.getComplianceOverview
        );

        // Test email endpoint (requires authentication)
        this.router.post(
            "/test-email",
            this.authenticateService.authorize,
            AdminController.testEmail
        );
    }
}

export default new AdminRouter().router;

