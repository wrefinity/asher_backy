import { compareSync } from "bcrypt";
import { Request, Response } from "express";

// custom libs
import { Jtoken } from "../middlewares/Jtoken";
import { JWT_SECRET } from "../secrets";
import AuthServices from "../services/userServices";
import {
    createVerificationToken,
    deleteVerificationToken,
    validateVerificationToken
} from "../services/verificationTokenService";
// import { SignUpIF } from "../interfaces/authInt";
import { GoogleService } from "../middlewares/google";
import generateEmailTemplate from "../templates/email";
import sendEmail from "../utils/emailer";
import logger from '../utils/loggers'



class AuthControls extends AuthServices {
    protected tokenService: Jtoken;
    protected googleService: GoogleService;
    constructor() {
        super()
        this.tokenService = new Jtoken(JWT_SECRET);
        this.googleService = new GoogleService()
    }

    protected async verificationTokenCreator(userId: number, email: string) {
        const token = await createVerificationToken(Number(userId));
        sendEmail(email, "EMAIL VERIFICATION", generateEmailTemplate(token));
    }


    async register(req: Request, res: Response): Promise<void> {
        const { email } = req.body;

        try {
            let user = await this.findUserByEmail(email);
            if (user) res.status(400).json({ message: "user exists" });

            user = await this.createUser(req.body);
            // Create verification token
            this.verificationTokenCreator(Number(user.id), email);

            res.status(201).json({ message: "User registered successfully, check your email for verification code", user });
        } catch (error: unknown) {
            if (error instanceof Error) {
                res.status(400).json({ message: error.message });
            } else {
                res.status(500).json({ message: "An unknown error occurred" });
            }
        }

    }


    async confirmation(req: Request, res: Response): Promise<void> {
        const { email, token } = req.body;

        try {
            // Find user by email
            const user = await this.findUserByEmail(email);
            if (!user) {
                res.status(404).json({ message: 'User not found' });
                return;
            }
            // Validate verification token
            const isValidToken = await validateVerificationToken(token, Number(user.id));
            if (!isValidToken) {
                res.status(400).json({ message: 'Invalid or expired token' });
                return;
            }
            // Update user's isVerified status to true
            const updatedUser = await this.updateUserVerificationStatus(Number(user.id), true);

            await deleteVerificationToken(Number(user.id))
            res.status(200).json({ message: 'User verified successfully', user: updatedUser });
        } catch (error) {
            console.error('Error verifying user:', error);
            res.status(500).json({ message: 'Failed to verify user' });
        }
    }


    async sendPasswordResetCode(req: Request, res: Response): Promise<void> {
        const { email } = req.body;
        try {
            let user = await this.findUserByEmail(email);
            if (user) res.status(400).json({ message: "user exists" });

            // Ensure user is not null
            if (user !== null && user !== undefined)
                // Create verification token
                await this.verificationTokenCreator(Number(user.id), email);

            res.status(201).json({ message: "password reset code sent, check your email for verification code" });
        } catch (error: unknown) {
            if (error instanceof Error) {
                res.status(400).json({ message: error.message });
            } else {
                res.status(500).json({ message: "An unknown error occurred" });
            }
        }
    }


    async passwordReset(req: Request, res: Response): Promise<void> {

        const { email, newPassword, token } = req.body;

        try {
            let user = await this.findUserByEmail(email);
            if (user) res.status(400).json({ message: "user exists" });

            // Validate verification token
            let isValidToken = null;
            if (user) {
                isValidToken = await validateVerificationToken(token, Number(user.id));
            }

            if (!isValidToken) {
                res.status(400).json({ message: 'Invalid or expired token' });
                return;
            }
            // Ensure user is not null
            if (user !== null && user !== undefined)
                // Update user's password
                await this.updateUserPassword(Number(user.id), newPassword);

            res.status(200).json({ message: 'Password Updated successfully' });

        } catch (error: unknown) {
            if (error instanceof Error) {
                res.status(400).json({ message: error.message });
            } else {
                res.status(500).json({ message: "An unknown error occurred" });
            }
        }
    }


    async login(req: Request, res: Response): Promise<void> {
        const { email } = req.body;

        try {
            let user = await this.findUserByEmail(email);
            if (!user) {
                res.status(400).json({ message: "User does not exist" });
                return;
            }

            if (!compareSync(req.body.password, user.password!)) {
                res.status(400).json({ message: "Invalid login credentials" });
                return;
            }

            if (!user.isVerified) {
                // Create verification token
                this.verificationTokenCreator(Number(user.id), email);
                res.status(400).json({ message: "Account not verified, a verification code was sent to your email" });
                return;
            }

            const token = await this.tokenService.createToken({ id: Number(user.id), role: String(user.role), email: String(user.email) });

            const { password, ...userDetails } = user;

            res.status(200).json({ message: "User logged in successfully", token, userDetails });
        } catch (error: unknown) {
            if (error instanceof Error) {
                res.status(400).json({ message: error.message });
            } else {
                res.status(500).json({ message: "An unknown error occurred" });
            }
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

        let user = await this.createGoogleUser(userProfile)
        if ("error" in user) {
            return res.status(400).json({ message: user.error })
        }
        console.log(user)

        const token = await this.tokenService.createToken({ id: Number(user.id), role: String(user.role), email: String(user.email) });
        return res.status(200).json({ access_token: token })

    }
}
export default new AuthControls();
