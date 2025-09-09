import { compareSync } from "bcrypt";
import { Request, Response } from "express";

import { Jtoken } from "../middlewares/Jtoken";
import { JWT_SECRET } from "../secrets";
import UserServices from "../services/user.services";
import {
    createVerificationToken,
    deleteVerificationToken,
    getTokensByUserId,
    updateTokenToUsed,
    validateVerificationToken,
} from "../services/verification_token.service";
import generateEmailTemplate from "../templates/email";
import sendEmail from "../utils/emailer";
import { LogType } from "@prisma/client";
import { generateOtp } from "../utils/helpers";
import { CustomRequest } from "../utils/types";
import logsServices from "../services/logs.services";
import { onlineStatus } from "@prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import userServices from "../services/user.services";

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

    register = asyncHandler(async (req: Request, res: Response) => {
        const { email } = req.body;

        const existingUser = await UserServices.findUserByEmail(email);
        if (existingUser) {
            throw ApiError.validationError(["User already exists"]);
        }

        const newUser = await UserServices.createUser(req.body);
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
        const { email, token } = req.body;

        const user = await UserServices.findUserByEmail(email);
        if (!user) throw ApiError.notFound("User not found");

        const isValidToken = await validateVerificationToken(token, { userId: user.id });
        if (!isValidToken) throw ApiError.validationError(["Invalid or expired token"]);

        const updatedUser = await UserServices.updateUserVerificationStatus(
            user.id,
            true
        );

        const tokenRet = await getTokensByUserId(user.id, token);
        await deleteVerificationToken(Number(tokenRet.id));

        const { password, ...userWithoutPassword } = updatedUser;

        return res
            .status(200)
            .json(ApiResponse.success(userWithoutPassword, "User verified successfully"));
    });

    genericConfirmation = asyncHandler(async (req: Request, res: Response) => {
        const { email, token } = req.body;
        if (!email || !token) throw ApiError.validationError(["Email and token are required"]);

        const isValidToken = await validateVerificationToken(token, { email });
        console.log(isValidToken)
        if (!isValidToken) throw ApiError.validationError(["Invalid or expired token"]);
        
        await updateTokenToUsed(isValidToken.id);
        return res
            .status(200)
            .json(ApiResponse.success({ email, token }, "token validated"));
    });

    sendPasswordResetCode = asyncHandler(async (req: CustomRequest, res: Response) => {
        const { email } = req.body;
        if (!email) throw ApiError.validationError(["Email is required"]);

        const normalizedEmail = email.toLowerCase();
        const user = await UserServices.findUserByEmail(normalizedEmail);
        if (!user) throw ApiError.notFound("User does not exist");

        await this.verificationTokenCreator({
            userId: user.id,
            email: normalizedEmail,
        });

        return res
            .status(201)
            .json(ApiResponse.success({}, "Password reset code sent to email"));
    });

    passwordReset = asyncHandler(async (req: Request, res: Response) => {
        const { email, tenantCode, newPassword, token } = req.body;

        if (!email && !tenantCode) {
            throw ApiError.validationError(["Email or tenant code is required"]);
        }

        let user = null;
        if (email) user = await UserServices.findUserByEmail(email);
        if (!user && tenantCode) user = await UserServices.findUserByTenantCode(tenantCode);

        if (!user) throw ApiError.notFound("User does not exist");

        if (email) {
            const isValidToken = await validateVerificationToken(token, user.id);
            if (!isValidToken) throw ApiError.validationError(["Invalid or expired token"]);
        }

        await UserServices.updateUserPassword(user.id, newPassword);
        await logsServices.createLog({
            events: "Password Reset",
            type: LogType.ACTIVITY,
            createdById: user.id,
        });

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

    login = asyncHandler(async (req: Request, res: Response) => {

        const { email, tenantCode, password: userPassword } = req.body;
        let user = null;

        // tenantCode only login
        if (tenantCode && !email && !userPassword) {
            user = await UserServices.findUserByTenantCode(tenantCode);
            if (!user) throw ApiError.notFound("No user found for the provided tenant code");

            await UserServices.updateOnlineStatus(user.id, onlineStatus.online);
            const tokens = await this.tokenService.createToken({
                id: user.id,
                role: String(user.role),
                email: String(user.email),
            });

            const { password, ...userDetails } = user;
            return res.status(200).json(
                ApiResponse.success(
                    {
                        userDetails: { ...userDetails, id: user.id, onlineStatus: onlineStatus.online },
                        ...tokens,
                    },
                    "Tenant-specific user retrieved successfully"
                )
            );
        }

        if (!email && !tenantCode) {
            throw ApiError.validationError(["Email or tenant code is required"]);
        }

        if (email) user = await UserServices.findUserByEmail(email);
        if (!user && tenantCode) user = await UserServices.findUserByTenantCode(tenantCode);
        if (!user) throw ApiError.notFound("User does not exist");

        if (!user.password || !compareSync(userPassword, user.password)) {
            throw ApiError.validationError(["Invalid login credentials"]);
        }

        if (!user.isVerified) {
            await this.verificationTokenCreator({ userId: user.id, email });
            throw ApiError.unauthorized("Account not verified, verification code sent to email");
        }

        await UserServices.updateOnlineStatus(user.id, onlineStatus.online);
        const tokens = await this.tokenService.createToken({
            id: user.id,
            role: String(user.role),
            email: String(user.email),
        });

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

    registerTenant = asyncHandler(async (req: Request, res: Response) => {
        const { tenantId, password } = req.body;
        if (!tenantId || !password) {
            throw ApiError.validationError(["Tenant ID and password are required"]);
        }

        const otp = await createVerificationToken({ userId: tenantId }, generateOtp);
        console.log(otp);

        return res
            .status(200)
            .json(ApiResponse.success({}, "Tenant verification email sent successfully"));
    });
}

export default new AuthControls();