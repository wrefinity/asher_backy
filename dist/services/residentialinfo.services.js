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
const client_1 = require(".prisma/client");
const applicantService_1 = __importDefault(require("../webuser/services/applicantService"));
class ResidentialInformationService {
    constructor() {
        // Upsert Residential Information
        this.upsertResidentialInformation = (data_1, ...args_1) => __awaiter(this, [data_1, ...args_1], void 0, function* (data, applicationId = null) {
            const { id, prevAddresses } = data, rest = __rest(data, ["id", "prevAddresses"]);
            if (id) {
                // Check if the residentialInformation exists
                const existingRecord = yield this.getResidentialInformationById(id);
                if (!existingRecord) {
                    throw new Error(`Residential Information with ID ${id} does not exist.`);
                }
                // Perform update if ID exists
                return yield __1.prismaClient.residentialInformation.update({
                    where: { id },
                    data: Object.assign(Object.assign({}, rest), { prevAddresses: prevAddresses
                            ? {
                                update: prevAddresses
                                    .filter((address) => address.id) // Update only those with an ID
                                    .map((address) => ({
                                    where: { id: address.id }, // Use the ID to find the record to update
                                    data: { lengthOfResidence: address.lengthOfResidence }, // Update the length of residence
                                })),
                                create: prevAddresses
                                    .filter((address) => !address.id) // Create only those without an ID
                                    .map((address) => ({
                                    address: address.address,
                                    lengthOfResidence: address.lengthOfResidence,
                                })),
                            }
                            : undefined }),
                });
            }
            else {
                // Perform create if ID does not exist
                const residential = yield __1.prismaClient.residentialInformation.create({
                    data: Object.assign(Object.assign({}, rest), { prevAddresses: prevAddresses
                            ? {
                                create: prevAddresses.map((address) => ({
                                    address: address.address,
                                    lengthOfResidence: address.lengthOfResidence,
                                })),
                            }
                            : undefined }),
                });
                if (residential) {
                    yield applicantService_1.default.incrementStepCompleted(applicationId, "residentialInfo");
                    yield applicantService_1.default.updateLastStepStop(applicationId, client_1.ApplicationSaveState.RESIDENTIAL_ADDRESS);
                }
                return residential;
            }
        });
        // Get Residential Information by ID
        this.getResidentialInformationById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.residentialInformation.findUnique({
                where: { id },
                include: { prevAddresses: true },
            });
        });
        // Get Residential Information by User ID
        this.getResidentialInformationByUserId = (userId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.residentialInformation.findMany({
                where: { userId },
                include: { prevAddresses: true },
            });
        });
        // Delete Residential Information by ID
        this.deleteResidentialInformationById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.residentialInformation.delete({
                where: { id },
            });
        });
        // Get Previous Address for Residential Information
        this.getPrevAddressesForResidentialInfo = (residentialInfoId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.prevAddress.findMany({
                where: { residentialInformationId: residentialInfoId },
            });
        });
    }
}
exports.default = new ResidentialInformationService();
