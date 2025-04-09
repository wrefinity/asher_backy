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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const error_service_1 = __importDefault(require("../../services/error.service"));
const tenants_services_1 = __importDefault(require("../../tenant/services/tenants.services"));
const filereader_1 = require("../../utils/filereader");
const helpers_1 = require("../../utils/helpers");
const user_services_1 = __importDefault(require("../../services/user.services"));
const client_1 = require("@prisma/client");
const landlord_service_1 = require("../services/landlord.service");
const tenancy_schema_1 = require("../validations/schema/tenancy.schema");
const logs_schema_1 = require("../../validations/schemas/logs.schema");
const violations_1 = require("../../validations/schemas/violations");
const logs_services_1 = __importDefault(require("../../services/logs.services"));
const complaintServices_1 = __importDefault(require("../../services/complaintServices"));
const violations_2 = __importDefault(require("../../services/violations"));
const normalizePhoneNumber = (phone) => {
    if (!phone)
        return '';
    // Convert from exponential notation if necessary
    let phoneStr = typeof phone === "number" ? phone.toFixed(0) : phone.toString();
    // Remove non-digit characters
    phoneStr = phoneStr.replace(/\D/g, '');
    return phoneStr;
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
        this.getAllCurrentTenant = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
            if (!landlordId) {
                return res.status(404).json({ error: 'kindly login as landlord' });
            }
            const currentTenants = yield tenants_services_1.default.getCurrentTenantsGeneric();
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
            var _a, _b, _c;
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                if (!landlordId) {
                    return res.status(403).json({ error: 'Access denied. Please log in as a landlord.' });
                }
                if (!req.file) {
                    return res.status(400).json({ error: 'No CSV file uploaded. Please upload a valid file.' });
                }
                const filePath = req.file.path;
                let uploaded = [];
                let uploadErrors = [];
                // Fetch landlord details
                const landlord = yield this.landlordService.getLandlordById(landlordId);
                if (!landlord) {
                    return res.status(403).json({ error: "Invalid landlord. Please re-login." });
                }
                // Read CSV file safely
                let dataFetched;
                try {
                    dataFetched = yield (0, filereader_1.parseCSV)(filePath);
                }
                catch (err) {
                    return res.status(500).json({ error: 'Error parsing CSV file.', details: err.message });
                }
                // Process each row
                for (const row of dataFetched) {
                    let rowErrors = [];
                    try {
                        if (!row.email) {
                            rowErrors.push("Missing email field.");
                        }
                        // Format and validate phone number
                        row.phoneNumber = normalizePhoneNumber(row.phoneNumber);
                        if (!row.phoneNumber || row.phoneNumber.length < 10) {
                            rowErrors.push(`Invalid phone number format: "${row.phoneNumber}"`);
                        }
                        // Convert date fields safely
                        const dateFields = [
                            { key: "dateOfFirstRent", label: "Date of First Rent" },
                            { key: "leaseStartDate", label: "Lease Start Date" },
                            { key: "leaseEndDate", label: "Lease End Date" },
                            { key: "dateOfBirth", label: "Date of Birth" },
                            { key: "expiryDate", label: "Expiry Date" },
                            { key: "employmentStartDate", label: "Employment Start Date" }
                        ];
                        for (const field of dateFields) {
                            try {
                                if (row[field.key]) {
                                    row[field.key] = (0, helpers_1.parseDateFieldNew)((_c = row[field.key]) === null || _c === void 0 ? void 0 : _c.toString(), field.label);
                                }
                            }
                            catch (dateError) {
                                rowErrors.push(dateError.message);
                            }
                        }
                        // Validate row data
                        const { error } = tenancy_schema_1.tenantSchema.validate(row, { abortEarly: false });
                        if (error) {
                            rowErrors.push(...error.details.map(detail => detail.message));
                        }
                        // Check for existing user
                        const existingUser = yield user_services_1.default.findUserByEmail(row.email.toString());
                        if (existingUser) {
                            rowErrors.push("User already exists.");
                        }
                        if (rowErrors.length > 0) {
                            let existingError = uploadErrors.find(err => err.email === row.email);
                            if (existingError) {
                                existingError.errors.push(...rowErrors);
                            }
                            else {
                                uploadErrors.push({ email: row.email, errors: rowErrors });
                            }
                            continue; // Skip processing for this row
                        }
                        // Generate tenant email
                        const userEmail = row.email.toString().split('@')[0];
                        const tenantEmail = `${userEmail}${landlord.emailDomains}`;
                        // Create new user
                        const newUser = yield user_services_1.default.createUser(Object.assign(Object.assign({}, row), { landlordId, role: client_1.userRoles.TENANT, tenantWebUserEmail: tenantEmail }), true);
                        uploaded.push(newUser);
                    }
                    catch (err) {
                        let existingError = uploadErrors.find(err => err.email === row.email);
                        if (existingError) {
                            existingError.errors.push(`Unexpected error: ${err.message}`);
                        }
                        else {
                            uploadErrors.push({ email: row.email, errors: [`Unexpected error: ${err.message}`] });
                        }
                    }
                }
                // Delete the CSV file
                fs_1.default.unlinkSync(filePath);
                // Return response
                if (uploaded.length > 0) {
                    return res.status(200).json({ uploaded, uploadErrors });
                }
                else {
                    return res.status(400).json({ error: 'No users were uploaded.', uploadErrors });
                }
            }
            catch (error) {
                return res.status(500).json({ error: 'Server error occurred.', details: error.message });
            }
        });
        // tenants milestone section
        this.createTenantMileStones = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                if (!landlordId) {
                    return res.status(404).json({ error: 'kindly login as landlord' });
                }
                const { error, value } = yield logs_schema_1.LogsSchema.validate(req.body);
                if (error)
                    return res.status(400).json({ message: error.details[0].message });
                // LogsSchema
                const { userId } = value, data = __rest(value, ["userId"]);
                const userExist = user_services_1.default.getUserById(String(userId));
                if (!userExist)
                    return res.status(404).json({ error: `tenant with the userId :  ${userId} doesnot exist` });
                // get the property attached to current tenant
                const tenant = yield tenants_services_1.default.getTenantByUserIdAndLandlordId(userId, landlordId);
                const milestones = yield logs_services_1.default.createLog(Object.assign({ propertyId: tenant.propertyId, createdById: userId }, data));
                return res.status(201).json({ milestones });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getTenantMileStones = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                if (!landlordId) {
                    return res.status(404).json({ error: 'kindly login as landlord' });
                }
                const tenantId = req.params.tenantId;
                // const tenantUserId = req.params.tenantUserId
                // const userExist = UserServices.getUserById(String(tenantUserId));
                // if (!userExist)
                //     return res.status(404).json({ error: `tenant with the userId :  ${tenantUserId} doesnot exist` });
                // get the property attached to current tenant
                // const tenant = await TenantService.getTenantByUserIdAndLandlordId(tenantUserId, landlordId)
                const tenant = yield tenants_services_1.default.getTenantWithUserAndProfile(tenantId);
                if (!(tenant === null || tenant === void 0 ? void 0 : tenant.propertyId))
                    return res.status(404).json({ error: `tenant with the id :  ${tenantId} is not connected to a property` });
                const milestones = yield logs_services_1.default.getLandlordTenantsLogsByProperty(tenant.propertyId, tenant.userId, landlordId);
                return res.status(200).json({ milestones });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getTenantComplaints = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                if (!landlordId) {
                    return res.status(404).json({ error: 'kindly login as landlord' });
                }
                const tenantId = req.params.tenantId;
                // const userExist = UserServices.getUserById(String(tenantUserId));
                // if (!userExist)
                //     return res.status(404).json({ error: `tenant with the userId :  ${tenantUserId} doesnot exist` });
                // // get the property attached to current tenant
                // const tenant = await TenantService.getTenantByUserIdAndLandlordId(tenantUserId, landlordId)
                const tenant = yield tenants_services_1.default.getTenantWithUserAndProfile(tenantId);
                if (!(tenant === null || tenant === void 0 ? void 0 : tenant.propertyId))
                    return res.status(404).json({ error: `tenant with the id :  ${tenantId} is not connected to a property` });
                const complaints = yield complaintServices_1.default.getLandlordPropsTenantComplaints(tenant.userId, tenant === null || tenant === void 0 ? void 0 : tenant.propertyId, landlordId);
                return res.status(200).json({ complaints });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getTenantCommunicationLogs = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                if (!landlordId) {
                    return res.status(404).json({ error: 'kindly login as landlord' });
                }
                const tenantId = req.params.tenantId;
                // const userExist = UserServices.getUserById(String(tenantUserId));
                // if (!userExist)
                //     return res.status(404).json({ error: `tenant with the userId :  ${tenantUserId} doesnot exist` });
                // // get the property attached to current tenant
                // const tenant = await TenantService.getTenantByUserIdAndLandlordId(tenantUserId, landlordId)
                const tenant = yield tenants_services_1.default.getTenantWithUserAndProfile(tenantId);
                if (!(tenant === null || tenant === void 0 ? void 0 : tenant.propertyId))
                    return res.status(404).json({ error: `tenant with the id :  ${tenantId} is not connected to a property` });
                const complaints = yield logs_services_1.default.getCommunicationLog(tenant === null || tenant === void 0 ? void 0 : tenant.propertyId, tenant.userId, landlordId);
                return res.status(200).json({ complaints });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.createTenantViolation = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const { error, value } = violations_1.ViolationSchema.validate(req.body);
                if (error) {
                    return res.status(400).json({
                        message: error.details[0].message,
                    });
                }
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                if (!landlordId) {
                    return res.status(404).json({ error: 'kindly login as landlord' });
                }
                const violation = yield violations_2.default.create(Object.assign(Object.assign({}, value), { createdById: (_c = req.user) === null || _c === void 0 ? void 0 : _c.id }));
                return res.status(201).json({
                    message: 'Violation created successfully',
                    violation // Here you can send back the created violation
                });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getTenantViolations = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const tenantId = req.params.tenantId;
                const landlordId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.landlords) === null || _b === void 0 ? void 0 : _b.id;
                if (!landlordId) {
                    return res.status(404).json({ error: 'kindly login as landlord' });
                }
                const violation = yield violations_2.default.getViolationTenantId(tenantId);
                return res.status(201).json({
                    violation
                });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.landlordService = new landlord_service_1.LandlordService();
    }
}
exports.default = new TenantControls();
