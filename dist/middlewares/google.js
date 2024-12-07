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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleService = void 0;
const arctic_1 = require("arctic");
const secrets_1 = require("../secrets");
const googleOauth_1 = require("../configs/googleOauth");
class GoogleService {
    constructor() {
        this.state = (0, arctic_1.generateState)();
        this.codeVerifier = (0, arctic_1.generateCodeVerifier)();
    }
    getGoogleOauthConsentUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const authUrl = yield googleOauth_1.googleOAuthClient.createAuthorizationURL(this.state, this.codeVerifier, {
                    scopes: ['email', 'profile']
                });
                return authUrl.toString();
            }
            catch (error) {
                return { error: "Something went wrong" };
            }
        });
    }
    getAccessToken(code) {
        return __awaiter(this, void 0, void 0, function* () {
            const { accessToken } = yield googleOauth_1.googleOAuthClient.validateAuthorizationCode(code, this.codeVerifier);
            return accessToken;
        });
    }
    getUserProfile(accessToken) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const googleRes = yield fetch(secrets_1.GOOGLE_PROFILE, {
                    headers: {
                        "Authorization": `Bearer ${accessToken}`
                    }
                });
                return googleRes.json();
            }
            catch (error) {
                return { error: "Something went wrong" };
            }
        });
    }
}
exports.GoogleService = GoogleService;
