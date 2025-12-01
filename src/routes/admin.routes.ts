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

        // Test email endpoint (requires authentication)
        this.router.post(
            "/test-email",
            this.authenticateService.authorize,
            AdminController.testEmail
        );
    }
}

export default new AdminRouter().router;

