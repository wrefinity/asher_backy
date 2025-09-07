import { Request, Response, NextFunction } from "express";
import { ApiError } from "./ApiError";
import { Prisma } from "@prisma/client";

export const asyncHandler =
  (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      // Log the error for debugging
      console.error("AsyncHandler Error:", error);

      // If it's already an ApiError, pass it along
      if (error instanceof ApiError) {
        return next(error);
      }

      /**
       * 🔹 Prisma Errors
       */
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // https://www.prisma.io/docs/orm/reference/error-reference#error-codes
        switch (error.code) {
          case "P2002": {
            // Unique constraint failed
            const target = (error.meta?.target as string[])?.join(", ") || "field";
            return next(
              ApiError.validationError(
                [`Unique constraint failed on ${target}`],
                error.meta
              )
            );
          }
          case "P2003": {
            // Foreign key constraint failed
            return next(
              ApiError.validationError(
                ["Foreign key constraint failed"],
                error.meta
              )
            );
          }
          case "P2025": {
            // Record not found
            return next(ApiError.notFound("Record not found", error.meta));
          }
          default: {
            return next(
              ApiError.internal("Database request error", {
                code: error.code,
                meta: error.meta,
              })
            );
          }
        }
      }

      if (error instanceof Prisma.PrismaClientValidationError) {
        return next(
          ApiError.validationError(["Prisma validation error"], error.message)
        );
      }

      if (error instanceof Prisma.PrismaClientRustPanicError) {
        return next(ApiError.internal("Prisma Rust Panic", error.message));
      }

      if (error instanceof Prisma.PrismaClientInitializationError) {
        return next(ApiError.internal("Prisma Initialization Error", error.message));
      }

      if (error instanceof Prisma.PrismaClientUnknownRequestError) {
        return next(ApiError.internal("Prisma Unknown Request Error", error.message));
      }

      /**
       * 🔹 Mongoose Errors
       */
      if (error.name === "ValidationError") {
        const errors = Object.values(error.errors).map((err: any) => err.message);
        return next(ApiError.validationError(errors, error));
      }

      if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        const message = `${field} already exists`;
        return next(ApiError.validationError([message], error));
      }

      if (error.name === "CastError") {
        const message = `Invalid ${error.path}: ${error.value}`;
        return next(ApiError.validationError([message], error));
      }

      /**
       * 🔹 JWT Errors
       */
      if (error.name === "JsonWebTokenError") {
        return next(ApiError.unauthorized("Invalid token"));
      }

      if (error.name === "TokenExpiredError") {
        return next(ApiError.unauthorized("Token expired"));
      }

      /**
       * Default
       */
      next(ApiError.internal("Something went wrong", error));
    });
  };
