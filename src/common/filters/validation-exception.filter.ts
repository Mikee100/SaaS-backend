import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;

    // Log validation errors for debugging (even in production)
    // This helps identify validation issues without exposing them to clients
    if (status === 400) {
      // Extract validation error details (even when disabled for clients)
      let validationErrors: any = null;
      
      if (exceptionResponse) {
        // ValidationPipe errors can be in different formats:
        // 1. { message: ['error1', 'error2'] } - array of messages
        // 2. { message: [{ property: 'field', constraints: {...} }] } - detailed validation
        // 3. { message: 'string' } - simple message
        if (Array.isArray(exceptionResponse.message)) {
          validationErrors = exceptionResponse.message;
        } else if (exceptionResponse.message) {
          validationErrors = exceptionResponse.message;
        }
      }

      this.logger.error('Validation Error:', {
        path: request.url,
        method: request.method,
        body: request.body,
        error: exceptionResponse,
        validationErrors: validationErrors,
        message: exception.message,
      });

      // Log the full error details to console for immediate visibility
      console.error('❌ Validation Error Details:', {
        url: request.url,
        method: request.method,
        requestBody: JSON.stringify(request.body, null, 2),
        errorResponse: JSON.stringify(exceptionResponse, null, 2),
        validationErrors: validationErrors ? JSON.stringify(validationErrors, null, 2) : 'No validation errors found',
        errorMessage: exception.message,
        exceptionStack: exception.stack,
      });
    }

    // Return generic error to client (security: don't expose validation details)
    response.status(status).json({
      statusCode: status,
      message: 'Bad Request',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
