import { compareSync } from "bcrypt";
import { Request, Response } from "express";

// custom libs
import { Jtoken } from "../middlewares/Jtoken";
import { JWT_SECRET } from "../secrets";
import UserServices from "../services/user.services";
import {
    createVerificationToken,
    deleteVerificationToken,
    getTokensByUserId,
    validateVerificationToken
} from "../services/verification_token.service";
import generateEmailTemplate from "../templates/email";
import sendEmail from "../utils/emailer";
import { LogType, Prisma } from "@prisma/client"
import { generateOtp } from "../utils/helpers";
import ErrorService from "../services/error.service";
import { LoginSchema, ConfirmationSchema, RegisterSchema } from "../validations/schemas/auth";
import { CustomRequest } from "../utils/types";
import logsServices from "../services/logs.services";

import { onlineStatus } from '@prisma/client'

class AuthControls {
    protected tokenService: Jtoken;
    // protected googleService: GoogleService;
    constructor() {
        this.tokenService = new Jtoken(JWT_SECRET);
        // this.googleService = new GoogleService()
    }

    verificationTokenCreator = async (userId: string, email: string) => {
        const token = await createVerificationToken(userId, generateOtp);
        sendEmail(email, "EMAIL VERIFICATION", generateEmailTemplate(token));
    }

    register = async (req: Request, res: Response) => {

        try {
            const { error, value } = ConfirmationSchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    message: 'Validation failed',
                    errors: error.details.map(d => d.message)
                });
            }
            const { email } = value;

            let user = await UserServices.findUserByEmail(email);
            if (user) return res.status(400).json({ message: "user exists" });

            let newUser = await UserServices.createUser(value);
            // Create verification token
            await this.verificationTokenCreator(newUser.id, email);

            // const serializedUser = serializeBigInt(user);
            return res.status(201).json({ message: "User registered successfully, check your email for verification code", user: newUser });

        } catch (error: unknown) {
            if (error instanceof Error) {
                console.log(error)
                return res.status(400).json({ message: error });
            } else {
                return res.status(500).json({ message: "An unknown error occurred" });
            }
        }

    }

    confirmation = async (req: Request, res: Response) => {
        try {

            const { error, value } = ConfirmationSchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    message: 'Validation failed',
                    errors: error.details.map(d => d.message)
                });
            }

            const { email, token } = value;
            // Find user by email
            const user = await UserServices.findUserByEmail(email);
            if (!user) {
                res.status(404).json({ message: 'User not found' });
                return;
            }
            // Validate verification token
            const isValidToken = await validateVerificationToken(token, user.id);
            if (!isValidToken) {
                return res.status(400).json({ message: 'Invalid or expired token' });
            }
            // Update user's isVerified status to true
            const updatedUser = await UserServices.updateUserVerificationStatus(user.id, true);

            const tokenRet = await getTokensByUserId(user.id, token)
            await deleteVerificationToken(Number(tokenRet.id));

            const userResponse = updatedUser;

            const { password, ...userWithoutId } = userResponse;

            res.status(200).json({ message: 'User verified successfully', user: userWithoutId });
        } catch (error) {
            console.error('Error verifying user:', error);
            res.status(500).json({ message: error.message || 'Failed to verify user' });
        }
    }

    sendPasswordResetCode = async (req: CustomRequest, res: Response) => {
        const { email } = req.body;

        // Convert email to lowercase
        const normalizedEmail = email.toLowerCase();

        try {
            const user = await UserServices.findUserByEmail(normalizedEmail);
            if (!user) {
                return res.status(400).json({ message: "User does not exist" });
            }

            // Ensure user is not null
            if (user && typeof user !== 'boolean' && 'id' in user) {
                // Create verification token with normalized email
                await this.verificationTokenCreator(user.id, normalizedEmail);
            }

            return res.status(201).json({
                message: "Password reset code sent, check your email for verification code"
            });
        } catch (error: unknown) {
            ErrorService.handleError(error, res);
        }
    }

    passwordReset = async (req: Request, res: Response) => {
        const { email, tenantCode, newPassword, token } = req.body;

        try {
            // Ensure at least one identifier is provided
            if (!email && !tenantCode) {
                return res.status(400).json({ message: "Email or tenant code is required." });
            }

            let user = null;

            // Find user by email if provided
            if (email) {
                user = await UserServices.findUserByEmail(email);
            }

            // If user is not found via email and tenantCode is provided, find user by tenantCode
            if (!user && tenantCode) {
                user = await UserServices.findUserByTenantCode(tenantCode);
            }

            if (!user) {
                return res.status(404).json({ message: "User does not exist." });
            }

            // **Only validate the token if resetting via email**
            if (email) {
                const isValidToken = await validateVerificationToken(token, user.id);
                if (!isValidToken) {
                    return res.status(400).json({ message: "Invalid or expired token." });
                }
            }

            // Update user's password

            await UserServices.updateUserPassword(user.id, newPassword);
            await logsServices.createLog({
                events: "Password Reset",
                type: LogType.ACTIVITY,
                createdById: user.id,
            });
            return res.status(200).json({ message: "Password updated successfully." });

        } catch (error) {
            ErrorService.handleError(error, res);
        }
    };

    refreshToken = async (req: Request, res: Response) => {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(400).json({ message: "Refresh token is required as refreshToken" });
            }

            // Verify token and get new tokens + user details
            const tokens = await this.tokenService.verifyAndRefreshToken(refreshToken);

            if (!tokens) {
                return res.status(401).json({ message: "Invalid or expired refresh token" });
            }

            res.json({
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                user: tokens.user, // Return user details
            });
        } catch (error) {
            console.error("Error refreshing token:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }

    login = async (req: Request, res: Response) => {

        try {
            const { error, value } = LoginSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ error: error.details[0].message });
            }
            const { email, tenantCode, password: userPassword } = value;

            let user = null;
            // Handle scenario where only tenantCode is supplied
            if (tenantCode && !email && !userPassword) {
                user = await UserServices.findUserByTenantCode(tenantCode);

                if (!user) {
                    return res.status(404).json({ message: "No user found for the provided tenant code." });
                }

                // Exclude sensitive fields and return user details
                const { password: _, ...userDetails } = user;
                // Update online status before creating tokens
                await UserServices.updateOnlineStatus(user.id, onlineStatus.online);
                const tokens = await this.tokenService.createToken({ id: user.id, role: String(user.role), email: String(user.email) });

                return res.status(200).json({
                    message: "Tenant-specific user retrieved successfully.",
                    userDetails: { ...userDetails, id: user.id, onlineStatus: onlineStatus.online },
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
                user = await UserServices.findUserByEmail(email);
            }
            if (!user && tenantCode) {
                user = await UserServices.findUserByTenantCode(tenantCode);
            }
            if (!user) {
                return res.status(404).json({ message: "User does not exist." });
            }
            // Verify password
            if (!user.password || !compareSync(userPassword, user.password)) {
                return res.status(400).json({ message: "Invalid login credentials." });
            }

            if (!user.isVerified) {
                await this.verificationTokenCreator(user.id, email);
                return res.status(400).json({ message: "Account not verified, a verification code was sent to your email" });
            }

            // Update online status before creating tokens
            await UserServices.updateOnlineStatus(user.id, onlineStatus.online);

            const token = await this.tokenService.createToken({ id: user.id, role: String(user.role), email: String(user.email) });
            await logsServices.createLog({
                events: `user ${user.email} logged in`,
                type: LogType.ACTIVITY,
                createdById: user.id,
            });
            // Exclude sensitive fields and return user details
            const { password: _, ...userDetails } = user;
            return res.status(200).json({
                message: "User logged in successfully.",
                token: token.accessToken,
                refreshToken: token.refreshToken,
                userDetails: { ...userDetails, id: user.id, onlineStatus: onlineStatus.online },
            });
        } catch (error: unknown) {
            ErrorService.handleError(error, res)
        }

    }

    registerTenant = async (req: Request, res: Response) => {
        try {
            const { tenantId, password } = req.body

            if (!tenantId && !password) return res.status(500).json({ message: "No tenant Id or password found" })

            const otp = await createVerificationToken(tenantId, generateOtp)

            // send the email
            console.log(otp)

            return res.status(200).json({ message: "Email sent successfully" })
        } catch (error) {
            ErrorService.handleError(error, res)
        }

    }
}
export default new AuthControls();
