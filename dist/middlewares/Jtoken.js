"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Jtoken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_services_1 = __importDefault(require("../services/user.services"));
class Jtoken {
    constructor(secret) {
        this.secret = secret;
    }
    /**
     * Generates a new JWT access token.
     * @param payload - The payload containing user details.
     * @returns A promise that resolves to a signed JWT token.
     */
    createToken(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                // Generate access token (expires in 2 days)
                jsonwebtoken_1.default.sign(payload, this.secret, { expiresIn: "1d" }, (err, accessToken) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        // Generate refresh token (expires in 7 days)
                        jsonwebtoken_1.default.sign(payload, this.secret, { expiresIn: "7d" }, (err, refreshToken) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                resolve({
                                    accessToken: accessToken,
                                    refreshToken: refreshToken,
                                });
                            }
                        });
                    }
                });
            });
        });
    }
    /**
     * Decodes and verifies a given JWT token.
     * @param token - The JWT token to be decoded.
     * @returns A promise resolving to the decoded payload or null if verification fails.
     */
    decodeToken(token) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                jsonwebtoken_1.default.verify(token, this.secret, (err, decoded) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(decoded);
                    }
                });
            });
        });
    }
    /**
     * Verifies and refreshes a given refresh token.
     * @param refreshToken - The refresh token to verify.
     * @returns A new access and refresh token pair, or null if verification fails.
     */
    verifyAndRefreshToken(refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const decoded = jsonwebtoken_1.default.verify(refreshToken, this.secret);
                // Fetch user from database using decoded ID
                const userDetails = yield user_services_1.default.findAUserById(decoded.id);
                if (!userDetails) {
                    return null;
                }
                // Exclude sensitive fields and return user details
                const { password: _ } = userDetails, user = __rest(userDetails, ["password"]);
                // Generate a new access token (valid for 1 hour)
                const newAccessToken = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, this.secret, { expiresIn: "1d" });
                // Generate a new refresh token (valid for 7 days)
                const newRefreshToken = jsonwebtoken_1.default.sign({ id: user.id, role: user.role, }, this.secret, { expiresIn: "7d" });
                return { accessToken: newAccessToken, refreshToken: newRefreshToken, user };
            }
            catch (error) {
                console.error("Error verifying refresh token:", error);
                return null;
            }
        });
    }
}
exports.Jtoken = Jtoken;
