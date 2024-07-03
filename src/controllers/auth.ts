import { Request, Response } from "express";
import { compareSync } from "bcrypt";
// custom libs
import AuthServices from "../services/userServices";
import {createVerificationToken, validateVerificationToken} from "../services/verificationTokenService"
import { Jtoken } from "../middlewares/Jtoken";
import { JWT_SECRET } from "../secrets";



class AuthControls extends AuthServices {
    protected tokenService: Jtoken;
    constructor() {
        super()
        this.tokenService = new Jtoken(JWT_SECRET);
    }

    async register(req: Request, res: Response): Promise<void> {
        const { email, password, fullname } = req.body;

        try {
            let user = await this.findUserByEmail(email);
            if (user) res.status(400).json({ message: "user exists" });

            if(user && !user?.isVerified ){
                const token = await createVerificationToken(user.id);
                
                return
            }
            user = await this.createUser(email, password);
            // Create verification token
            const token = await createVerificationToken(user.id);

            if(!token){

            }
            
            //TODO: send token to email for verification
            res.status(201).json({ message: "User registered successfully, check your email for verification code", user });
        } catch (error: unknown) {
            if (error instanceof Error) {
                res.status(400).json({ message: error.message });
            } else {
                res.status(500).json({ message: "An unknown error occurred" });
            }
        }

    }
    async verify(req: Request, res: Response): Promise<void> {
        const { email, token } = req.body;

        try {
            // Find user by email
            const user = await this.findUserByEmail(email);
            if (!user) {
                res.status(404).json({ message: 'User not found' });
                return;
            }

            // Validate verification token
            const isValidToken = await validateVerificationToken(token);
            if (!isValidToken) {
                res.status(400).json({ message: 'Invalid or expired token' });
                return;
            }

            // Update user's isVerified status to true
            const updatedUser = await this.updateUserVerificationStatus(user.id, true);
            res.status(200).json({ message: 'User verified successfully', user: updatedUser });
        } catch (error) {
            console.error('Error verifying user:', error);
            res.status(500).json({ message: 'Failed to verify user' });
        }
    }
    async login(req: Request, res: Response): Promise<void> {
        const { email, password } = req.body;

        try {
            let user = await this.findUserByEmail(email);
            if (!user) {
                res.status(400).json({ message: "User does not exist" });
                return;
            }

            if (!compareSync(password, user.password)) {
                res.status(400).json({ message: "Wrong login credentials" });
                return;
            }

            if(!user.isVerified){
                // TODO: resend token for account verification
            }

            const token = await this.tokenService.createToken({ userId: user.id});

            res.status(200).json({ message: "User logged in successfully", token, user });
        } catch (error: unknown) {
            if (error instanceof Error) {
                res.status(400).json({ message: error.message });
            } else {
                res.status(500).json({ message: "An unknown error occurred" });
            }
        }

    }

}

export default new AuthControls();
