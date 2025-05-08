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
const reference_schema_1 = require("../validations/schemas/reference.schema");
const externallandlord_service_1 = __importDefault(require("../services/externallandlord.service"));
const error_service_1 = __importDefault(require("../services/error.service"));
const applicantService_1 = __importDefault(require("../webuser/services/applicantService"));
class LandlordReferenceFormControls {
    constructor() {
        this.createReferenceForm = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                // Get application ID from URL parameters
                const applicationId = req.params.id;
                // Validate application ID presence
                if (!applicationId) {
                    return res.status(400).json({
                        error: "Application ID is required",
                        details: ["Missing application ID in request parameters"]
                    });
                }
                // Check application existence
                const application = yield applicantService_1.default.getApplicationById(applicationId);
                if (!application) {
                    return res.status(404).json({
                        error: "Application not found",
                        details: [`Application with ID ${applicationId} does not exist`]
                    });
                }
                // Validate request body
                const { error, value } = reference_schema_1.LandlordReferenceFormCreateSchema.validate(req.body);
                if (error) {
                    return res.status(400).json({
                        error: "Validation Error",
                        details: error.details.map(d => d.message)
                    });
                }
                // Combine validated data with application ID
                const formData = Object.assign(Object.assign({}, value), { applicationId: applicationId });
                // Create reference form
                const result = yield externallandlord_service_1.default.createLandlordReferenceForm(formData, applicationId);
                res.status(201).json(result);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getReferenceForm = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                // Get application ID from URL parameters
                const applicationId = req.params.id;
                // Validate application ID presence
                if (!applicationId) {
                    return res.status(400).json({
                        error: "Application ID is required",
                        details: ["Missing application ID in request parameters"]
                    });
                }
                // Check application existence
                const application = yield applicantService_1.default.getApplicationById(applicationId);
                if (!application) {
                    return res.status(404).json({
                        error: "Application not found",
                        details: [`Application with ID ${applicationId} does not exist`]
                    });
                }
                res.status(201).json({ application });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new LandlordReferenceFormControls();
