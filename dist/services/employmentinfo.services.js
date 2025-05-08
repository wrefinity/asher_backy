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
const applicantService_1 = __importDefault(require("../webuser/services/applicantService"));
const client_1 = require("@prisma/client");
const applicantService_2 = __importDefault(require("../webuser/services/applicantService"));
class EmploymentService {
    constructor() {
        // Upsert Employment Information
        this.upsertEmploymentInfo = (data_1, ...args_1) => __awaiter(this, [data_1, ...args_1], void 0, function* (data, applicationId = null) {
            const { userId, id } = data, rest = __rest(data, ["userId", "id"]);
            if (id) {
                // Check if the employment record exists
                const existingRecord = yield this.getEmploymentInfoById(id);
                if (!existingRecord) {
                    throw new Error(`Employment record with ID ${id} does not exist.`);
                }
                // Perform update if ID exists
                return yield __1.prismaClient.employmentInformation.update({
                    where: { id },
                    data: Object.assign(Object.assign({}, rest), { user: userId ? { connect: { id: userId } } : undefined }),
                });
            }
            else {
                // Perform create if ID does not exist
                const employmentInfo = yield __1.prismaClient.employmentInformation.create({
                    data: Object.assign(Object.assign({}, rest), { user: userId ? { connect: { id: userId } } : undefined }),
                });
                if (employmentInfo) {
                    yield applicantService_1.default.updateLastStepStop(applicationId, client_1.ApplicationSaveState.EMPLOYMENT);
                    yield applicantService_1.default.updateCompletedStep(applicationId, client_1.ApplicationSaveState.EMPLOYMENT);
                }
                return employmentInfo;
            }
        });
        // Get Employment Information by userId
        this.getEmploymentInfoByUserId = (userId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.employmentInformation.findMany({
                where: { userId },
            });
        });
        // Get Employment Information by ID
        this.getEmploymentInfoById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.employmentInformation.findUnique({
                where: { id },
            });
        });
        // Delete Employment Information by ID
        this.deleteEmploymentInfoById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.employmentInformation.delete({
                where: { id },
            });
        });
    }
    // employee reference information
    // =====================================
    createEmployeeReference(data, applicationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Check if reference form already exists for this application
                const existingForm = yield __1.prismaClient.employeeReferenceForm.findFirst({
                    where: { applicationId },
                    include: {
                        application: true
                    }
                });
                if (existingForm) {
                    throw Error("Employment reference completed");
                }
                const created = yield __1.prismaClient.employeeReferenceForm.create({
                    data: Object.assign(Object.assign({}, data), { application: {
                            connect: { id: applicationId }
                        } })
                });
                if (created) {
                    yield applicantService_2.default.updateApplicationStatus(applicationId, client_1.ApplicationStatus.EMPLOYEE_REFERENCE);
                }
                return created;
            }
            catch (error) {
                throw new Error(`Error creating employee reference: ${error}`);
            }
        });
    }
    updateEmployeeReference(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield __1.prismaClient.employeeReferenceForm.update({
                    where: { id },
                    data
                });
            }
            catch (error) {
                throw new Error(`Error updating employee reference: ${error}`);
            }
        });
    }
    getEmployeeReferenceById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield __1.prismaClient.employeeReferenceForm.findUnique({
                    where: { id }
                });
            }
            catch (error) {
                throw new Error(`Error fetching employee reference: ${error}`);
            }
        });
    }
    getAllEmployeeReferences() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield __1.prismaClient.employeeReferenceForm.findMany();
            }
            catch (error) {
                throw new Error(`Error fetching all employee references: ${error}`);
            }
        });
    }
}
exports.default = new EmploymentService();
