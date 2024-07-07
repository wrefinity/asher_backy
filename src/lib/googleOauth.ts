import { Google } from 'arctic';

export const googleOAuthClient = new Google(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.PUBLIC_URL + 'auth/google/callback'
)

// console.log(googleOAuthClient)