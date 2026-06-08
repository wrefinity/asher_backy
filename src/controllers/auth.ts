import { compareSync } from "bcrypt";
import { Request, Response } from "express";
import { prismaClient } from "..";

import { Jtoken } from "../middlewares/Jtoken";
import { GOOGLE_CLIENT_ID, JWT_SECRET } from "../secrets";
import UserServices from "../services/user.services";
import {
    createVerificationToken,
    deleteVerificationToken,
    deleteUnusedVerificationTokensForUser,
    updateTokenToUsed,
    validateVerificationToken,
} from "../services/verification_token.service";
import generateEmailTemplate from "../templates/email";
import generatePasswordResetEmailTemplate from "../templates/passwordResetEmail";
import { FRONTEND_URL } from "../secrets";
import sendEmail from "../utils/emailer";
import { LogType, userRoles } from "@prisma/client";
import { generateOtp } from "../utils/helpers";
import { CustomRequest } from "../utils/types";
import logsServices from "../services/logs.services";
import { onlineStatus } from "@prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import userServices from "../services/user.services";
import logger from "../utils/loggers";
import oauth2Client from "../configs/oauth.config";
import { calculateAgeFromDob } from "../services/tenantOnboarding.service";
import LoginSessionService from "../services/loginSession.service";

class AuthControls {
    protected tokenService: Jtoken;

    constructor() {
        this.tokenService = new Jtoken(JWT_SECRET);
    }

    private verificationTokenCreator = async (identifier: {
        userId?: string;
        email?: string;
    }) => {
        const token = await createVerificationToken(identifier, generateOtp);
        if (identifier.email) {
            await sendEmail(
                identifier.email,
                "EMAIL VERIFICATION",
                generateEmailTemplate(token)
            );
        }
    };

    private passwordResetTokenCreator = async (identifier: {
        userId: string;
        email: string;
    }) => {
        const token = await createVerificationToken(identifier, generateOtp);
        const resetUrl = `${FRONTEND_URL}/reset-password?email=${encodeURIComponent(identifier.email)}`;
        try {
            await sendEmail(
                identifier.email,
                "Reset your Asher password",
                generatePasswordResetEmailTemplate(token, resetUrl)
            );
        } catch (error) {
            logger.error("Failed to send password reset email:", error);
            throw ApiError.internal(
                "Could not send password reset email. Please try again shortly."
            );
        }
    };

    register = asyncHandler(async (req: Request, res: Response) => {
        const phoneDigits = String(req.body.phoneNumber || req.body.phone || "")
            .replace(/\D/g, "");

        const userData = {
            ...req.body,
            email: String(req.body.email || "").trim().toLowerCase(),
            firstName: req.body.firstName?.trim(),
            lastName: req.body.lastName?.trim(),
            phoneNumber: phoneDigits || undefined,
            role: req.body.role || userRoles.WEBUSER,
        };
        delete userData.phone;

        const { email } = userData;

        const existingUser = await UserServices.findUserByEmail(email);
        if (existingUser) {
            throw ApiError.validationError(["User already exists"]);
        }

        const newUser = await UserServices.createUser(userData);
        await this.verificationTokenCreator({ userId: newUser.id, email });

        return res
            .status(201)
            .json(
                ApiResponse.created(
                    newUser,
                    "User registered successfully, check your email for verification code"
                )
            );
    });
    registerVendor = asyncHandler(async (req: CustomRequest, res: Response) => {
        const data = { ...req.body };

        const existingUser = await userServices.findUserByEmail(data.email);
        if (existingUser) {
            throw ApiError.validationError(["User already exists"]);
        }

        // main profile pic
        const profileUrl = req.body.cloudinaryUrls?.[0] || null;
        // uploaded docs
        const documents = req.body.uploadedDocuments || [];

        // remove unwanted
        delete data.cloudinaryUrls;
        delete data.cloudinaryVideoUrls;
        delete data.cloudinaryDocumentUrls;
        delete data.cloudinaryAudioUrls;
        delete data.uploadedDocuments;
        delete data.id;

        // nest profile info correctly
        const vendor = await userServices.registerVendor({
            email: data.email,
            password: data.password,
            profile: {
                ...data.profile,
                profileUrl
            },
            uploadedDocuments: documents
        });

        return res
            .status(201)
            .json(ApiResponse.created(vendor, "Vendor registered successfully"));
    });

    sendToken = asyncHandler(async (req: Request, res: Response) => {
        const { email } = req.body;
        if (!email) {
            throw ApiError.validationError(["Email is required"]);
        }

        const user = await UserServices.findUserByEmail(email);
        if (user) {
            throw ApiError.validationError(["User already exists"]);
        }

        await this.verificationTokenCreator({ email });

        return res
            .status(201)
            .json(
                ApiResponse.success(
                    {},
                    "Verification code sent, check your email."
                )
            );
    });

    confirmation = asyncHandler(async (req: Request, res: Response) => {
        const email = String(req.body.email || "").trim().toLowerCase();
        const token = String(req.body.token || "").trim();

        const user = await UserServices.findUserByEmail(email);
        if (!user) throw ApiError.notFound("User not found");

        let verificationRecord;
        try {
            verificationRecord = await validateVerificationToken(token, {
                userId: user.id,
                email,
            });
        } catch {
            throw ApiError.validationError(["Invalid or expired verification code"]);
        }

        const updatedUser = await UserServices.updateUserVerificationStatus(
            user.id,
            true
        );

        await deleteVerificationToken(verificationRecord.id);

        const { password, ...userWithoutPassword } = updatedUser;

        return res
            .status(200)
            .json(ApiResponse.success(userWithoutPassword, "User verified successfully"));
    });

    genericConfirmation = asyncHandler(async (req: Request, res: Response) => {
        const { email, token } = req.body;
        if (!email || !token) throw ApiError.validationError(["Email and token are required"]);

        const isValidToken = await validateVerificationToken(token, { email });
        if (!isValidToken) throw ApiError.validationError(["Invalid or expired token"]);

        await updateTokenToUsed(isValidToken.id);
        return res
            .status(200)
            .json(ApiResponse.success({ email, token }, "token validated"));
    });

    sendPasswordResetCode = asyncHandler(async (req: CustomRequest, res: Response) => {
        const { email } = req.body;
        if (!email) throw ApiError.validationError(["Email is required"]);

        const normalizedEmail = email.trim().toLowerCase();
        const user = await UserServices.findUserByEmail(normalizedEmail);
        if (!user) throw ApiError.notFound("User does not exist");

        await deleteUnusedVerificationTokensForUser(user.id);
        await this.passwordResetTokenCreator({
            userId: user.id,
            email: normalizedEmail,
        });

        return res
            .status(201)
            .json(ApiResponse.success({}, "Password reset code sent to email"));
    });

    resendVerificationCode = asyncHandler(async (req: Request, res: Response) => {
        const email = String(req.body.email || "").trim().toLowerCase();
        if (!email) throw ApiError.validationError(["Email is required"]);

        const user = await UserServices.findUserByEmail(email);
        if (!user) throw ApiError.notFound("User not found");

        if (user.isVerified) {
            throw ApiError.validationError(["Account is already verified"]);
        }

        await deleteUnusedVerificationTokensForUser(user.id);
        await this.verificationTokenCreator({ userId: user.id, email });

        return res
            .status(201)
            .json(
                ApiResponse.success({}, "Verification code sent to your email")
            );
    });

    passwordReset = asyncHandler(async (req: Request, res: Response) => {
        const { email, tenantCode, newPassword, token } = req.body;
        let user = null;
        let isValidToken = null
        if (email) user = await UserServices.findUserByEmail(email);
        if (!user && tenantCode) user = await UserServices.findUserByTenantCode(tenantCode);

        if (!user) throw ApiError.notFound("User does not exist");

        if (email) {
            isValidToken = await validateVerificationToken(
                token,
                { userId: user.id, email },
                false
            );
            if (!isValidToken) {
                throw ApiError.validationError(["Invalid or expired reset code"]);
            }
        }

        await UserServices.updateUserPassword(user.id, newPassword);
        await logsServices.createLog({
            events: "Password Reset",
            type: LogType.ACTIVITY,
            createdById: user.id,
        });
        if (isValidToken) {
            await deleteVerificationToken(isValidToken.id);
        }
        return res
            .status(200)
            .json(ApiResponse.success({}, "Password updated successfully"));
    });

    refreshToken = asyncHandler(async (req: Request, res: Response) => {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            throw ApiError.validationError(["Refresh token is required"]);
        }

        const tokens = await this.tokenService.verifyAndRefreshToken(refreshToken);
        if (!tokens) throw ApiError.unauthorized("Invalid or expired refresh token");

        return res.status(200).json(ApiResponse.success(tokens, "Token refreshed successfully"));
    });

    private recordLoginSession = async (
        user: { id: string; email?: string | null },
        accessToken: string,
        req: Request
    ) => {
        try {
            await LoginSessionService.recordLogin({
                userId: user.id,
                accessToken,
                req,
                userEmail: user.email,
            });
        } catch (error) {
            logger.error('Failed to record login session:', error);
        }
    };

    private buildTenantLoginPayload = async (user: any, tenantCode: string, req?: Request) => {
        const activeTenant = await prismaClient.tenants.findUnique({
            where: { tenantCode },
            include: { property: { select: { id: true, name: true, address: true } } },
        });
        if (!activeTenant) throw ApiError.notFound("Tenant record not found");

        await UserServices.updateOnlineStatus(user.id, onlineStatus.online);
        const tokens = await this.tokenService.createToken({
            id: user.id,
            role: String(user.role),
            email: String(user.email),
            tenantCode,
            tenantId: activeTenant.id,
        });

        const { password, ...userDetails } = user;
        const tenantsArray = Array.isArray(user.tenants) ? user.tenants : [];

        if (req) {
            await this.recordLoginSession(user, tokens.accessToken, req);
        }

        return {
            token: tokens.accessToken,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            userDetails: {
                ...userDetails,
                id: user.id,
                onlineStatus: onlineStatus.online,
                tenants: tenantsArray,
                currentTenant: activeTenant,
            },
        };
    };

    validateTenant = asyncHandler(async (req: Request, res: Response) => {
        const { tenantCode } = req.body;
        const user = await UserServices.findUserByTenantCode(tenantCode);
        if (!user) throw ApiError.notFound("Invalid tenant code");

        const normalizedCode = tenantCode.trim();
        const tenant = user.tenants?.find(
            (t: any) =>
                t.tenantCode?.toLowerCase() === normalizedCode.toLowerCase() ||
                t.tenantId === normalizedCode
        );
        if (!tenant) throw ApiError.notFound("Tenant record not found");

        const property = tenant.property;
        const dob = user.profile?.dateOfBirth;

        return res.status(200).json(
            ApiResponse.success(
                {
                    fullname:
                        user.profile?.fullname ||
                        [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" "),
                    age: calculateAgeFromDob(dob),
                    property: property?.name || property?.address || "Your property",
                    hasPassword: Boolean(user.password),
                },
                "Tenant validated successfully"
            )
        );
    });

    setTenantPassword = asyncHandler(async (req: Request, res: Response) => {
        const { tenantCode, password } = req.body;
        const user = await UserServices.findUserByTenantCode(tenantCode);
        if (!user) throw ApiError.notFound("Invalid tenant code");

        if (user.password) {
            throw ApiError.validationError(["Password already set. Please log in with your tenant ID and password."]);
        }

        await UserServices.updateUserInfo(user.id, { password, isVerified: true });
        const refreshedUser = await UserServices.findUserByTenantCode(tenantCode);
        const payload = await this.buildTenantLoginPayload(refreshedUser, tenantCode, req);

        await logsServices.createLog({
            events: `Tenant ${tenantCode} completed mobile password setup`,
            type: LogType.ACTIVITY,
            createdById: user.id,
        });

        return res.status(200).json(
            ApiResponse.success(payload, "Password set successfully")
        );
    });

    login = asyncHandler(async (req: Request, res: Response) => {

        const { email, tenantCode, password: userPassword } = req.body;
        let user = null;

        if (!email && !tenantCode) {
            throw ApiError.validationError(["Email or tenant code is required"]);
        }

        const normalizedEmail = email?.trim().toLowerCase();
        if (normalizedEmail) user = await UserServices.findUserByEmail(normalizedEmail);
        if (!user && tenantCode) user = await UserServices.findUserByTenantCode(tenantCode);
        if (!user) throw ApiError.notFound("User does not exist");

        if (!user.password || !compareSync(userPassword, user.password)) {
            throw ApiError.validationError(["Invalid login credentials"]);
        }

        if (!user.isVerified) {
            await this.verificationTokenCreator({ userId: user.id, email: user.email });
            throw ApiError.unauthorized("Account not verified, verification code sent to email");
        }

        if (tenantCode && !email) {
            const payload = await this.buildTenantLoginPayload(user, tenantCode, req);
            return res.status(200).json(
                ApiResponse.success(payload, "Tenant logged in successfully")
            );
        }

        await UserServices.updateOnlineStatus(user.id, onlineStatus.online);
        const tokens = await this.tokenService.createToken({
            id: user.id,
            role: String(user.role),
            email: String(user.email),
        });

        await this.recordLoginSession(user, tokens.accessToken, req);

        await logsServices.createLog({
            events: `User ${user.email} logged in`,
            type: LogType.ACTIVITY,
            createdById: user.id,
        });

        const { password, ...userDetails } = user;
        return res.status(200).json(
            ApiResponse.success(
                {
                    token: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    userDetails: { ...userDetails, id: user.id, onlineStatus: onlineStatus.online },
                },
                "User logged in successfully"
            )
        );
    });

    updatePassword = asyncHandler(async (req: CustomRequest, res: Response) => {
        // Validate request body

        const { oldPassword, newPassword } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            throw ApiError.unauthorized('User not authenticated');
        }

        // Update password
        const result = await UserServices.updatePasswordWithOldPassword(
            userId,
            oldPassword,
            newPassword
        );

        // Log the activity
        await logsServices.createLog({
            events: 'Password updated via profile',
            type: LogType.ACTIVITY,
            createdById: userId,
        });

        return res.status(200).json(
            ApiResponse.success({}, result.message)
        );
    });

    /**
 * Google login using ID token
*/
    verifyGoogleToken = async (req: Request, res: Response) => {

        const { code } = req.body;
        if (!code) {
            return res.status(400).send("Missing authorization code");
        }
        try {
            // Exchange authorization code for tokens
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);
            const tokenId = tokens.id_token;

            if (!tokenId) {
                throw ApiError.unauthorized("Failed to get token from Google during code exchange");
            }

            const ticket = await oauth2Client.verifyIdToken({
                idToken: tokenId,
                audience: GOOGLE_CLIENT_ID,
            });

            const payload = ticket.getPayload();
            const { email, name, picture, id: googleId, given_name, family_name } = payload as any;
            if (!email) throw ApiError.unauthorized("Invalid Google token: missing email");


            let user: any = await userServices.findUserByEmail(email);
            if (!user) {
                user = await userServices.createUserWithProfile(
                    { email, googleId, isVerified: true },
                    { profileUrl: picture, fullname: name, lastName: family_name, firstName: given_name }
                );

            }
            user = await userServices.findUserByEmail(email);
            await UserServices.updateOnlineStatus(user.id, onlineStatus.online);
            const JWtokens = await this.tokenService.createToken({
                id: user.id,
                role: String(user.role),
                email: String(user.email),
            });

            await this.recordLoginSession(user, JWtokens.accessToken, req);

            const { password, ...userDetails } = user;
            return res.status(200).json(
                ApiResponse.success(
                    {
                        token: JWtokens.accessToken,
                        refreshToken: JWtokens.refreshToken,
                        userDetails: { ...userDetails, id: user.id, onlineStatus: onlineStatus.online },
                    },
                    "User logged in successfully"
                )
            );
        } catch (error: any) {
            logger.error("Google auth error:", error);
            return res.status(error.statusCode || 400).json(
                ApiError.badRequest(error.message || "Google authentication failed")
            );
        }
    }

    logout = asyncHandler(async (req: CustomRequest, res: Response) => {
        const userId = req.user?.id;

        if (userId) {
            await LoginSessionService.revokeCurrentSession(req);

            // Update user's online status to offline
            await UserServices.updateOnlineStatus(userId, onlineStatus.offline);

            // Log the logout activity
            await logsServices.createLog({
                events: `User logged out`,
                type: LogType.ACTIVITY,
                createdById: userId,
            });
        }

        return res.status(200).json(
            ApiResponse.success({}, "User logged out successfully")
        );
    });

    listLoginSessions = asyncHandler(async (req: CustomRequest, res: Response) => {
        const userId = req.user?.id;
        if (!userId) throw ApiError.unauthorized('User not authenticated');

        const authHeader = req.headers.authorization;
        const token =
            typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
                ? authHeader.slice(7).trim()
                : null;

        await LoginSessionService.ensureSessionFromRequest(req, {
            touchActivity: true,
        });

        const sessions = await LoginSessionService.listSessions(userId, token);
        return res.status(200).json(ApiResponse.success({ sessions }, 'Login sessions retrieved'));
    });

    revokeLoginSession = asyncHandler(async (req: CustomRequest, res: Response) => {
        const userId = req.user?.id;
        const { sessionId } = req.params;
        if (!userId) throw ApiError.unauthorized('User not authenticated');

        const revoked = await LoginSessionService.revokeSession(userId, sessionId);
        if (!revoked) throw ApiError.notFound('Session not found');

        return res.status(200).json(ApiResponse.success({}, 'Session revoked'));
    });

    revokeOtherLoginSessions = asyncHandler(async (req: CustomRequest, res: Response) => {
        const userId = req.user?.id;
        if (!userId) throw ApiError.unauthorized('User not authenticated');

        const authHeader = req.headers.authorization;
        const token =
            typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
                ? authHeader.slice(7).trim()
                : null;
        if (!token) throw ApiError.validationError(['Missing bearer token']);

        await LoginSessionService.revokeOtherSessions(userId, token);
        return res.status(200).json(ApiResponse.success({}, 'Other sessions revoked'));
    });
}

export default new AuthControls();