import { Request, Response } from "express";

import { Jtoken } from "../../middlewares/Jtoken";
import { createVerificationToken } from "../../services/verificationTokenService";
import { generateOtp } from "../../utils/helpers";
import AuthControls from "../../controllers/auth";
import ErrorService from "../../services/error.service";

class TenantAuthController {

    register = async (req: Request, res: Response) => {
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


    verifyOTP = async (req: Request, res: Response) => {
        try {
            AuthControls.confirmation(req, res)
        } catch (error) {
            ErrorService.handleError(error, res)

        }
    }

    login = async (req: Request, res: Response) => {
        try {
            AuthControls.login(req, res, generateOtp)
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }


}