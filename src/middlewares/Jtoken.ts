import jwt from "jsonwebtoken";
import { JWTPayload } from "../utils/types";

export class Jtoken {

    private secret: string;

    constructor(secret: string) {
        this.secret = secret;
    }

    async createToken(payload: JWTPayload): Promise<string> {
        return new Promise((resolve, reject) => {
            jwt.sign(payload, this.secret, { expiresIn: "1h" }, (err, token) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(token as string);
                }
            });
        });
    }
    async decodeToken(token: string): Promise<JWTPayload | null> {
        return new Promise((resolve, reject) => {
            jwt.verify(token, this.secret, (err, decoded) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(decoded as JWTPayload);
                }
            });
        });
    }
}
