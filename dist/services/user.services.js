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
const guarantor_services_1 = __importDefault(require("../services/guarantor.services"));
const referees_services_1 = __importDefault(require("../services/referees.services"));
const emergencyinfo_services_1 = __importDefault(require("../services/emergencyinfo.services"));
const employmentinfo_services_1 = __importDefault(require("../services/employmentinfo.services"));
const nextkin_services_1 = __importDefault(require("../services/nextkin.services"));
const personaldetails_services_1 = __importDefault(require("../services/personaldetails.services"));
const wallet_service_1 = __importDefault(require("./wallet.service"));
const helpers_1 = require("../utils/helpers");
const emailer_1 = __importDefault(require("../utils/emailer"));
const propertyServices_1 = __importDefault(require("./propertyServices"));
const applicantService_1 = __importDefault(require("../webuser/services/applicantService"));
class UserService {
    constructor() {
        // cm641qu2d00003wf057tudib7
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
            // console.log(user)
            return user;
        });
        this.findUserByEmail = (email) => __awaiter(this, void 0, void 0, function* () {
            // Find the user first to check if related entities exist
            const foundUser = yield this.checkexistance({ email });
            if (!foundUser) {
                return false;
            }
            const user = yield __1.prismaClient.users.findFirst({
                where: { email },
                include: this.inclusion,
            });
            return user;
        });
        this.updateOnlineStatus = (userId, status) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.users.update({
                where: { id: userId },
                data: { onlineStatus: status }
            });
        });
        this.getUserById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.users.findFirst({
                where: { id },
                include: this.inclusion,
            });
        });
        this.findUserByTenantCode = (tenantCode) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.users.findFirst({
                where: {
                    tenant: {
                        tenantCode,
                    },
                },
                include: {
                    tenant: {
                        include: {
                            property: true,
                            landlord: {
                                select: {
                                    landlordCode: true,
                                    userId: true
                                }
                            },
                        }
                    },
                    profile: true,
                },
            });
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
        this.createNewUser = (userData_1, ...args_1) => __awaiter(this, [userData_1, ...args_1], void 0, function* (userData, landlordBulkUploads = false) {
            var _a, _b, _c;
            return yield __1.prismaClient.users.create({
                data: {
                    email: userData === null || userData === void 0 ? void 0 : userData.email,
                    role: (userData === null || userData === void 0 ? void 0 : userData.role) ? [userData.role] : [client_1.userRoles === null || client_1.userRoles === void 0 ? void 0 : client_1.userRoles.WEBUSER],
                    isVerified: landlordBulkUploads ? true : false,
                    password: this.hashPassword(userData === null || userData === void 0 ? void 0 : userData.password),
                    profile: {
                        create: {
                            gender: userData === null || userData === void 0 ? void 0 : userData.gender,
                            phoneNumber: userData === null || userData === void 0 ? void 0 : userData.phoneNumber,
                            address: userData === null || userData === void 0 ? void 0 : userData.address,
                            dateOfBirth: userData === null || userData === void 0 ? void 0 : userData.dateOfBirth,
                            fullname: `${userData === null || userData === void 0 ? void 0 : userData.lastName} ${userData === null || userData === void 0 ? void 0 : userData.firstName} ${(userData === null || userData === void 0 ? void 0 : userData.middleName) ? userData.middleName : ""}`.trim(),
                            firstName: (_a = userData === null || userData === void 0 ? void 0 : userData.firstName) === null || _a === void 0 ? void 0 : _a.trim(),
                            lastName: (_b = userData === null || userData === void 0 ? void 0 : userData.lastName) === null || _b === void 0 ? void 0 : _b.trim(),
                            middleName: (_c = userData === null || userData === void 0 ? void 0 : userData.middleName) === null || _c === void 0 ? void 0 : _c.trim(),
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
        });
        this.createUser = (userData_1, ...args_1) => __awaiter(this, [userData_1, ...args_1], void 0, function* (userData, landlordBulkUploads = false, createdBy = null, createTenantProfile = false) {
            var _a, _b;
            let user = null;
            user = yield __1.prismaClient.users.findUnique({
                where: { email: userData === null || userData === void 0 ? void 0 : userData.email },
                include: { profile: true }
            });
            // for normal account creations 
            if (!landlordBulkUploads && !createdBy && !createTenantProfile) {
                user = yield this.createNewUser(userData);
            }
            // Create a new user by landlord during bulk upload
            if (!user && landlordBulkUploads && !createTenantProfile) {
                user = yield this.createNewUser(userData, landlordBulkUploads);
                const tenantExist = yield this.tenantExistsForLandlord(userData === null || userData === void 0 ? void 0 : userData.landlordId, user === null || user === void 0 ? void 0 : user.id);
                if (tenantExist)
                    return tenantExist;
                const application = yield this.completeApplicationProfile(userData, user.id, createdBy);
                const roleToUse = user.role.includes(client_1.userRoles.TENANT) ? client_1.userRoles.TENANT : userData === null || userData === void 0 ? void 0 : userData.role;
                const result = yield this.updateUserBasedOnRole(Object.assign(Object.assign({}, userData), { applicationId: application === null || application === void 0 ? void 0 : application.id }), user, roleToUse);
                const tenant = result;
                (0, emailer_1.default)(user.email, "ACCOUNT CREATION", `<h3>Your account has been created successfully.</h3>
                    <p>Dear ${(_a = user === null || user === void 0 ? void 0 : user.profile) === null || _a === void 0 ? void 0 : _a.firstName},</p>
                    <p>We are pleased to inform you that your account has been created successfully. You can now access your account and enjoy our services.</p>
                    <p>To get started, please login to your account using the credentials below:</p>
                    <p>Username: ${tenant === null || tenant === void 0 ? void 0 : tenant.tenantCode}</p>
                    <p>Thank you for choosing us. </p>
                    <p>Best regards,</p>`);
                // make the property occupied
                yield propertyServices_1.default.updateAvailabiltyStatus(userData === null || userData === void 0 ? void 0 : userData.landlordId, userData === null || userData === void 0 ? void 0 : userData.propertyId, client_1.AvailabilityStatus.OCCUPIED);
            }
            // for web user for complete tenant account profile creation
            if (user && !landlordBulkUploads && (userData === null || userData === void 0 ? void 0 : userData.role) === client_1.userRoles.TENANT && createTenantProfile) {
                // user = await this.createNewUser(userData, landlordBulkUploads);
                const roleToUse = user.role.includes(client_1.userRoles.TENANT) ? client_1.userRoles.TENANT : userData === null || userData === void 0 ? void 0 : userData.role;
                const tenantExist = yield this.tenantExistsForLandlord(userData === null || userData === void 0 ? void 0 : userData.landlordId, user === null || user === void 0 ? void 0 : user.id);
                if (tenantExist)
                    return tenantExist;
                const result = yield this.updateUserBasedOnRole(userData, user, roleToUse);
                (0, emailer_1.default)(user.email, "ACCOUNT CREATION", `<h3>Your account has been created successfully.</h3>
                    <p>Dear ${(_b = user === null || user === void 0 ? void 0 : user.profile) === null || _b === void 0 ? void 0 : _b.firstName},</p>
                    <p>We are pleased to inform you that your account has been created successfully. You can now access your account and enjoy our services.</p>
                    <p>To get started, please login to your account using the credentials below:</p>
                    <p>Username: ${result === null || result === void 0 ? void 0 : result.tenantCode}</p>
                    <p>Thank you for choosing us. </p>
                    <p>Best regards,</p>`);
                // make the property occupied
                yield propertyServices_1.default.updateAvailabiltyStatus(userData === null || userData === void 0 ? void 0 : userData.landlordId, userData === null || userData === void 0 ? void 0 : userData.propertyId, client_1.AvailabilityStatus.OCCUPIED);
                //unlist the property
                yield propertyServices_1.default.deletePropertyListing(userData === null || userData === void 0 ? void 0 : userData.propertyId);
                yield applicantService_1.default.updateApplicationStatusStep(userData === null || userData === void 0 ? void 0 : userData.applicationId, client_1.ApplicationStatus.TENANT_CREATED);
                yield applicantService_1.default.updateApplicationStatusStep(userData === null || userData === void 0 ? void 0 : userData.applicationId, client_1.ApplicationStatus.COMPLETED);
            }
            if (user && (userData === null || userData === void 0 ? void 0 : userData.role) === client_1.userRoles.VENDOR) {
                yield this.updateUserBasedOnRole(userData, user, client_1.userRoles === null || client_1.userRoles === void 0 ? void 0 : client_1.userRoles.VENDOR);
            }
            if (user && (userData === null || userData === void 0 ? void 0 : userData.role) === client_1.userRoles.LANDLORD) {
                yield this.updateUserBasedOnRole(userData, user, client_1.userRoles === null || client_1.userRoles === void 0 ? void 0 : client_1.userRoles.LANDLORD);
            }
            if (!user && (userData === null || userData === void 0 ? void 0 : userData.role) === client_1.userRoles.VENDOR) {
                user = yield this.createNewUser(userData, false);
                yield this.updateUserBasedOnRole(userData, user, client_1.userRoles === null || client_1.userRoles === void 0 ? void 0 : client_1.userRoles.VENDOR);
            }
            if (!user && (userData === null || userData === void 0 ? void 0 : userData.role) === client_1.userRoles.LANDLORD) {
                user = yield this.createNewUser({ userData }, false);
                yield this.updateUserBasedOnRole(userData, user, client_1.userRoles === null || client_1.userRoles === void 0 ? void 0 : client_1.userRoles.LANDLORD);
            }
            const countryData = yield (0, helpers_1.getCurrentCountryCurrency)();
            if (user && (countryData === null || countryData === void 0 ? void 0 : countryData.locationCurrency)) {
                yield wallet_service_1.default.getOrCreateWallet(user.id, countryData.locationCurrency);
            }
            return this.getUserById(user.id);
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
        this.completeApplicationProfile = (userData, userId, createdBy) => __awaiter(this, void 0, void 0, function* () {
            // 1. Create personal details first (needed by NextOfKin)
            const personalDetails = yield personaldetails_services_1.default.upsertApplicantPersonalDetails({
                title: userData === null || userData === void 0 ? void 0 : userData.title,
                invited: userData === null || userData === void 0 ? void 0 : userData.invited,
                maritalStatus: userData === null || userData === void 0 ? void 0 : userData.maritalStatus,
                phoneNumber: userData === null || userData === void 0 ? void 0 : userData.phoneNumber,
                email: userData === null || userData === void 0 ? void 0 : userData.email,
                dob: userData === null || userData === void 0 ? void 0 : userData.dateOfBirth,
                firstName: userData === null || userData === void 0 ? void 0 : userData.firstName,
                lastName: userData === null || userData === void 0 ? void 0 : userData.lastName,
                middleName: userData === null || userData === void 0 ? void 0 : userData.middleName,
                nationality: userData === null || userData === void 0 ? void 0 : userData.nationality,
                identificationType: userData === null || userData === void 0 ? void 0 : userData.identificationType,
                issuingAuthority: userData === null || userData === void 0 ? void 0 : userData.issuingAuthority,
                expiryDate: userData === null || userData === void 0 ? void 0 : userData.expiryDate,
                userId
            });
            // 2. Run independent calls in parallel
            const [guarantorInfo, employmentInfo, emergencyInfo, refreeInfo] = yield Promise.all([
                guarantor_services_1.default.upsertGuarantorInfo({
                    id: (userData === null || userData === void 0 ? void 0 : userData.guarantorId) || null,
                    fullName: (userData === null || userData === void 0 ? void 0 : userData.guarantorFullname) || '',
                    phoneNumber: (userData === null || userData === void 0 ? void 0 : userData.guarantorPhoneNumber) || '',
                    email: (userData === null || userData === void 0 ? void 0 : userData.guarantorEmail) || '',
                    address: (userData === null || userData === void 0 ? void 0 : userData.guarantorAddress) || '',
                    relationship: (userData === null || userData === void 0 ? void 0 : userData.relationshipToGuarantor) || '',
                    identificationType: (userData === null || userData === void 0 ? void 0 : userData.guarantorIdentificationType) || '',
                    identificationNo: (userData === null || userData === void 0 ? void 0 : userData.guarantorIdentificationNo) || '',
                    monthlyIncome: (userData === null || userData === void 0 ? void 0 : userData.guarantorMonthlyIncome) || null,
                    employerName: (userData === null || userData === void 0 ? void 0 : userData.guarantorEmployerName) || null,
                    userId
                }),
                employmentinfo_services_1.default.upsertEmploymentInfo({
                    employmentStatus: userData === null || userData === void 0 ? void 0 : userData.employmentStatus,
                    taxCredit: userData === null || userData === void 0 ? void 0 : userData.taxCredit,
                    zipCode: userData === null || userData === void 0 ? void 0 : userData.employmentZipCode,
                    address: userData === null || userData === void 0 ? void 0 : userData.employmentAddress,
                    city: userData === null || userData === void 0 ? void 0 : userData.employmentCity,
                    state: userData === null || userData === void 0 ? void 0 : userData.employmentState,
                    country: userData === null || userData === void 0 ? void 0 : userData.employmentCountry,
                    startDate: userData === null || userData === void 0 ? void 0 : userData.employmentStartDate,
                    monthlyOrAnualIncome: userData === null || userData === void 0 ? void 0 : userData.monthlyOrAnualIncome,
                    childBenefit: userData === null || userData === void 0 ? void 0 : userData.childBenefit,
                    childMaintenance: userData === null || userData === void 0 ? void 0 : userData.childMaintenance,
                    disabilityBenefit: userData === null || userData === void 0 ? void 0 : userData.disabilityBenefit,
                    housingBenefit: userData === null || userData === void 0 ? void 0 : userData.housingBenefit,
                    others: userData === null || userData === void 0 ? void 0 : userData.others,
                    pension: userData === null || userData === void 0 ? void 0 : userData.pension,
                    moreDetails: userData === null || userData === void 0 ? void 0 : userData.moreDetails,
                    employerCompany: userData === null || userData === void 0 ? void 0 : userData.employerCompany,
                    employerEmail: userData === null || userData === void 0 ? void 0 : userData.employerEmail,
                    employerPhone: userData === null || userData === void 0 ? void 0 : userData.employerPhone,
                    positionTitle: userData === null || userData === void 0 ? void 0 : userData.positionTitle,
                    userId
                }),
                emergencyinfo_services_1.default.upsertEmergencyContact({
                    id: (userData === null || userData === void 0 ? void 0 : userData.emergencyInfoId) || null,
                    fullname: `${userData === null || userData === void 0 ? void 0 : userData.lastName} ${userData === null || userData === void 0 ? void 0 : userData.firstName}${(userData === null || userData === void 0 ? void 0 : userData.middleName) ? ' ' + userData.middleName : ''}`,
                    phoneNumber: userData === null || userData === void 0 ? void 0 : userData.emergencyPhoneNumber,
                    email: userData === null || userData === void 0 ? void 0 : userData.emergencyEmail,
                    address: userData === null || userData === void 0 ? void 0 : userData.emergencyAddress,
                    userId
                }),
                referees_services_1.default.upsertRefereeInfo({
                    id: (userData === null || userData === void 0 ? void 0 : userData.refereeId) || null,
                    professionalReferenceName: userData === null || userData === void 0 ? void 0 : userData.refereeProfessionalReferenceName,
                    personalReferenceName: userData === null || userData === void 0 ? void 0 : userData.refereePersonalReferenceName,
                    personalEmail: userData === null || userData === void 0 ? void 0 : userData.refereePersonalEmail,
                    professionalEmail: userData === null || userData === void 0 ? void 0 : userData.refereeProfessionalEmail,
                    personalPhoneNumber: userData === null || userData === void 0 ? void 0 : userData.refereePersonalPhoneNumber,
                    professionalPhoneNumber: userData === null || userData === void 0 ? void 0 : userData.refereeProfessionalPhoneNumber,
                    personalRelationship: userData === null || userData === void 0 ? void 0 : userData.refereePersonalRelationship,
                    professionalRelationship: userData === null || userData === void 0 ? void 0 : userData.refereeProfessionalRelationship,
                    userId
                })
            ]);
            // 3. Next of Kin (dependent on personalDetails)
            yield nextkin_services_1.default.upsertNextOfKinInfo({
                lastName: userData === null || userData === void 0 ? void 0 : userData.nextOfKinLastName,
                firstName: userData === null || userData === void 0 ? void 0 : userData.nextOfKinFirstName,
                relationship: userData === null || userData === void 0 ? void 0 : userData.relationship,
                phoneNumber: userData === null || userData === void 0 ? void 0 : userData.nextOfKinPhoneNumber,
                email: userData === null || userData === void 0 ? void 0 : userData.nextOfKinEmail,
                middleName: userData === null || userData === void 0 ? void 0 : userData.nextOfKinMiddleName,
                applicantPersonalDetailsId: personalDetails.id,
                userId
            });
            // 4. Create application
            const application = yield __1.prismaClient.application.create({
                data: {
                    status: client_1.ApplicationStatus.COMPLETED,
                    userId,
                    residentialId: null,
                    emergencyContactId: emergencyInfo.id,
                    employmentInformationId: employmentInfo.id,
                    guarantorInformationId: guarantorInfo ? guarantorInfo.id : null,
                    applicantPersonalDetailsId: personalDetails.id,
                    refereeId: refreeInfo.id,
                    createdById: createdBy
                }
            });
            // 5. Application questions
            yield __1.prismaClient.applicationQuestions.create({
                data: {
                    havePet: userData.havePet,
                    youSmoke: userData.youSmoke,
                    requireParking: userData.requireParking,
                    haveOutstandingDebts: userData.haveOutstandingDebts,
                    applicantId: application.id
                }
            });
            return application;
        });
        this.updateUserBasedOnRole = (userData, user, role) => __awaiter(this, void 0, void 0, function* () {
            switch (role) {
                case client_1.userRoles.LANDLORD: {
                    const landlordCode = yield this.generateUniqueLandlordCode();
                    return yield __1.prismaClient.landlords.create({
                        data: {
                            landlordCode,
                            userId: user.id,
                        },
                    });
                }
                case client_1.userRoles.VENDOR:
                    return yield __1.prismaClient.vendors.create({
                        data: {
                            userId: user.id,
                        },
                    });
                case client_1.userRoles.TENANT: {
                    const landlord = yield __1.prismaClient.landlords.findUnique({
                        where: { id: userData.landlordId },
                    });
                    if (!landlord)
                        throw new Error('Landlord not found');
                    const property = yield __1.prismaClient.properties.findUnique({
                        where: { id: userData.propertyId },
                    });
                    if (!property)
                        throw new Error('Property not found');
                    const tenantCode = yield this.generateUniqueTenantCode(landlord.landlordCode);
                    const tenant = yield __1.prismaClient.tenants.create({
                        data: {
                            tenantCode,
                            user: {
                                connect: { id: user.id },
                            },
                            landlord: {
                                connect: { id: landlord.id },
                            },
                            property: {
                                connect: { id: property.id },
                            },
                            initialDeposit: userData.initialDeposit || 0,
                            tenantWebUserEmail: userData.tenantWebUserEmail,
                            leaseStartDate: (userData === null || userData === void 0 ? void 0 : userData.leaseStartDate) ? new Date(userData.leaseStartDate) : new Date(),
                            leaseEndDate: (userData === null || userData === void 0 ? void 0 : userData.leaseEndDate) ? new Date(userData.leaseEndDate) : undefined,
                            application: userData.applicationId
                                ? {
                                    connect: { id: userData.applicationId },
                                }
                                : undefined,
                        },
                    });
                    if (tenant) {
                        // Check if the role already exists else update
                        yield this.updateUserRole(user.id, client_1.userRoles.TENANT);
                    }
                    return tenant;
                }
                default:
                    throw new Error(`Unsupported role: ${role}`);
            }
        });
        this.tenantExistsForLandlord = (landlordId, userId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.users.findFirst({
                where: {
                    tenant: {
                        userId,
                        landlordId: landlordId,
                    },
                },
                include: {
                    tenant: true,
                    profile: true
                }
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
        this.updateUserRole = (userId, role) => __awaiter(this, void 0, void 0, function* () {
            const user = yield __1.prismaClient.users.findUnique({ where: { id: userId } });
            if (!user)
                throw new Error('User not found');
            const updatedRoles = user.role.includes(role) ? user.role : [...user.role, role];
            return yield __1.prismaClient.users.update({
                where: { id: userId },
                data: { role: updatedRoles },
            });
        });
        this.inclusion = {
            tenant: true,
            landlords: true,
            vendors: true,
            profile: true
        };
    }
}
exports.default = new UserService();
