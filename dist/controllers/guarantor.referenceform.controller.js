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
const guarantor_services_1 = __importDefault(require("../services/guarantor.services"));
const applicantService_1 = __importDefault(require("../webuser/services/applicantService"));
const error_service_1 = __importDefault(require("../services/error.service"));
class GuarantorController {
    createGuarantorAgreement(req, res) {
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
                // Validate request body
                const { error, value } = reference_schema_1.GuarantorAgreementCreateSchema.validate(req.body);
                if (error) {
                    return res.status(400).json({
                        error: "Validation Error",
                        details: error.details.map(d => d.message)
                    });
                }
                // const data = req.body;
                // const documents = data.cloudinaryDocumentUrls;
                // delete data.cloudinaryUrls;
                // delete data.cloudinaryVideoUrls;
                // delete data.cloudinaryDocumentUrls;
                // delete data.cloudinaryAudioUrls;
                // Create agreement with nested employment info
                const result = yield guarantor_services_1.default.createGuarantorAgreement(Object.assign(Object.assign({}, value), { applicationId, employmentInfo: value.employmentInfo }));
                res.status(201).json(result);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new GuarantorController();
