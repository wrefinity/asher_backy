import jwt from "jsonwebtoken";
import { JWTPayload } from "../utils/types";

export class Jtoken {
    private secret: string;

    constructor(secret: string) {
        this.secret = secret;
    }

    /**
     * Generates a new JWT access token.
     * @param payload - The payload containing user details.
     * @returns A promise that resolves to a signed JWT token.
     */
    async createToken(payload: JWTPayload): Promise<{ accessToken: string; refreshToken: string }> {
        return new Promise((resolve, reject) => {
            // Generate access token (expires in 2 days)
            jwt.sign(payload, this.secret, { expiresIn: "1h" }, (err, accessToken) => {
                if (err) {
                    reject(err);
                } else {
                    // Generate refresh token (expires in 7 days)
                    jwt.sign(payload, this.secret, { expiresIn: "7d" }, (err, refreshToken) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve({
                                accessToken: accessToken as string,
                                refreshToken: refreshToken as string,
                            });
                        }
                    });
                }
            });
        });
    }

    /**
     * Decodes and verifies a given JWT token.
     * @param token - The JWT token to be decoded.
     * @returns A promise resolving to the decoded payload or null if verification fails.
     */
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

    /**
     * Verifies and refreshes a given refresh token.
     * @param refreshToken - The refresh token to verify.
     * @returns A new access and refresh token pair, or null if verification fails.
     */
    async verifyAndRefreshToken(refreshToken: string) {
        try {
            const decoded = jwt.verify(refreshToken, this.secret) as JWTPayload;

            // Generate a new access token (valid for 2 days)
            const newAccessToken = jwt.sign(
                { id: decoded.id, role: decoded.role },
                this.secret,
                { expiresIn: "2d" }
            );

            // Generate a new refresh token (valid for 7 days)
            const newRefreshToken = jwt.sign(
                { id: decoded.id, role: decoded.role },
                this.secret,
                { expiresIn: "7d" }
            );

            return { accessToken: newAccessToken, refreshToken: newRefreshToken };
        } catch (error) {
            console.error("Error verifying refresh token:", error);
            return null;
        }
    }
}
