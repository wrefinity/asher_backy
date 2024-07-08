import { prismaClient } from "..";
import { generateUniqueToken } from "../utils/generateToken"
import loggers from "../utils/loggers";


const DEFAULT_EXPIRATION_DAYS = 1; // Default expiration in days

export async function createVerificationToken(userId: number): Promise<string> {
    try {
        // Generate a unique token
        const token = generateUniqueToken();

        // Calculate expiration time
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + DEFAULT_EXPIRATION_DAYS);

        // Save verification token in database with expiration time
        const verificationToken = await prismaClient.verificationToken.create({
            data: {
                token,
                userId,
                expiresAt: expirationDate,
            },
        });
        return verificationToken.token;
    } catch (error) {
        throw new Error("Failed to create verification token");
    }
}

export async function validateVerificationToken(token: string, userId:number): Promise<boolean> {
    try {
        const verificationToken = await prismaClient.verificationToken.findFirst({
            where: {
                userId,
                token,
                expiresAt: {
                    gte: new Date(),
                },
            },
        });

        return !!verificationToken; // Return true if token exists and is valid
    } catch (error) {
        loggers.info(`Error validating verification token: - ${error}`);
        throw new Error('Failed to validate verification token');
    }
}
export async function deleteVerificationToken(tokenId: number) {
    return await prismaClient.verificationToken.delete({
        where: { id: tokenId },
    });
}
export async function getTokensByUserId(userId: number, token:string) {
    try {
        const tokens = await prismaClient.verificationToken.findFirst({
            where: { 
                userId,
                token,
            },
        });

        if (tokens) {
            return tokens;
        } else {
            throw new Error(`No verification tokens found for userId: ${userId}`);
        }
    } catch (error) {
        console.error(error);
        throw new Error('Error retrieving verification tokens');
    }
}
