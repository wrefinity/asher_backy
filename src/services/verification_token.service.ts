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

    const normalizedEmail = identifier.email?.trim().toLowerCase() || null;

    // Save token in DB
    const verificationToken = await prismaClient.verificationToken.create({
      data: {
        token,
        userId: identifier.userId ?? null,
        email: normalizedEmail,
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

function buildIdentifierConditions(identifier: {
  userId?: string;
  email?: string;
}) {
  const conditions = [];
  if (identifier.userId) {
    conditions.push({ userId: identifier.userId });
  }
  if (identifier.email) {
    conditions.push({ email: identifier.email.trim().toLowerCase() });
  }
  return conditions;
}

/**
 * Validate a verification token by userId and/or email
 */
export async function validateVerificationToken(
  token: string,
  identifier: { userId?: string; email?: string },
  isUsed: boolean = false
) {
  try {
    const orConditions = buildIdentifierConditions(identifier);
    if (orConditions.length === 0) {
      throw ApiError.validationError(
        ["Either userId or email must be provided to validate a token"]
      );
    }

    const verificationToken = await prismaClient.verificationToken.findFirst({
      where: {
        token: String(token).trim(),
        OR: orConditions,
        expiresAt: {
          gte: new Date(),
        },
        isUsed,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!verificationToken) {
      throw ApiError.notFound("Verification token not found or expired");
    }

    return verificationToken;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    loggers.error(`Error validating verification token: ${error}`);
    throw ApiError.internal("Failed to validate verification token", error);
  }
}

export async function deleteUnusedVerificationTokensForUser(
  userId: string
): Promise<void> {
  await prismaClient.verificationToken.deleteMany({
    where: { userId, isUsed: false },
  });
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
