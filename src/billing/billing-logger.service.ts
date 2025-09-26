import { Injectable, Logger } from '@nestjs/common';
import { AuditLogService } from '../audit-log.service';

@Injectable()
export class BillingLoggerService {
  private readonly logger = new Logger(BillingLoggerService.name);

  constructor(private readonly auditLogService: AuditLogService) {}

  /**
   * Log billing events with structured data
   */
  async logBillingEvent(
    userId: string,
    event: string,
    data: Record<string, any>,
    level: 'info' | 'warn' | 'error' = 'info',
  ) {
    const logData = {
      event,
      userId,
      timestamp: new Date().toISOString(),
      ...data,
    };

    // Console logging
    switch (level) {
      case 'error':
        this.logger.error(`${event}: ${JSON.stringify(logData)}`);
        break;
      case 'warn':
        this.logger.warn(`${event}: ${JSON.stringify(logData)}`);
        break;
      default:
        this.logger.log(`${event}: ${JSON.stringify(logData)}`);
    }

    // Audit logging
    try {
      await this.auditLogService.log(userId, `billing_${event}`, data);
    } catch (error) {
      this.logger.error('Failed to log to audit service', error);
    }
  }

  /**
   * Log subscription events
   */
  async logSubscriptionEvent(
    userId: string,
    event: string,
    subscriptionId: string,
    tenantId: string,
    additionalData: Record<string, any> = {},
  ) {
    await this.logBillingEvent(userId, `subscription_${event}`, {
      subscriptionId,
      tenantId,
      ...additionalData,
    });
  }

  /**
   * Log payment events
   */
  async logPaymentEvent(
    userId: string,
    event: string,
    amount: number,
    currency: string,
    additionalData: Record<string, any> = {},
  ) {
    await this.logBillingEvent(userId, `payment_${event}`, {
      amount,
      currency,
      ...additionalData,
    });
  }

  /**
   * Log Stripe webhook events
   */
  async logWebhookEvent(
    eventType: string,
    eventId: string,
    tenantId?: string,
    additionalData: Record<string, any> = {},
  ) {
    await this.logBillingEvent('system', `webhook_${eventType}`, {
      eventId,
      tenantId,
      ...additionalData,
    });
  }

  /**
   * Log security events
   */
  async logSecurityEvent(
    userId: string,
    event: string,
    ipAddress: string,
    userAgent: string,
    additionalData: Record<string, any> = {},
  ) {
    await this.logBillingEvent(
      userId,
      `security_${event}`,
      {
        ipAddress,
        userAgent,
        ...additionalData,
      },
      'warn',
    );
  }

  /**
   * Log plan changes
   */
  async logPlanChange(
    userId: string,
    oldPlan: string,
    newPlan: string,
    tenantId: string,
    additionalData: Record<string, any> = {},
  ) {
    await this.logBillingEvent(userId, 'plan_change', {
      oldPlan,
      newPlan,
      tenantId,
      ...additionalData,
    });
  }

  /**
   * Log billing errors
   */
  async logBillingError(
    userId: string,
    error: Error,
    context: Record<string, any> = {},
  ) {
    await this.logBillingEvent(
      userId,
      'error',
      {
        error: error.message,
        stack: error.stack,
        ...context,
      },
      'error',
    );
  }
}
