import { Response, NextFunction } from "express";
import { JWT_SECRET } from "../secrets";
import { CustomRequest } from "../utils/types";
import { Jtoken } from "./Jtoken";
import UserService from "../services/userServices";

export class Authorize {
    protected tokenService: Jtoken;
    constructor() {
        // super()
        this.tokenService = new Jtoken(JWT_SECRET)
        this.authorize = this.authorize.bind(this);
    }

    async authorize(req: CustomRequest, res: Response, next: NextFunction) {
        let token: string | undefined;

        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({ message: "Not authorized, token failed" });
        }

        try {
            const decoded = await this.tokenService.decodeToken(token);

            if (!decoded) {
                return res.status(401).json({ message: "Not authorized, invalid token" });
            }

            const user = await UserService.findAUserById(String(decoded.id));

            if (!user) {
                return res.status(401).json({ message: "Not authorized, user not found" });
            }

            req.user = decoded;
            next();
        } catch (error) {
            console.error('Authorization error:', error);
            return res.status(401).json({ message: "Not authorized, token failed" });
        }
    }

    async authorizeRole(role: string) {
        return (req: CustomRequest, res: Response, next: NextFunction) => {
            if (req.user && req.user.role === role) return next()
            res.status(401).json({ message: `You are not authorized as a ${role}` })
        }
    }

    async logoutUser(req: CustomRequest, res: Response) {
        req.headers.authorization = "";
        return res.status(200).json({ message: "Logged out successfuly" })
    }
}