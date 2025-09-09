export interface ApiErrorData {
  errors?: string[];
  details?: any;
  code?: string;
}

export class ApiError extends Error {
  statusCode: number;
  data: ApiErrorData;
  success: boolean;

  constructor(statusCode: number, message: string, data?: ApiErrorData) {
    super(message);
    this.statusCode = statusCode;
    this.data = data || {};
    this.success = false;

    // Normalize errors into an array
    if (this.data.errors && !Array.isArray(this.data.errors)) {
      this.data.errors = [this.data.errors];
    }
  }

  // Validation errors
  static validationError(errors: string[] | string, details?: any): ApiError {
    const errorArray = Array.isArray(errors) ? errors : [errors];
    return new ApiError(400, "Validation failed", {
      errors: errorArray,
      details,
      code: "VALIDATION_ERROR",
    });
  }

  // 🔹 Not found errors
  static notFound(message = "Resource not found", details?: any): ApiError {
    return new ApiError(404, message, {
      errors: [message],
      details,
      code: "NOT_FOUND",
    });
  }

  // 🔹 Unauthorized errors
  static unauthorized(message = "Unauthorized", details?: any): ApiError {
    return new ApiError(401, message, {
      errors: [message],
      details,
      code: "UNAUTHORIZED",
    });
  }

  // 🔹 Forbidden errors
  static forbidden(message = "Forbidden", details?: any): ApiError {
    return new ApiError(403, message, {
      errors: [message],
      details,
      code: "FORBIDDEN",
    });
  }

  // 🔹 Bad request errors
  static badRequest(message = "Bad request", details?: any): ApiError {
    return new ApiError(400, message, {
      errors: [message],
      details,
      code: "BAD_REQUEST",
    });
  }

  // 🔹 Conflict errors (e.g., unique constraint violations)
  static conflict(message = "Conflict", details?: any): ApiError {
    return new ApiError(409, message, {
      errors: [message],
      details,
      code: "CONFLICT",
    });
  }

  // 🔹 Prisma-related errors
  static prismaError(code: string, message: string, details?: any): ApiError {
    return new ApiError(500, message, {
      errors: [message],
      details,
      code,
    });
  }

  // 🔹 Internal server error
  static internal(message = "Internal server error", details?: any): ApiError {
    return new ApiError(500, message, {
      errors: [message],
      details,
      code: "INTERNAL_ERROR",
    });
  }
}
