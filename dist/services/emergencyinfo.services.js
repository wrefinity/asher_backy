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
const client_1 = require(".prisma/client");
const __1 = require("..");
const applicantService_1 = __importDefault(require("../webuser/services/applicantService"));
class EmergencyContactService {
    constructor() {
        // Upsert Emergency Contact Information
        this.upsertEmergencyContact = (data_1, ...args_1) => __awaiter(this, [data_1, ...args_1], void 0, function* (data, applicationId = null) {
            const { userId, id } = data, rest = __rest(data, ["userId", "id"]);
            if (id) {
                // Check if the emergency contact exists
                const existingContact = yield this.getEmergencyContactById(id);
                if (!existingContact) {
                    throw new Error(`Emergency contact with ID ${id} does not exist.`);
                }
                // Perform update if ID exists
                return yield __1.prismaClient.emergencyContact.update({
                    where: { id },
                    data: Object.assign(Object.assign({}, rest), { user: userId ? { connect: { id: userId } } : undefined }),
                });
            }
            else {
                // Perform create if ID does not exist
                const emergencyContact = yield __1.prismaClient.emergencyContact.create({
                    data: Object.assign(Object.assign({}, rest), { user: userId ? { connect: { id: userId } } : undefined }),
                });
                if (emergencyContact) {
                    yield applicantService_1.default.updateLastStepStop(applicationId, client_1.ApplicationSaveState.EMERGENCY_CONTACT);
                    yield applicantService_1.default.updateCompletedStep(applicationId, client_1.ApplicationSaveState.EMERGENCY_CONTACT);
                }
                return emergencyContact;
            }
        });
        // Get Emergency Contact by userId
        this.getEmergencyContactByUserId = (userId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.emergencyContact.findMany({
                where: { userId },
            });
        });
        // Get Emergency Contact by ID
        this.getEmergencyContactById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.emergencyContact.findUnique({
                where: { id },
            });
        });
        // Delete Emergency Contact by ID
        this.deleteEmergencyContactById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.emergencyContact.delete({
                where: { id },
            });
        });
    }
}
exports.default = new EmergencyContactService();
