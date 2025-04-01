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
const __1 = require("..");
const client_1 = require("@prisma/client");
const applicantService_1 = __importDefault(require("../webuser/services/applicantService"));
const client_2 = require(".prisma/client");
class GuarantorService {
    constructor() {
        // Upsert Guarantor Information
        this.upsertGuarantorInfo = (data_1, ...args_1) => __awaiter(this, [data_1, ...args_1], void 0, function* (data, applicationId = null) {
            const { userId, id } = data, rest = __rest(data, ["userId", "id"]);
            if (id) {
                // Check if the guarantor exists
                const existingGuarantor = yield this.getGuarantorById(id);
                if (!existingGuarantor) {
                    throw new Error(`Guarantor with ID ${id} does not exist.`);
                }
                // Perform update if id is provided
                return yield __1.prismaClient.guarantorInformation.update({
                    where: { id },
                    data: Object.assign(Object.assign({}, rest), { user: {
                            connect: { id: userId },
                        } }),
                });
            }
            else {
                // Perform create if id is not provided
                const guarantorInfo = yield __1.prismaClient.guarantorInformation.create({
                    data: Object.assign(Object.assign({}, rest), { user: {
                            connect: { id: userId },
                        } }),
                });
                if (guarantorInfo) {
                    yield applicantService_1.default.updateLastStepStop(applicationId, client_2.ApplicationSaveState.GUARANTOR_INFO);
                    yield applicantService_1.default.updateCompletedStep(applicationId, client_2.ApplicationSaveState.GUARANTOR_INFO);
                }
                return guarantorInfo;
            }
        });
        // Get Guarantor by userId
        this.getGuarantorByUserId = (userId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.guarantorInformation.findMany({
                where: { userId },
            });
        });
        // Get Guarantor by Id
        this.getGuarantorById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.guarantorInformation.findUnique({
                where: { id },
            });
        });
        // Delete Guarantor by ID
        this.deleteGuarantorById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.guarantorInformation.delete({
                where: { id },
            });
        });
    }
    // guarantor reference services
    createGuarantorAgreement(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.$transaction((prisma) => __awaiter(this, void 0, void 0, function* () {
                // Validate and create employment info if provided
                let employmentInfo = yield prisma.guarantorEmploymentInfo.create({
                    data: this.mapEmploymentData(data.guarantorEmployment)
                });
                // Validate guarantor exists
                const guarantor = yield prisma.application.findFirst({
                    where: { id: data.applicationId }, include: { guarantorInformation: true }
                });
                if (!guarantor) {
                    throw new Error(`Guarantor not found`);
                }
                // Create main agreement
                const created = yield prisma.guarantorAgreement.create({
                    data: {
                        status: data.status,
                        agreementText: data.agreementText,
                        signedByGuarantor: data.signedByGuarantor || false,
                        guarantorSignature: data.guarantorSignature,
                        guarantorSignedAt: data.guarantorSignedAt,
                        applicationId: data.applicationId,
                        guarantorId: guarantor.id,
                        guarantorEmploymentId: employmentInfo === null || employmentInfo === void 0 ? void 0 : employmentInfo.id
                    },
                    include: {
                        guarantor: true,
                        guarantorEmployment: true,
                        application: true
                    }
                });
                if (created) {
                    yield applicantService_1.default.updateApplicationStatus(data.applicationId, client_2.ApplicationStatus.GUARANTOR_REFERENCE);
                }
                return created;
            }));
        });
    }
    mapEmploymentData(data) {
        const baseData = {
            employmentType: data.employmentType,
            annualIncome: data.annualIncome,
        };
        switch (data.employmentType) {
            case client_1.EmploymentType.EMPLOYED:
                return Object.assign(Object.assign({}, baseData), { employerName: data.employerName, jobTitle: data.jobTitle, employmentStartDate: data.employmentStartDate, employerAddress: data.employerAddress, employerPhone: data.employerPhone, employerEmail: data.employerEmail });
            case client_1.EmploymentType.SELF_EMPLOYED:
                return Object.assign(Object.assign({}, baseData), { businessName: data.businessName, businessNature: data.businessNature, yearsInBusiness: data.yearsInBusiness, businessAddress: data.businessAddress, accountantName: data.accountantName, accountantContact: data.accountantContact, utrNumber: data.utrNumber });
            case client_1.EmploymentType.FREELANCE:
                return Object.assign(Object.assign({}, baseData), { freelanceType: data.freelanceType, yearsFreelancing: data.yearsFreelancing, monthlyIncome: data.monthlyIncome, portfolioWebsite: data.portfolioWebsite, majorClients: data.majorClients });
            case client_1.EmploymentType.DIRECTOR:
                return Object.assign(Object.assign({}, baseData), { companyName: data.companyName, companyNumber: data.companyNumber, position: data.position, ownershipPercentage: data.ownershipPercentage, companyFounded: data.companyFounded, companyAddress: data.companyAddress });
            case client_1.EmploymentType.SOLE_PROPRIETOR:
                return Object.assign(Object.assign({}, baseData), { businessRegistrationNumber: data.businessRegistrationNumber });
            default:
                throw new Error(`Invalid employment type: ${data.employmentType}`);
        }
    }
}
exports.default = new GuarantorService();
