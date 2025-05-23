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
    createLandlordReferenceForm(data, applicationId) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.$transaction((prisma) => __awaiter(this, void 0, void 0, function* () {
                // Check if reference form already exists for this application
                const existingForm = yield __1.prismaClient.landlordReferenceForm.findFirst({
                    where: { applicationId },
                    include: {
                        tenancyReferenceHistory: true,
                        externalLandlord: true,
                        conduct: true,
                        application: true
                    }
                });
                if (existingForm) {
                    throw Error("Landlord reference completed");
                }
                // Run these operations in parallel to save time
                const [tenancyHistory, externalLandlord, tenantConduct] = yield Promise.all([
                    this.createTenancyHistory(prisma, data.tenancyHistory),
                    this.createExternalLandlord(prisma, data.externalLandlord),
                    this.createTenantConduct(prisma, data.conduct)
                ]);
                const created = yield prisma.landlordReferenceForm.create({
                    data: {
                        status: data.status,
                        additionalComments: data.additionalComments,
                        signerName: data.signerName,
                        signature: data.signature,
                        application: {
                            connect: { id: applicationId }
                        },
                        tenancyReferenceHistory: {
                            connect: { id: tenancyHistory.id }
                        },
                        externalLandlord: {
                            connect: { id: externalLandlord.id }
                        },
                        conduct: {
                            connect: { id: tenantConduct.id }
                        }
                    },
                    include: {
                        tenancyReferenceHistory: true,
                        externalLandlord: true,
                        conduct: true,
                        application: true
                    }
                });
                if (created) {
                    yield applicantService_1.default.updateApplicationStatus(applicationId, client_1.ApplicationStatus.LANDLORD_REFERENCE);
                }
                return created;
            }), {
                maxWait: 20000, // Wait up to 20 seconds to acquire a connection from the pool
                timeout: 20000 // Allow 20 seconds for the transaction execution
            });
        });
    }
    createTenancyHistory(prisma, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return prisma.tenancyReferenceHistory.create({
                data: {
                    tenantName: data.tenantName,
                    currentAddress: data.currentAddress,
                    monthlyRent: data.monthlyRent,
                    rentStartDate: data.rentStartDate,
                    rentEndDate: data.rentEndDate,
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
