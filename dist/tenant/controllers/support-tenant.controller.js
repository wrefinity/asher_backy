"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_service_1 = __importDefault(require("../../services/error.service"));
const supportSchema_1 = __importDefault(require("../schema/supportSchema"));
const support_tenant_services_1 = __importDefault(require("../services/support-tenant.services"));
class SupportTenantController {
    createsupportTenantTicket(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const tenantId = req.user.id;
            try {
                const { error, value } = supportSchema_1.default.create().validate(req.body);
                if (error) {
                    return res.status(400).json({ message: error.details[0].message });
                }
                const data = Object.assign({}, value);
                const attachment = req.body.cloudinaryUrls;
                delete data['cloudinaryUrls'];
                const ticket = yield support_tenant_services_1.default.createSupportTenantTicket(Object.assign(Object.assign({}, data), { attachment }), tenantId);
                res.status(201).json(ticket);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    getSupportTenantTickets(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const tenantId = req.user.id;
            try {
                const { ticketId } = req.params;
                const tickets = yield support_tenant_services_1.default.getSupportTenantTicket(ticketId, tenantId);
                res.status(200).json(tickets);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new SupportTenantController();
