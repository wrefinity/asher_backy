import { generateCodeVerifier, generateState } from "arctic"
import {GOOGLE_PROFILE} from "../secrets"
import { googleOAuthClient } from "../configs/googleOauth"


export class GoogleService {
    state = generateState()
    codeVerifier = generateCodeVerifier()
    constructor() { }

    async getGoogleOauthConsentUrl() {
        try {
            const authUrl = await googleOAuthClient.createAuthorizationURL(this.state, this.codeVerifier, {
                scopes: ['email', 'profile']
            })
            return authUrl.toString()
        } catch (error) {
            return { error: "Something went wrong" }
        }
    }

    async getAccessToken(code: string) {
        const { accessToken } = await googleOAuthClient.validateAuthorizationCode(code, this.codeVerifier)
        return accessToken
    }

    async getUserProfile(accessToken: string) {
        try {
            const googleRes = await fetch(GOOGLE_PROFILE, {
                headers: {
                    "Authorization": `Bearer ${accessToken}`
                }
            })
            return googleRes.json()
        } catch (error) {
            return { error: "Something went wrong" }
        }
    }
}