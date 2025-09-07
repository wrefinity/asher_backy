export interface ApiResponseData<T> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    pages?: number;
  };
}

export class ApiResponse<T> {
  success: boolean;
  message: string;
  data: ApiResponseData<T>;
  timestamp: Date;

  constructor(statusCode: number, data: T, message: string = 'Success', meta?: any) {
    this.success = statusCode < 400;
    this.message = message;
    this.data = { data, meta };
    this.timestamp = new Date();
  }

  // Helper method for success responses
  static success<T>(data: T, message: string = 'Success', meta?: any): ApiResponse<T> {
    return new ApiResponse(200, data, message, meta);
  }

  // Helper method for created responses
  static created<T>(data: T, message: string = 'Created successfully'): ApiResponse<T> {
    return new ApiResponse(201, data, message);
  }

  // Helper method for paginated responses
  static paginated<T>(data: T, meta: any, message: string = 'Data retrieved successfully'): ApiResponse<T> {
    return new ApiResponse(200, data, message, meta);
  }
}