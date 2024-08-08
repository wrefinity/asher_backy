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
// import { SignUpIF } from "../interfaces/authInt";
import { GoogleService } from "../middlewares/google";
import generateEmailTemplate from "../templates/email";
import sendEmail from "../utils/emailer";
import logger from '../utils/loggers';
import { generateOtp } from "../utils/helpers";
import ErrorService from "../services/error.service";
import { LoginSchema } from "../validations/schemas/auth";

class AuthControls {
    protected tokenService: Jtoken;
    protected googleService: GoogleService;
    constructor() {
        this.tokenService = new Jtoken(JWT_SECRET);
        this.googleService = new GoogleService()
    }

    verificationTokenCreator = async (userId: string, email: string) => {
        const token = await createVerificationToken(userId, generateOtp);
        sendEmail(email, "EMAIL VERIFICATION", generateEmailTemplate(token));
    }

    register = async (req: Request, res: Response) => {
        const { email } = req.body;

        try {
            let user = await UserServices.findUserByEmail(email);
            if (user) return res.status(400).json({ message: "user exists" });

            user = await UserServices.createUser(req.body);
            // Create verification token
            await this.verificationTokenCreator(user.id, email);


            // Convert BigInt to string before sending the response
            // const userResponse = String(user);

            //TODO: ADD THE USER BASED OF HIS ROLE TO THEIR TABLE


            // const serializedUser = serializeBigInt(user);
            return res.status(201).json({ message: "User registered successfully, check your email for verification code", user });

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
        const { email, token } = req.body;

        try {
            // Find user by email
            const user = await UserServices.findUserByEmail(email);
            if (!user) {
                res.status(404).json({ message: 'User not found' });
                return;
            }
            // Validate verification token
            const isValidToken = await validateVerificationToken(token, user.id);
            if (!isValidToken) {
                res.status(400).json({ message: 'Invalid or expired token' });
                return;
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
            res.status(500).json({ message: 'Failed to verify user' });
        }
    }

    sendPasswordResetCode = async (req: Request, res: Response) => {
        const { email } = req.body;
        try {
            let user = await UserServices.findUserByEmail(email);
            if (user) res.status(400).json({ message: "user exists" });

            // Ensure user is not null
            if (user !== null && user !== undefined) {
                // Create verification token
                await this.verificationTokenCreator(user.id, email);

            }
            return res.status(201).json({ message: "password reset code sent, check your email for verification code" });
        } catch (error: unknown) {
            ErrorService.handleError(error, res)
        }
    }


    passwordReset = async (req: Request, res: Response) => {

        const { email, newPassword, token } = req.body;

        try {
            let user = await UserServices.findUserByEmail(email);
            if (user) return res.status(400).json({ message: "user exists" });

            // Validate verification token
            let isValidToken = null;
            if (user) {
                isValidToken = await validateVerificationToken(token, user.id);
            }

            if (!isValidToken) {
                res.status(400).json({ message: 'Invalid or expired token' });
                return;
            }
            // Ensure user is not null
            if (user !== null && user !== undefined)
                // Update user's password
                await UserServices.updateUserPassword(user.id, newPassword);

            return res.status(200).json({ message: 'Password Updated successfully' });

        } catch (error: unknown) {
            ErrorService.handleError(error, res)
        }
    }


    login = async (req: Request, res: Response) => {
        const { email } = req.body;

        try {
            const { error } = LoginSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ error: error.details[0].message });
            }

            let user = await UserServices.findUserByEmail(email);
            if (!user) {
                return res.status(400).json({ message: "User does not exist" });
            }

            if (!compareSync(req.body.password, user.password!)) {
                return res.status(400).json({ message: "Invalid login credentials" });
            }

            if (!user.isVerified) {
                // Create verification token
                await this.verificationTokenCreator(user.id, email);
                return res.status(400).json({ message: "Account not verified, a verification code was sent to your email" });
            }

            const token = await this.tokenService.createToken({ id: user.id, role: String(user.role), email: String(user.email) });

            const { password, id, ...userDetails } = user;
            return res.status(200).json({ message: "User logged in successfully", token, userDetails });
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

    //I need access to the this keyword that's why i chnaged it to arrow function
    sendGoogleUrl = async (req: Request, res: Response) => {
        try {
            // logger.info("Initialize send Google Url control", this.googleService);
            const googleUrl = await this.googleService.getGoogleOauthConsentUrl();
            return res.status(200).json(googleUrl);
        } catch (error) {
            logger.error("Error in sendGoogleUrl:", error);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }


    githubLogin = async (req: Request, res: Response) => {

        const redirect_url = new URL(`${req.protocol}://${req.get('host')}${req.originalUrl}`);
        console.log(redirect_url)
        if (!redirect_url) return res.status(400).json({ message: "Redirect Url not provided" })
        const code = redirect_url.searchParams.get("code")
        const state = redirect_url.searchParams.get("state")

        if (!code || !state) {
            console.log("No code or state")
            return res.status(400).json({ message: "Invalid Request" })
        }

        if (state.toString().toLowerCase() !== this.googleService.state.toString().toLowerCase()) {
            console.log("state and code verifier dont match")
            return res.status(400).json({ message: "Invalid Request" })
        }

        const accessToken = await this.googleService.getAccessToken(code)

        if (!accessToken) {
            console.log("No access token")
            return res.status(400).json({ message: "Invalid Request" })
        }

        const userProfile = await this.googleService.getUserProfile(accessToken)

        if (!userProfile) {
            console.log("No user profile")
            return res.status(400).json({ message: "Invalid Request" })
        }

        let user = await UserServices.createGoogleUser(userProfile)
        if ("error" in user) {
            return res.status(400).json({ message: user.error })
        }
        console.log(user)

        const token = await this.tokenService.createToken({ id: user.id, role: String(user.role), email: String(user.email) });
        return res.status(200).json({ access_token: token })

    }
}
export default new AuthControls();
