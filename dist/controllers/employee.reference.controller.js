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
const employmentinfo_services_1 = __importDefault(require("../services/employmentinfo.services"));
const reference_schema_1 = require("../validations/schemas/reference.schema");
const applicantService_1 = __importDefault(require("../webuser/services/applicantService"));
const error_service_1 = __importDefault(require("../services/error.service"));
class EmployeeReferenceController {
    createEmployeeReference(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const applicationId = req.params.id;
                // Validate application ID
                if (!applicationId) {
                    return res.status(400).json({
                        error: "Application ID is required",
                        details: ["Missing application ID in URL parameters"]
                    });
                }
                // Verify application exists
                const application = yield applicantService_1.default.getApplicationById(applicationId);
                if (!application) {
                    return res.status(404).json({
                        error: "Application not found",
                        details: [`Application with ID ${applicationId} does not exist`]
                    });
                }
                const { error, value } = reference_schema_1.employeeReferenceSchema.validate(req.body);
                if (error)
                    return res.status(400).json({ error: error.details[0].message });
                const result = yield employmentinfo_services_1.default.createEmployeeReference(value, applicationId);
                res.status(201).json(result);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    updateEmployeeReference(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { error, value } = reference_schema_1.employeeReferenceSchema.validate(req.body);
                if (error)
                    return res.status(400).json({ error: error.details[0].message });
                const result = yield employmentinfo_services_1.default.updateEmployeeReference(id, value);
                res.status(200).json(result);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    getEmployeeReferenceById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const result = yield employmentinfo_services_1.default.getEmployeeReferenceById(id);
                if (!result)
                    return res.status(404).json({ error: 'Employee reference not found' });
                res.status(200).json(result);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    getAllEmployeeReferences(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield employmentinfo_services_1.default.getAllEmployeeReferences();
                res.status(200).json(result);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new EmployeeReferenceController();
