import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditLogService } from '../audit-log.service';

interface AuthUser {
  id?: string;
  userId?: string;
  tenantId?: string;
}

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

@Injectable()
export class ApiLoggingMiddleware implements NestMiddleware {
  constructor(private readonly auditLogService: AuditLogService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const typedReq = req as AuthenticatedRequest;
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
    const user = typedReq.user;
    const userId = user?.userId || user?.id || null;

    // Get tenant info
    const tenantHeader = req.headers['x-tenant-id'];
    const tenantId =
      user?.tenantId ||
      (typeof tenantHeader === 'string' ? tenantHeader : null);

    // Get IP address
    const ip =
      req.ip ||
      req.socket.remoteAddress ||
      this.getForwardedIp(req.headers['x-forwarded-for']) ||
      'unknown';

    // Get user agent
    const userAgentHeader = req.headers['user-agent'];
    const userAgent =
      typeof userAgentHeader === 'string' ? userAgentHeader : 'unknown';

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
    res.on('finish', () => {
      void this.logApiResponse(req, res, startTime, userId, tenantId, ip);
    });

    next();
  }

  private getForwardedIp(value: string | string[] | undefined): string | null {
    if (typeof value === 'string') {
      return value.split(',')[0]?.trim() || null;
    }
    if (Array.isArray(value) && value.length > 0) {
      return value[0]?.trim() || null;
    }
    return null;
  }

  private async logApiResponse(
    req: Request,
    res: Response,
    startTime: number,
    userId: string | null,
    tenantId: string | null,
    ip: string,
  ): Promise<void> {
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
  }

  private sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') return body;

    const sanitized: Record<string, unknown> = {
      ...(body as Record<string, unknown>),
    };

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
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
