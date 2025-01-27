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
const fs_1 = __importDefault(require("fs"));
const moment_1 = __importDefault(require("moment"));
const error_service_1 = __importDefault(require("../../services/error.service"));
const tenants_services_1 = __importDefault(require("../../tenant/services/tenants.services"));
const filereader_1 = require("../../utils/filereader");
const user_services_1 = __importDefault(require("../../services/user.services"));
const client_1 = require("@prisma/client");
const landlord_service_1 = require("../services/landlord.service");
const tenancy_schema_1 = require("../validations/schema/tenancy.schema");
// Helper function to parse the date field into DD/MM/YYYY format
const parseDateFieldNew = (date) => {
    const formattedDate = (0, moment_1.default)(date, 'DD/MM/YYYY', true);
    if (!formattedDate.isValid()) {
        return null;
    }
    return formattedDate.toISOString(); // Use Moment.js to get ISO 8601 format
};
class TenantControls {
    constructor() {
        this.getTenancies = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                const tenants = yield tenants_services_1.default.getAllTenants(landlordId);
                res.status(200).json({ tenants });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getCurrentTenant = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
            if (!landlordId) {
                return res.status(404).json({ error: 'kindly login as landlord' });
            }
            const currentTenants = yield tenants_services_1.default.getCurrenntTenantsForLandlord(landlordId);
            return res.status(200).json({ currentTenants });
        });
        this.getPreviousTenant = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
            if (!landlordId) {
                return res.status(404).json({ error: 'kindly login as landlord' });
            }
            const previousTenants = yield tenants_services_1.default.getPreviousTenantsForLandlord(landlordId);
            return res.status(200).json({ previousTenants });
        });
        this.getApplicationCurrentLandlord = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
            if (!landlordId) {
                return res.status(404).json({ error: 'kindly login as landlord' });
            }
            const previousTenants = yield tenants_services_1.default.getPreviousTenantsForLandlord(landlordId);
            return res.status(200).json({ previousTenants });
        });
        this.bulkTenantUpload = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                if (!landlordId) {
                    return res.status(404).json({ error: 'kindly login as landlord' });
                }
                if (!req.file)
                    return res.status(400).json({ error: 'No csv file uploaded.' });
                // const filePath = path.join(__dirname, '../..', req.file.path);
                // const fileContent = fs.readFileSync(filePath, 'utf-8');
                const filePath = req.file.path;
                // Read and process the CSV file
                const dataFetched = yield (0, filereader_1.parseCSV)(filePath);
                let uploaded = [];
                let uploadErrors = [];
                // get the current landlord email domain
                const landlord = yield this.landlordService.getLandlordById(landlordId);
                if (!landlord)
                    return res.status(403).json({ message: "login as a landlord" });
                // console.log(dataFetched)
                for (const row of dataFetched) {
                    try {
                        // Parse and convert date fields to the required format
                        row.dateOfFirstRent = parseDateFieldNew(row.dateOfFirstRent.toString());
                        row.leaseStartDate = parseDateFieldNew(row.leaseStartDate.toString());
                        row.leaseEndDate = parseDateFieldNew(row.leaseEndDate.toString());
                        row.dateOfBirth = parseDateFieldNew(row.dateOfBirth.toString());
                        row.expiryDate = parseDateFieldNew(row.expiryDate.toString());
                        row.employmentStartDate = parseDateFieldNew(row.employmentStartDate.toString());
                        console.log(row);
                        // Ensure `email` is a string
                        if (Array.isArray(row.email)) {
                            row.email = row.email[0]; // Use the first email in the array
                        }
                        // Validate the row using joi validations
                        const { error } = tenancy_schema_1.tenantSchema.validate(row, { abortEarly: false });
                        if (error) {
                            uploadErrors.push({
                                email: row.email + "testing",
                                errors: error.details.map(detail => detail.message),
                            });
                            continue;
                        }
                        // Check if the user already exists
                        const existingUser = yield user_services_1.default.findUserByEmail(row.email.toString());
                        if (existingUser) {
                            uploadErrors.push({
                                email: row.email,
                                errors: 'User already exists',
                            });
                            continue;
                        }
                        // Process email
                        const userEmail = row.email.toString().split('@')[0];
                        const tenantEmail = `${userEmail}${landlord.emailDomains}`;
                        // Create the new user
                        const newUser = yield user_services_1.default.createUser(Object.assign(Object.assign({}, row), { landlordId, role: client_1.userRoles.TENANT, tenantWebUserEmail: tenantEmail }), true);
                        uploaded.push(newUser);
                    }
                    catch (err) {
                        // Log unexpected errors
                        console.log(err);
                        uploadErrors.push({
                            email: row.email.toString() + "test",
                            errors: `Unexpected error: ${err.message}`,
                        });
                    }
                }
                // Delete the file after processing if needed
                fs_1.default.unlinkSync(filePath);
                // After processing the dataFetched array and populating the uploaded array
                if (uploaded.length > 0) {
                    // Users were successfully uploaded
                    return res.status(200).json({ uploaded, uploadErrors });
                }
                else {
                    // No users were uploaded
                    return res.status(400).json({ error: 'No users were uploaded.', uploadErrors });
                }
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.landlordService = new landlord_service_1.LandlordService();
    }
}
exports.default = new TenantControls();
