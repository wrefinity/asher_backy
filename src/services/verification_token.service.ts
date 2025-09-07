import { prismaClient } from "..";
import loggers from "../utils/loggers";
import { ApiError } from "../utils/ApiError";

const DEFAULT_EXPIRATION_DAYS = 1; // Default expiration in days

export async function createVerificationToken(
  identifier: { userId?: string; email?: string },
  tokenGenerateFunc: () => string
): Promise<string> {
  try {
    if (!identifier.userId && !identifier.email) {
      throw ApiError.validationError(
        ["Either userId or email must be provided to create a verification token"]
      );
    }

    // Generate unique token
    const token = tokenGenerateFunc();

    // Calculate expiration time
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + DEFAULT_EXPIRATION_DAYS);

    // Save token in DB
    const verificationToken = await prismaClient.verificationToken.create({
      data: {
        token,
        userId: identifier.userId ?? null,
        email: identifier.email ?? null,
        expiresAt: expirationDate,
      },
    });

    return verificationToken.token;
  } catch (error: any) {

    if (error.code === "P2002") {
      // Prisma unique constraint error
      throw ApiError.conflict("Verification token already exists", error);
    }
    throw ApiError.internal("Failed to create verification token", error);
  }
}

/**
 * Validate a verification token by either userId or email
 */
export async function validateVerificationToken(
  token: string,
  identifier: { userId?: string; email?: string }
) {
  try {
    if (!identifier.userId && !identifier.email) {
      throw ApiError.validationError(
        ["Either userId or email must be provided to validate a token"]
      );
    }

    const verificationToken = await prismaClient.verificationToken.findFirst({
      where: {
        token,
        OR: [
          identifier.userId ? { userId: identifier.userId } : {},
          identifier.email ? { email: identifier.email } : {},
        ],
        expiresAt: {
          gte: new Date(), // Ensure token is not expired
        },
        isUsed: false, // Optional: only accept unused tokens
      },
    });

    if (!verificationToken) {
      throw ApiError.notFound("Verification token not found or expired");
    }

    return verificationToken;
  } catch (error) {
    loggers.error(`Error validating verification token: ${error}`);
    throw ApiError.internal("Failed to validate verification token", error);
  }
}

export async function deleteVerificationToken(tokenId: number) {
  try {
    return await prismaClient.verificationToken.delete({
      where: { id: tokenId },
    });
  } catch (error) {
    throw ApiError.internal("Failed to delete verification token", error);
  }
}
export async function updateTokenToUsed(id: number) {
  try {
    return await prismaClient.verificationToken.update({
      where: { id },
      data: { isUsed: true },
    });
  } catch (error) {
    throw ApiError.internal("Failed to update verification token", error);
  }
}

export async function getTokensByUserId(userId: string, token: string) {
  try {
    const tokens = await prismaClient.verificationToken.findFirst({
      where: {
        userId,
        token,
      },
    });

    if (!tokens) {
      throw ApiError.notFound(`No verification tokens found for userId: ${userId}`);
    }

    return tokens;
  } catch (error) {
    loggers.error(error);
    throw ApiError.internal("Error retrieving verification tokens", error);
  }
}
