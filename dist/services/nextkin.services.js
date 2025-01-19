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
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
class NextOfKinService {
    constructor() {
        // Upsert NextOfKin Information
        this.upsertNextOfKinInfo = (data) => __awaiter(this, void 0, void 0, function* () {
            const { userId, id, applicantPersonalDetailsId } = data, rest = __rest(data, ["userId", "id", "applicantPersonalDetailsId"]);
            if (id) {
                // Check if the nextOfKin record exists
                const existingRecord = yield this.getNextOfKinById(id);
                if (!existingRecord) {
                    throw new Error(`Next of Kin record with ID ${id} does not exist.`);
                }
                // Perform update if ID exists
                return yield __1.prismaClient.nextOfKin.update({
                    where: { id },
                    data: Object.assign(Object.assign({}, rest), { applicantPersonalDetails: applicantPersonalDetailsId
                            ? { connect: { id: applicantPersonalDetailsId } }
                            : undefined, user: userId ? { connect: { id: userId } } : undefined }),
                });
            }
            else {
                // Perform create if ID does not exist
                return yield __1.prismaClient.nextOfKin.create({
                    data: Object.assign(Object.assign({}, rest), { applicantPersonalDetails: applicantPersonalDetailsId
                            ? { connect: { id: applicantPersonalDetailsId } }
                            : undefined, user: userId ? { connect: { id: userId } } : undefined }),
                });
            }
        });
        // Get NextOfKin by userId
        this.getNextOfKinByUserId = (userId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.nextOfKin.findMany({
                where: { userId },
            });
        });
        // Get NextOfKin by ID
        this.getNextOfKinById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.nextOfKin.findUnique({
                where: { id },
            });
        });
        // Get NextOfKin by Applicant Personal Details ID
        this.getNextOfKinByApplicantPersonalDetailsId = (applicantPersonalDetailsId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.nextOfKin.findMany({
                where: { applicantPersonalDetailsId },
            });
        });
        // Delete NextOfKin by ID
        this.deleteNextOfKinById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.nextOfKin.delete({
                where: { id },
            });
        });
    }
}
exports.default = new NextOfKinService();
