import { Google } from 'arctic';
import {GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, PUBLIC_URL } from "../secrets"
export const googleOAuthClient = new Google(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    PUBLIC_URL + 'auth/google/callback'
)

