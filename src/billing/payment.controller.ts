import {
  BadRequestException,
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  Param,
  Query,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { AuthenticatedRequest } from '../auth/request.types';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  private getTenantId(req: AuthenticatedRequest): string {
    if (!req.user?.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return req.user.tenantId;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'An unexpected error occurred';
  }

  /**
   * Get payment methods
   */
  @Get('methods')
  async getPaymentMethods(@Req() req: AuthenticatedRequest) {
    try {
      const methods = await this.paymentService.getPaymentMethods(
        this.getTenantId(req),
      );

      return {
        success: true,
        methods,
      };
    } catch (error) {
      return {
        success: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Process a one-time payment
   */
  @Post('process')
  @Permissions('edit_billing')
  async processPayment(
    @Body()
    body: {
      amount: number;
      currency: string;
      description: string;
      metadata?: Record<string, unknown>;
    },
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const result = await this.paymentService.processOneTimePayment(
        this.getTenantId(req),
        body.amount,
        body.currency,
        body.description,
        body.metadata || {},
      );

      return {
        success: true,
        paymentId: result.paymentId,
        clientSecret: result.clientSecret,
        amount: result.amount,
        currency: result.currency,
      };
    } catch (error) {
      return {
        success: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Confirm a payment
   */
  @Post('confirm')
  @Permissions('edit_billing')
  async confirmPayment(
    @Body() body: { paymentId: string; paymentIntentId: string },
  ) {
    try {
      const result = await this.paymentService.confirmPayment(
        body.paymentId,
        body.paymentIntentId,
      );

      return {
        success: true,
        paymentId: result.paymentId,
      };
    } catch (error) {
      return {
        success: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Generate invoice for subscription
   */
  @Post('generate-invoice')
  @Permissions('edit_billing')
  async generateInvoice(
    @Body()
    body: {
      subscriptionId: string;
      amount: number;
      currency?: string;
    },
  ) {
    try {
      const invoice = await this.paymentService.generateInvoice(
        body.subscriptionId,
        body.amount,
        body.currency || 'usd',
      );

      return {
        success: true,
        invoice,
      };
    } catch (error) {
      return {
        success: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Get payment analytics
   */
  @Get('analytics')
  @Permissions('view_billing')
  async getPaymentAnalytics(
    @Query('period') period: 'month' | 'quarter' | 'year' = 'month',
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const analytics = await this.paymentService.getPaymentAnalytics(
        this.getTenantId(req),
        period,
      );

      return {
        success: true,
        analytics,
      };
    } catch (error) {
      return {
        success: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Get payment history
   */
  @Get('history')
  @Permissions('view_billing')
  async getPaymentHistory(
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      const history = await this.paymentService.getPaymentHistory(
        this.getTenantId(req),
        limit,
        offset,
      );

      return {
        success: true,
        history,
      };
    } catch (error) {
      return {
        success: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Refund a payment
   */
  @Post('refund')
  @Permissions('edit_billing')
  async refundPayment(
    @Body()
    body: {
      paymentId: string;
      amount?: number;
      reason?: string;
    },
  ) {
    try {
      const result = await this.paymentService.refundPayment(
        body.paymentId,
        body.amount,
        body.reason,
      );

      return {
        success: true,
        refundId: result.refundId,
      };
    } catch (error) {
      return {
        success: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Add a payment method
   */
  @Post('methods')
  @Permissions('edit_billing')
  async addPaymentMethod(
    @Body() body: { paymentMethodId: string },
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      await this.paymentService.addPaymentMethod(
        this.getTenantId(req),
        body.paymentMethodId,
      );

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Remove a payment method
   */
  @Post('methods/remove')
  @Permissions('edit_billing')
  async removePaymentMethod(
    @Body() body: { paymentMethodId: string },
    @Req() req: AuthenticatedRequest,
  ) {
    try {
      await this.paymentService.removePaymentMethod(
        this.getTenantId(req),
        body.paymentMethodId,
      );

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Get payment status
   */
  @Get('status/:paymentId')
  @Permissions('view_billing')
  getPaymentStatus(@Param('paymentId') paymentId: string) {
    try {
      // This would typically check the payment status in your database
      // For now, we'll return a basic structure
      return {
        success: true,
        paymentId,
        status: 'completed', // This should be fetched from database
      };
    } catch (error) {
      return {
        success: false,
        error: this.getErrorMessage(error),
      };
    }
  }
}
