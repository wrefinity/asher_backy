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
const client_1 = require("@prisma/client");
const __1 = require("..");
const applicantService_1 = __importDefault(require("../webuser/services/applicantService"));
class LandlordReferenceService {
    createLandlordReferenceForm(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.$transaction((prisma) => __awaiter(this, void 0, void 0, function* () {
                // Use CreateDTO interfaces for creation
                const tenancyHistory = yield this.createTenancyHistory(prisma, data.tenancyHistory);
                const externalLandlord = yield this.createExternalLandlord(prisma, data.externalLandlord);
                const tenantConduct = yield this.createTenantConduct(prisma, data.conduct);
                const created = yield prisma.landlordReferenceForm.create({
                    data: {
                        status: data.status,
                        additionalComments: data.additionalComments,
                        signerName: data.signerName,
                        signature: data.signature,
                        applicationId: data.applicationId,
                        TenancyReferenceHistoryId: tenancyHistory.id,
                        externalLandlordId: externalLandlord.id,
                        conductId: tenantConduct.id
                    },
                    include: {
                        tenancyReferenceHistory: true,
                        externalLandlord: true,
                        conduct: true,
                        application: true
                    }
                });
                if (created) {
                    yield applicantService_1.default.updateApplicationStatus(data.applicationId, client_1.ApplicationStatus.LANDLORD_REFERENCE);
                }
                return created;
            }));
        });
    }
    createTenancyHistory(prisma, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return prisma.tenancyReferenceHistory.create({
                data: {
                    fullName: data.fullName,
                    propertyAddress: data.propertyAddress,
                    rentAmount: data.rentAmount,
                    tenancyStartDate: data.tenancyStartDate,
                    tenancyEndDate: data.tenancyEndDate,
                    reasonForLeaving: data.reasonForLeaving
                }
            });
        });
    }
    createExternalLandlord(prisma, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return prisma.externalLandlord.create({
                data: {
                    name: data.name,
                    contactNumber: data.contactNumber,
                    emailAddress: data.emailAddress
                }
            });
        });
    }
    createTenantConduct(prisma, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return prisma.tenantConduct.create({
                data: {
                    rentOnTime: data.rentOnTime,
                    rentOnTimeDetails: data.rentOnTimeDetails,
                    rentArrears: data.rentArrears,
                    rentArrearsDetails: data.rentArrearsDetails,
                    propertyCondition: data.propertyCondition,
                    propertyConditionDetails: data.propertyConditionDetails,
                    complaints: data.complaints,
                    complaintsDetails: data.complaintsDetails,
                    endCondition: data.endCondition,
                    endConditionDetails: data.endConditionDetails,
                    rentAgain: data.rentAgain,
                    rentAgainDetails: data.rentAgainDetails
                }
            });
        });
    }
}
exports.default = new LandlordReferenceService();
