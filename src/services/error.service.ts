import { Response } from "express";
import loggers from "../utils/loggers";
import { Prisma } from "@prisma/client";

// Custom error classes
class BadRequestError extends Error {
    statusCode: number;
    constructor(message: string) {
        super(message);
        this.statusCode = 400;
        this.name = "BadRequestError";
    }
}

class InternalServerError extends Error {
    statusCode: number;
    constructor(message: string) {
        super(message);
        this.statusCode = 500;
        this.name = "InternalServerError";
    }
}

class NotFoundError extends Error {
    statusCode: number;
    constructor(message: string) {
        super(message);
        this.statusCode = 404;
        this.name = "NotFoundError";
    }
}

class PrismaError extends Error {
    statusCode: number;
    errorDetails: string;

    constructor(message: string, errorDetails: string) {
        super(message);
        this.statusCode = 500; // Default to Internal Server Error for database-related issues
        this.errorDetails = errorDetails;
        this.name = "PrismaError";
    }
}

class ErrorService {
    handleError(error: any, res: Response) {
        console.log(error); // For debugging purposes

        // Handling custom error types
        if (error instanceof BadRequestError) {
            loggers.error("Bad Request Error", error);
            return res.status(error.statusCode).json({ message: error.message });
        } else if (error instanceof InternalServerError) {
            loggers.error("Internal Server Error", error);
            return res.status(error.statusCode).json({ message: error.message });
        } else if (error instanceof NotFoundError) {
            loggers.error("Not Found Error", error);
            return res.status(error.statusCode).json({ message: error.message });
        }

        // Catch Prisma-specific errors
        else if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return this.handlePrismaError(error, res);
        }

        // Handle unexpected general errors
        else if (error instanceof Error) {
            loggers.error("An unexpected error occurred", error);
            return res.status(400).json({ message: error.message });
        }

        // Handle unknown errors
        else {
            loggers.error("An unknown error occurred", error);
            return res.status(500).json({ message: "An unknown error occurred" });
        }
    }

    private handlePrismaError(error: Prisma.PrismaClientKnownRequestError, res: Response) {
        let message = "An unknown database error occurred";
        let details = error.message;

        // Handle specific Prisma error codes like P2003 (foreign key constraint violation)
        if (error.code === "P2003") {
            message = "Foreign key constraint violation";
            details = `An operation failed because it depends on one or more records that were required but not found. ${error.message}`;
        }

        // Handle the new P2025 error (related record not found)
        else if (error.code === "P2025") {
            message = "Missing related record";
            details = `An operation failed because it depends on one or more records that were required but not found. ${error.meta?.cause}`;
        }

        // Handle other specific Prisma error codes (e.g., P2002 for unique constraint violations)
        else if (error.code === "P2002") {
            message = "Unique constraint violation";
            details = `A record with this value already exists: ${error.meta?.target}`;
        }

        // For other Prisma error codes or unexpected issues
        else {
            message = "An unexpected database error occurred";
            details = error.message;
        }

        // Log the error details for debugging purposes
        loggers.error("Prisma Error", { message, details, prismaCode: error.code });

        // Return a structured error response
        return res.status(500).json({
            message,
            details,
            prismaCode: error.code, // Include Prisma error code for more context
        });
    }
}

export default new ErrorService();
