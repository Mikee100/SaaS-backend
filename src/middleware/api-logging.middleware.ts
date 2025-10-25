import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditLogService } from '../audit-log.service';

@Injectable()
export class ApiLoggingMiddleware implements NestMiddleware {
  constructor(private readonly auditLogService: AuditLogService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    // Skip logging for certain paths
    const skipPaths = [
      '/health',
      '/favicon.ico',
      '/api/health',
      '/api/status',
      '/api/usage/stats',
      '/api/usage/trial',
    ];

    if (skipPaths.some((path) => req.path.startsWith(path))) {
      return next();
    }

    // Get user info from request (assuming it's set by auth middleware)
    const user = (req as any).user;
    const userId = user?.id || null;

    // Get tenant info
    const tenantId =
      user?.tenantId || (req.headers['x-tenant-id'] as string) || null;

    // Get IP address
    const ip =
      req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      'unknown';

    // Get user agent
    const userAgent = (req.headers['user-agent'] as string) || 'unknown';

    // Log the API request
    try {
      await this.auditLogService.log(
        userId,
        'api_request',
        {
          method: req.method,
          path: req.path,
          query: req.query,
          body: this.sanitizeBody(req.body),
          userAgent,
          tenantId,
          timestamp: new Date().toISOString(),
        },
        ip,
      );
    } catch (error) {
      // Don't fail the request if logging fails
      console.error('Failed to log API request:', error);
    }

    // Log response time when response finishes
    res.on('finish', async () => {
      const duration = Date.now() - startTime;
      try {
        await this.auditLogService.log(
          userId,
          'api_response',
          {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            tenantId,
            timestamp: new Date().toISOString(),
          },
          ip,
        );
      } catch (error) {
        console.error('Failed to log API response:', error);
      }
    });

    next();
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sanitized = { ...body };

    // Remove sensitive fields
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'apiKey',
      'stripeToken',
    ];
    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
