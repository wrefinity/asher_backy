"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const loggers_1 = __importDefault(require("../utils/loggers"));
const client_1 = require("@prisma/client");
// Custom error classes
class BadRequestError extends Error {
    constructor(message) {
        super(message);
        this.statusCode = 400;
        this.name = "BadRequestError";
    }
}
class InternalServerError extends Error {
    constructor(message) {
        super(message);
        this.statusCode = 500;
        this.name = "InternalServerError";
    }
}
class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.statusCode = 404;
        this.name = "NotFoundError";
    }
}
class PrismaError extends Error {
    constructor(message, errorDetails) {
        super(message);
        this.statusCode = 500; // Default to Internal Server Error for database-related issues
        this.errorDetails = errorDetails;
        this.name = "PrismaError";
    }
}
class ErrorService {
    handleError(error, res) {
        console.log(error); // For debugging purposes
        // Handling custom error types
        if (error instanceof BadRequestError) {
            loggers_1.default.error("Bad Request Error", error);
            return res.status(error.statusCode).json({ message: error.message });
        }
        else if (error instanceof InternalServerError) {
            loggers_1.default.error("Internal Server Error", error);
            return res.status(error.statusCode).json({ message: error.message });
        }
        else if (error instanceof NotFoundError) {
            loggers_1.default.error("Not Found Error", error);
            return res.status(error.statusCode).json({ message: error.message });
        }
        // Catch Prisma-specific errors
        else if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            return this.handlePrismaError(error, res);
        }
        // Handle unexpected general errors
        else if (error instanceof Error) {
            loggers_1.default.error("An unexpected error occurred", error);
            return res.status(400).json({ message: error.message });
        }
        // Handle unknown errors
        else {
            loggers_1.default.error("An unknown error occurred", error);
            return res.status(500).json({ message: "An unknown error occurred" });
        }
    }
    handlePrismaError(error, res) {
        var _a, _b;
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
            details = `An operation failed because it depends on one or more records that were required but not found. ${(_a = error.meta) === null || _a === void 0 ? void 0 : _a.cause}`;
        }
        // Handle other specific Prisma error codes (e.g., P2002 for unique constraint violations)
        else if (error.code === "P2002") {
            message = "Unique constraint violation";
            details = `A record with this value already exists: ${(_b = error.meta) === null || _b === void 0 ? void 0 : _b.target}`;
        }
        // For other Prisma error codes or unexpected issues
        else {
            message = "An unexpected database error occurred";
            details = error.message;
        }
        // Log the error details for debugging purposes
        loggers_1.default.error("Prisma Error", { message, details, prismaCode: error.code });
        // Return a structured error response
        return res.status(500).json({
            message,
            details,
            prismaCode: error.code, // Include Prisma error code for more context
        });
    }
}
exports.default = new ErrorService();
