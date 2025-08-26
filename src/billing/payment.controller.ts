 

import { Controller, Post, Get, Body, Req, UseGuards, Param, Query } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}


    @Post('methods')
    async savePaymentMethod(
      @Body() body: { paymentMethodId: string },
      @Req() req,
    ) {
      console.log('--- /payments/methods API HIT ---');
      console.log('Body:', body);
      console.log('User:', req.user);
      try {
        await this.paymentService.addPaymentMethod(
          req.user?.tenantId,
          body.paymentMethodId,
        );
        console.log('Payment method saved successfully');
        return { success: true };
      } catch (error) {
        console.error('Error saving payment method:', error.message);
        return { success: false, error: error.message };
      }
    }

    
  /**
   * Get payment methods
   */
  @Get('methods')
  async getPaymentMethods(@Req() req) {
    try {
      const methods = await this.paymentService.getPaymentMethods(req.user.tenantId);

      return {
        success: true,
        methods,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }



  /**
   * Process a one-time payment
   */
  @Post('process')
  @Permissions('edit_billing')
  async processPayment(
    @Body() body: {
      amount: number;
      currency: string;
      description: string;
      metadata?: Record<string, any>;
    },
    @Req() req,
  ) {
    try {
      const result = await this.paymentService.processOneTimePayment(
        req.user.tenantId,
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
        error: error.message,
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
    @Req() req,
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
        error: error.message,
      };
    }
  }

  /**
   * Generate invoice for subscription
   */
  @Post('generate-invoice')
  @Permissions('edit_billing')
  async generateInvoice(
    @Body() body: {
      subscriptionId: string;
      amount: number;
      currency?: string;
    },
    @Req() req,
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
        error: error.message,
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
    @Req() req,
  ) {
    try {
      const analytics = await this.paymentService.getPaymentAnalytics(
        req.user.tenantId,
        period,
      );

      return {
        success: true,
        analytics,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
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
    @Req() req,
  ) {
    try {
      const history = await this.paymentService.getPaymentHistory(
        req.user.tenantId,
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
        error: error.message,
      };
    }
  }

  /**
   * Refund a payment
   */
  @Post('refund')
  @Permissions('edit_billing')
  async refundPayment(
    @Body() body: {
      paymentId: string;
      amount?: number;
      reason?: string;
    },
    @Req() req,
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
        error: error.message,
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
    @Req() req,
  ) {
    try {
      await this.paymentService.addPaymentMethod(
        req.user.tenantId,
        body.paymentMethodId,
      );

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
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
    @Req() req,
  ) {
    try {
      await this.paymentService.removePaymentMethod(
        req.user.tenantId,
        body.paymentMethodId,
      );

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get payment status
   */
  @Get('status/:paymentId')
  @Permissions('view_billing')
  async getPaymentStatus(@Param('paymentId') paymentId: string, @Req() req) {
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
        error: error.message,
      };
    }
  }


    
} 