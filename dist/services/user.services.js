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
const __1 = require("..");
const bcrypt_1 = require("bcrypt");
// import { SignUpIF } from "../interfaces/authInt";
const loggers_1 = __importDefault(require("../utils/loggers"));
const client_1 = require("@prisma/client");
class UserService {
    constructor() {
        this.checkexistance = (obj) => __awaiter(this, void 0, void 0, function* () {
            const user = yield __1.prismaClient.users.findFirst({
                where: Object.assign({}, obj),
                select: {
                    id: true,
                    tenant: { select: { id: true } },
                    landlords: { select: { id: true } },
                    profile: true,
                    vendors: { select: { id: true } },
                }
            });
            // Dynamically build the inclusion object
            if ((user === null || user === void 0 ? void 0 : user.tenant) != null)
                this.inclusion.tenant = true;
            if ((user === null || user === void 0 ? void 0 : user.landlords) != null)
                this.inclusion.landlords = true;
            if ((user === null || user === void 0 ? void 0 : user.vendors) != null)
                this.inclusion.vendors = true;
            if (user === null || user === void 0 ? void 0 : user.profile)
                this.inclusion.profile = true;
            console.log(user);
            return user;
        });
        this.findUserByEmail = (email) => __awaiter(this, void 0, void 0, function* () {
            // Find the user first to check if related entities exist
            const foundUser = yield this.checkexistance({ email });
            if (!foundUser) {
                return false;
            }
            // console.log("===========DB Checkers ==========")
            // console.log(this.inclusion)
            const user = yield __1.prismaClient.users.findFirst({
                where: { email },
                include: this.inclusion,
            });
            return user;
        });
        this.findAUserById = (userId) => __awaiter(this, void 0, void 0, function* () {
            // Find the user first to check if related entities exist
            const user = yield this.checkexistance({ id: String(userId) });
            if (!user) {
                throw new Error('User not found');
            }
            return yield __1.prismaClient.users.findFirst({
                where: { id: String(userId) },
                include: this.inclusion,
            });
        });
        this.hashPassword = (password) => {
            return password ? (0, bcrypt_1.hashSync)(password, 10) : null;
        };
        this.generateUniqueTenantCode = (landlordCode) => __awaiter(this, void 0, void 0, function* () {
            let isUnique = false;
            let tenantCode;
            while (!isUnique) {
                const suffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                tenantCode = `${landlordCode}-${suffix}`;
                const existingTenant = yield __1.prismaClient.tenants.findUnique({ where: { tenantCode } });
                if (!existingTenant)
                    isUnique = true;
            }
            return tenantCode;
        });
        this.generateUniqueLandlordCode = () => __awaiter(this, void 0, void 0, function* () {
            let isUnique = false;
            let code;
            while (!isUnique) {
                code = 'LD' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0'); // e.g., LD123456
                const existingLandlord = yield __1.prismaClient.landlords.findUnique({ where: { landlordCode: code } });
                if (!existingLandlord)
                    isUnique = true;
            }
            return code;
        });
        this.createUser = (userData_1, ...args_1) => __awaiter(this, [userData_1, ...args_1], void 0, function* (userData, landlordUploads = false) {
            const newUser = yield __1.prismaClient.users.create({
                data: {
                    email: userData === null || userData === void 0 ? void 0 : userData.email,
                    role: (userData === null || userData === void 0 ? void 0 : userData.role) ? [userData.role] : [client_1.userRoles === null || client_1.userRoles === void 0 ? void 0 : client_1.userRoles.WEBUSER],
                    isVerified: landlordUploads ? true : false,
                    password: this.hashPassword(userData === null || userData === void 0 ? void 0 : userData.password),
                    profile: {
                        create: {
                            gender: userData === null || userData === void 0 ? void 0 : userData.gender,
                            phoneNumber: userData === null || userData === void 0 ? void 0 : userData.phoneNumber,
                            address: userData === null || userData === void 0 ? void 0 : userData.address,
                            dateOfBirth: userData === null || userData === void 0 ? void 0 : userData.dateOfBirth,
                            fullname: userData === null || userData === void 0 ? void 0 : userData.fullname,
                            profileUrl: userData === null || userData === void 0 ? void 0 : userData.profileUrl,
                            zip: userData === null || userData === void 0 ? void 0 : userData.zip,
                            unit: userData === null || userData === void 0 ? void 0 : userData.unit,
                            state: userData === null || userData === void 0 ? void 0 : userData.state,
                            timeZone: userData === null || userData === void 0 ? void 0 : userData.timeZone,
                            taxPayerId: userData === null || userData === void 0 ? void 0 : userData.taxPayerId,
                            taxType: userData === null || userData === void 0 ? void 0 : userData.taxType,
                        }
                    }
                },
            });
            // Based on the role, create the corresponding entry in the related schema
            switch (userData === null || userData === void 0 ? void 0 : userData.role) {
                case client_1.userRoles.LANDLORD:
                    const landlordCode = yield this.generateUniqueLandlordCode();
                    yield __1.prismaClient.landlords.create({
                        data: {
                            landlordCode,
                            userId: newUser.id,
                        },
                    });
                    break;
                case client_1.userRoles.VENDOR:
                    yield __1.prismaClient.vendors.create({
                        data: {
                            userId: newUser.id
                        },
                    });
                    break;
                case client_1.userRoles.TENANT:
                    const landlord = yield __1.prismaClient.landlords.findUnique({ where: { id: userData.landlordId } });
                    if (!landlord)
                        throw new Error('Landlord not found');
                    const property = yield __1.prismaClient.properties.findUnique({
                        where: { id: userData.propertyId },
                    });
                    if (!property) {
                        throw new Error('Property not found');
                    }
                    const tenantCode = yield this.generateUniqueTenantCode(landlord.landlordCode);
                    const tenant = yield __1.prismaClient.tenants.create({
                        data: {
                            tenantCode,
                            userId: newUser.id,
                            tenantWebUserEmail: userData.tenantWebUserEmail,
                            propertyId: userData === null || userData === void 0 ? void 0 : userData.propertyId,
                            landlordId: userData === null || userData === void 0 ? void 0 : userData.landlordId,
                            leaseStartDate: userData === null || userData === void 0 ? void 0 : userData.leaseStartDate,
                            leaseEndDate: userData === null || userData === void 0 ? void 0 : userData.leaseEndDate,
                        },
                    });
                    if (tenant && !landlordUploads) {
                        // Update application with tenant info
                        yield __1.prismaClient.application.update({
                            where: { id: userData.applicationId },
                            data: {
                                status: client_1.ApplicationStatus.ACCEPTED,
                                tenantId: newUser.id,
                            },
                        });
                    }
                    break;
                default:
                    break;
            }
            return newUser;
        });
        this.updateUserInfo = (id, userData) => __awaiter(this, void 0, void 0, function* () {
            const updateData = Object.assign({}, userData);
            if (userData.password) {
                updateData.password = (0, bcrypt_1.hashSync)(userData.password, 10);
            }
            return yield __1.prismaClient.users.update({
                where: { id },
                data: updateData,
            });
        });
        this.updateUserVerificationStatus = (userId, isVerified) => __awaiter(this, void 0, void 0, function* () {
            try {
                const updatedUser = yield __1.prismaClient.users.update({
                    where: { id: String(userId) },
                    data: { isVerified },
                });
                return updatedUser;
            }
            catch (error) {
                loggers_1.default.info(`Error updating user verification status: ${error}`);
                throw new Error('Failed to update user verification status');
            }
        });
        this.updateUserPassword = (userId, password) => __awaiter(this, void 0, void 0, function* () {
            try {
                const updatedUser = yield __1.prismaClient.users.update({
                    where: { id: String(userId) },
                    data: { password: (0, bcrypt_1.hashSync)(password, 10) },
                });
                return updatedUser;
            }
            catch (error) {
                loggers_1.default.info(`Error updating user verification status: ${error}`);
                throw new Error('Failed to update user verification status');
            }
        });
        this.createGoogleUser = (userData) => __awaiter(this, void 0, void 0, function* () {
            let user = null;
            try {
                user = yield this.findUserByEmail(userData.email);
                if (user && user.password) {
                    return { error: "A user with this email exists" };
                }
            }
            catch (error) {
                loggers_1.default.error("An error occured while checking for existing.", error);
            }
            try {
                const newUser = yield this.createUser(userData);
                return newUser;
            }
            catch (error) {
                loggers_1.default.error("An error occured while creating Google user.", error);
                return { error: "An error occured creating Google User" };
            }
        });
        this.createLandlord = (userData) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            return yield __1.prismaClient.users.create({
                data: {
                    email: userData === null || userData === void 0 ? void 0 : userData.email,
                    password: (userData === null || userData === void 0 ? void 0 : userData.password) ? (0, bcrypt_1.hashSync)(userData === null || userData === void 0 ? void 0 : userData.password, 10) : null,
                    isVerified: (userData === null || userData === void 0 ? void 0 : userData.isVerified) || false,
                    role: [client_1.userRoles === null || client_1.userRoles === void 0 ? void 0 : client_1.userRoles.LANDLORD],
                    profile: {
                        create: {
                            gender: (_a = userData === null || userData === void 0 ? void 0 : userData.profile) === null || _a === void 0 ? void 0 : _a.gender,
                            phoneNumber: (_b = userData === null || userData === void 0 ? void 0 : userData.profile) === null || _b === void 0 ? void 0 : _b.phoneNumber,
                            address: (_c = userData === null || userData === void 0 ? void 0 : userData.profile) === null || _c === void 0 ? void 0 : _c.address,
                            dateOfBirth: (_d = userData === null || userData === void 0 ? void 0 : userData.profile) === null || _d === void 0 ? void 0 : _d.dateOfBirth,
                            fullname: (_e = userData === null || userData === void 0 ? void 0 : userData.profile) === null || _e === void 0 ? void 0 : _e.fullname,
                            profileUrl: (_f = userData === null || userData === void 0 ? void 0 : userData.profile) === null || _f === void 0 ? void 0 : _f.profileUrl,
                        },
                    },
                    landlords: {
                        create: {
                            isDeleted: false,
                        },
                    },
                },
            });
        });
        this.updateLandlordOrTenantOrVendorInfo = (data, id, role) => __awaiter(this, void 0, void 0, function* () {
            let updated;
            switch (role) {
                case client_1.userRoles.LANDLORD:
                    updated = yield __1.prismaClient.landlords.update({
                        where: { id },
                        data: {
                            emailDomains: data === null || data === void 0 ? void 0 : data.emailDomains
                        },
                    });
                    break;
                case client_1.userRoles.VENDOR:
                    break;
                case client_1.userRoles.TENANT:
                    break;
                default:
                    break;
            }
            return updated;
        });
        this.inclusion = {
            tenant: false,
            landlords: false,
            vendors: false,
            profile: false
        };
    }
}
exports.default = new UserService();
