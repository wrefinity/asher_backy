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
const maintenance_service_1 = __importDefault(require("../../services/maintenance.service"));
const error_service_1 = __importDefault(require("../../services/error.service"));
const propertyServices_1 = __importDefault(require("../../services/propertyServices"));
class MaintenanceControls {
    constructor() {
        this.getMaintenances = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const tenantId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.tenant) === null || _b === void 0 ? void 0 : _b.id;
                if (!tenantId)
                    return res.status(400).json({ message: "kindly log in as a tenant" });
                const property = yield propertyServices_1.default.getPropertiesAttachedToTenants(tenantId);
                if (!property)
                    return res.status(404).json({ message: "No property attached to this tenant" });
                const maintenances = yield maintenance_service_1.default.getPropertyTenantMaintenance(property.id, tenantId);
                return res.status(200).json({ maintenances });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new MaintenanceControls();
