import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

type BadRequestPayload =
  | string
  | {
      message?: unknown;
      [key: string]: unknown;
    };

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // If a previous handler already wrote the response, avoid writing again.
    if (response.headersSent) {
      this.logger.warn(
        `Skipping ValidationExceptionFilter response because headers were already sent for ${request.method} ${request.url}`,
      );
      return;
    }

    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as BadRequestPayload;

    // Log validation errors for debugging (even in production)
    // This helps identify validation issues without exposing them to clients
    if (status === 400) {
      // Extract validation error details (even when disabled for clients)
      let validationErrors: unknown = null;

      const responseMessage =
        typeof exceptionResponse === 'object' && exceptionResponse !== null
          ? exceptionResponse.message
          : undefined;

      if (exceptionResponse) {
        // ValidationPipe errors can be in different formats:
        // 1. { message: ['error1', 'error2'] } - array of messages
        // 2. { message: [{ property: 'field', constraints: {...} }] } - detailed validation
        // 3. { message: 'string' } - simple message
        if (Array.isArray(responseMessage)) {
          validationErrors = responseMessage;
        } else if (responseMessage) {
          validationErrors = responseMessage;
        }
      }

      const requestBody: unknown = request.body as unknown;

      this.logger.error('Validation Error:', {
        path: request.url,
        method: request.method,
        body: requestBody,
        error: exceptionResponse,
        validationErrors: validationErrors,
        message: exception.message,
      });

      // Log the full error details to console for immediate visibility
      console.error('❌ Validation Error Details:', {
        url: request.url,
        method: request.method,
        requestBody: JSON.stringify(requestBody, null, 2),
        errorResponse: JSON.stringify(exceptionResponse, null, 2),
        validationErrors: validationErrors
          ? JSON.stringify(validationErrors, null, 2)
          : 'No validation errors found',
        errorMessage: exception.message,
        exceptionStack: exception.stack,
      });
    }

    // Return error to client: pass through single-string messages (e.g. "Product not found")
    // so the POS can show them; sanitize validation-style responses (arrays/constraint objects)
    const responseMessage =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? exceptionResponse.message
        : undefined;
    const isValidationError =
      responseMessage &&
      (Array.isArray(responseMessage) ||
        (typeof responseMessage === 'object' &&
          !Array.isArray(responseMessage) &&
          responseMessage !== null));
    const messageToSend =
      !isValidationError &&
      responseMessage &&
      typeof responseMessage === 'string'
        ? responseMessage
        : 'Bad Request';

    response.status(status).json({
      statusCode: status,
      message: messageToSend,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
