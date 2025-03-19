"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authorize_1 = require("../../middlewares/authorize");
const applicant_controller_1 = __importDefault(require("../controllers/applicant.controller"));
class ApplicationLandlordRouter {
    constructor() {
        this.router = (0, express_1.Router)();
        this.authenticateService = new authorize_1.Authorize();
        this.initializeRoutes();
    }
    initializeRoutes() {
        this.router.get('/pending', applicant_controller_1.default.getApplicationsPending);
        this.router.get('/completed', applicant_controller_1.default.getApplicationsCompleted);
        this.router.get('/total', applicant_controller_1.default.getTotalApplication);
        this.router.patch('/proceed-pay/:applicationId', applicant_controller_1.default.makeApplicationPaymentRequest);
        this.router.post('/approve/:applicationId', applicant_controller_1.default.approveApplication);
        this.router.patch('/decline/:applicationId', applicant_controller_1.default.declineApplication);
        this.router.get('/statistics', applicant_controller_1.default.getApplicationStatistics);
        this.router.get('/leasing', applicant_controller_1.default.getEnquiredProps);
        this.router.post('/invites/:enquiryId/enquire', applicant_controller_1.default.createInvite);
        this.router.get('/invites', applicant_controller_1.default.getInvites);
        this.router.get('/invites/:id', applicant_controller_1.default.getInvite);
        this.router.patch('/invites/:id/update', applicant_controller_1.default.updateInvite);
        this.router.delete('/invites/:id', applicant_controller_1.default.deleteInvite);
        this.router.get('/invites/feedbacks', applicant_controller_1.default.getFeedbacks);
        /// feedbacks
    }
}
exports.default = new ApplicationLandlordRouter().router;
