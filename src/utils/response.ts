export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
  }
  
  export const successResponse = <T>(data: T, message = 'Success'): ApiResponse<T> => ({
    success: true,
    message,
    data,
  });
  
  export const errorResponse = (message: string, error?: string): ApiResponse<null> => ({
    success: false,
    message,
    error,
  });