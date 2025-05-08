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
class ApplicantPersonalDetailsService {
    constructor() {
        // Upsert Applicant Personal Details
        this.upsertApplicantPersonalDetails = (data) => __awaiter(this, void 0, void 0, function* () {
            const { id, userId, nextOfKin } = data, rest = __rest(data, ["id", "userId", "nextOfKin"]);
            const inputData = Object.assign(Object.assign({}, rest), { user: userId ? { connect: { id: userId } } : null, email: data.email || "", nextOfKin: nextOfKin
                    ? { connect: { id: nextOfKin.id } } // Handle nextOfKin relation
                    : undefined });
            if (id) {
                // Check if record exists
                const existingRecord = yield this.getApplicantPersonalDetailsById(id);
                if (!existingRecord) {
                    throw new Error(`Applicant Personal Details with ID ${id} does not exist.`);
                }
                // Update record
                return yield __1.prismaClient.applicantPersonalDetails.update({
                    where: { id },
                    data: inputData, // Ensure typing
                });
            }
            else {
                // Create new record
                return yield __1.prismaClient.applicantPersonalDetails.create({
                    data: inputData,
                });
            }
        });
        // Get Applicant Personal Details by ID
        this.getApplicantPersonalDetailsById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.applicantPersonalDetails.findUnique({
                where: { id },
            });
        });
        // Get Applicant Personal Details by email
        this.getApplicantPersonalDetailsByEmail = (email) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.applicantPersonalDetails.findUnique({
                where: { email },
            });
        });
        // Get Applicant Personal Details by userId
        this.getApplicantPersonalDetailsByUserId = (userId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.applicantPersonalDetails.findMany({
                where: {
                    userId: userId,
                },
            });
        });
        // Delete Applicant Personal Details by ID
        this.deleteApplicantPersonalDetailsById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.applicantPersonalDetails.delete({
                where: { id },
            });
        });
        // Get Next of Kin for Applicant Personal Details
        this.getNextOfKinForApplicant = (applicantId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.nextOfKin.findMany({
                where: { applicantPersonalDetailsId: applicantId },
            });
        });
    }
}
exports.default = new ApplicantPersonalDetailsService();
