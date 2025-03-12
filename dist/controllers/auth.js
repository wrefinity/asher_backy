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
const bcrypt_1 = require("bcrypt");
// custom libs
const Jtoken_1 = require("../middlewares/Jtoken");
const secrets_1 = require("../secrets");
const user_services_1 = __importDefault(require("../services/user.services"));
const verification_token_service_1 = require("../services/verification_token.service");
// import { SignUpIF } from "../interfaces/authInt";
// import { GoogleService } from "../middlewares/google";
const email_1 = __importDefault(require("../templates/email"));
const emailer_1 = __importDefault(require("../utils/emailer"));
const client_1 = require("@prisma/client");
const helpers_1 = require("../utils/helpers");
const error_service_1 = __importDefault(require("../services/error.service"));
const auth_1 = require("../validations/schemas/auth");
const logs_services_1 = __importDefault(require("../services/logs.services"));
class AuthControls {
    // protected googleService: GoogleService;
    constructor() {
        this.verificationTokenCreator = (userId, email) => __awaiter(this, void 0, void 0, function* () {
            const token = yield (0, verification_token_service_1.createVerificationToken)(userId, helpers_1.generateOtp);
            (0, emailer_1.default)(email, "EMAIL VERIFICATION", (0, email_1.default)(token));
        });
        this.register = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { email } = req.body;
            try {
                let user = yield user_services_1.default.findUserByEmail(email);
                if (user)
                    return res.status(400).json({ message: "user exists" });
                let newUser = yield user_services_1.default.createUser(req.body);
                // Create verification token
                yield this.verificationTokenCreator(newUser.id, email);
                // const serializedUser = serializeBigInt(user);
                return res.status(201).json({ message: "User registered successfully, check your email for verification code", user: newUser });
            }
            catch (error) {
                if (error instanceof Error) {
                    console.log(error);
                    return res.status(400).json({ message: error });
                }
                else {
                    return res.status(500).json({ message: "An unknown error occurred" });
                }
            }
        });
        this.confirmation = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { email, token } = req.body;
            try {
                // Find user by email
                const user = yield user_services_1.default.findUserByEmail(email);
                if (!user) {
                    res.status(404).json({ message: 'User not found' });
                    return;
                }
                // Validate verification token
                const isValidToken = yield (0, verification_token_service_1.validateVerificationToken)(token, user.id);
                if (!isValidToken) {
                    res.status(400).json({ message: 'Invalid or expired token' });
                    return;
                }
                // Update user's isVerified status to true
                const updatedUser = yield user_services_1.default.updateUserVerificationStatus(user.id, true);
                const tokenRet = yield (0, verification_token_service_1.getTokensByUserId)(user.id, token);
                yield (0, verification_token_service_1.deleteVerificationToken)(Number(tokenRet.id));
                const userResponse = updatedUser;
                const { password } = userResponse, userWithoutId = __rest(userResponse, ["password"]);
                res.status(200).json({ message: 'User verified successfully', user: userWithoutId });
            }
            catch (error) {
                console.error('Error verifying user:', error);
                res.status(500).json({ message: error.message || 'Failed to verify user' });
            }
        });
        this.sendPasswordResetCode = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { email } = req.body;
            try {
                const user = yield user_services_1.default.findUserByEmail(email);
                if (!user)
                    res.status(400).json({ message: "user does exists" });
                // Ensure user is not null
                if (user && typeof user !== 'boolean' && 'id' in user) {
                    // Create verification token
                    yield this.verificationTokenCreator(user.id, email);
                }
                return res.status(201).json({ message: "password reset code sent, check your email for verification code" });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.passwordReset = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { email, tenantCode, newPassword, token } = req.body;
            try {
                // Ensure at least one identifier is provided
                if (!email && !tenantCode) {
                    return res.status(400).json({ message: "Email or tenant code is required." });
                }
                let user = null;
                // Find user by email if provided
                if (email) {
                    user = yield user_services_1.default.findUserByEmail(email);
                }
                // If user is not found via email and tenantCode is provided, find user by tenantCode
                if (!user && tenantCode) {
                    user = yield user_services_1.default.findUserByTenantCode(tenantCode);
                }
                if (!user) {
                    return res.status(404).json({ message: "User does not exist." });
                }
                // **Only validate the token if resetting via email**
                if (email) {
                    const isValidToken = yield (0, verification_token_service_1.validateVerificationToken)(token, user.id);
                    if (!isValidToken) {
                        return res.status(400).json({ message: "Invalid or expired token." });
                    }
                }
                // Update user's password
                yield user_services_1.default.updateUserPassword(user.id, newPassword);
                yield logs_services_1.default.createLog({
                    events: "Password Reset",
                    type: client_1.LogType.ACTIVITY,
                    createdById: user.id,
                });
                return res.status(200).json({ message: "Password updated successfully." });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.refreshToken = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { refreshToken } = req.body;
                if (!refreshToken) {
                    return res.status(400).json({ message: "Refresh token is required as refreshToken" });
                }
                // Verify token and get new tokens + user details
                const tokens = yield this.tokenService.verifyAndRefreshToken(refreshToken);
                if (!tokens) {
                    return res.status(401).json({ message: "Invalid or expired refresh token" });
                }
                res.json({
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    user: tokens.user, // Return user details
                });
            }
            catch (error) {
                console.error("Error refreshing token:", error);
                res.status(500).json({ message: "Internal server error" });
            }
        });
        this.login = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { error, value } = auth_1.LoginSchema.validate(req.body);
                if (error) {
                    return res.status(400).json({ error: error.details[0].message });
                }
                const { email, tenantCode, password: userPassword } = value;
                let user = null;
                // Handle scenario where only tenantCode is supplied
                if (tenantCode && !email && !userPassword) {
                    user = yield user_services_1.default.findUserByTenantCode(tenantCode);
                    if (!user) {
                        return res.status(404).json({ message: "No user found for the provided tenant code." });
                    }
                    // Exclude sensitive fields and return user details
                    const { password: _ } = user, userDetails = __rest(user, ["password"]);
                    const tokens = yield this.tokenService.createToken({ id: user.id, role: String(user.role), email: String(user.email) });
                    console.log(userDetails);
                    return res.status(200).json({
                        message: "Tenant-specific user retrieved successfully.",
                        userDetails: Object.assign(Object.assign({}, userDetails), { id: user.id }),
                        accessToken: tokens.accessToken,
                        refreshToken: tokens.refreshToken,
                    });
                }
                // Ensure at least one identifier is provided
                if (!email && !tenantCode) {
                    return res.status(400).json({ message: "Email or tenant code is required." });
                }
                // Find user by email or tenantCode
                if (email) {
                    user = yield user_services_1.default.findUserByEmail(email);
                }
                if (!user && tenantCode) {
                    user = yield user_services_1.default.findUserByTenantCode(tenantCode);
                }
                if (!user) {
                    return res.status(404).json({ message: "User does not exist." });
                }
                // Verify password
                if (!user.password || !(0, bcrypt_1.compareSync)(userPassword, user.password)) {
                    return res.status(400).json({ message: "Invalid login credentials." });
                }
                if (!user.isVerified) {
                    yield this.verificationTokenCreator(user.id, email);
                    return res.status(400).json({ message: "Account not verified, a verification code was sent to your email" });
                }
                const token = yield this.tokenService.createToken({ id: user.id, role: String(user.role), email: String(user.email) });
                yield logs_services_1.default.createLog({
                    events: `user ${user.email} logged in`,
                    type: client_1.LogType.ACTIVITY,
                    createdById: user.id,
                });
                // Exclude sensitive fields and return user details
                const { password: _ } = user, userDetails = __rest(user, ["password"]);
                return res.status(200).json({
                    message: "User logged in successfully.",
                    token: token.accessToken,
                    refreshToken: token.refreshToken,
                    userDetails: Object.assign(Object.assign({}, userDetails), { id: user.id }),
                });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.registerTenant = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { tenantId, password } = req.body;
                if (!tenantId && !password)
                    return res.status(500).json({ message: "No tenant Id or password found" });
                const otp = yield (0, verification_token_service_1.createVerificationToken)(tenantId, helpers_1.generateOtp);
                // send the email
                console.log(otp);
                return res.status(200).json({ message: "Email sent successfully" });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.tokenService = new Jtoken_1.Jtoken(secrets_1.JWT_SECRET);
        // this.googleService = new GoogleService()
    }
}
exports.default = new AuthControls();
