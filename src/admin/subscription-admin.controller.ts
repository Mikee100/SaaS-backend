import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  NotFoundException,
  Post,
  UseGuards,
  Logger,
  BadRequestException,
  Query,
  UploadedFile,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AuthGuard } from '@nestjs/passport';
import { SubscriptionAdminService } from './subscription-admin.service';
import { SuperadminGuard } from './superadmin.guard';
import { TrialGuard } from '../auth/trial.guard';

@Controller('admin/subscriptions')
@UseGuards(AuthGuard('jwt'), SuperadminGuard, TrialGuard)
export class SubscriptionAdminController {
  private readonly logger = new Logger(SubscriptionAdminController.name);

  constructor(
    private readonly subscriptionAdminService: SubscriptionAdminService,
  ) {}

  @Get()
  async getAllSubscriptions() {
    try {
      this.logger.log('Getting all subscriptions');
      const subscriptions = await this.subscriptionAdminService.getAllSubscriptions();
      this.logger.log(`Returning ${subscriptions.length} subscriptions`);
      return subscriptions;
    } catch (error) {
      this.logger.error('Error in getAllSubscriptions:', error);
      throw error;
    }
  }

  @Get('operations/tenants')
  async getTenantBillingOperationsOverview(
    @Query('search') search?: string,
    @Query('state') state?: string,
    @Query('suspendedOnly') suspendedOnly?: string,
  ) {
    return this.subscriptionAdminService.getTenantBillingOperationsOverview({
      search,
      state,
      suspendedOnly: suspendedOnly === 'true',
    });
  }

  @Patch('operations/tenants/:tenantId/reactivate')
  async reactivateTenantBillingAccess(@Param('tenantId') tenantId: string) {
    return this.subscriptionAdminService.reactivateTenantBillingAccess(tenantId);
  }

  @Patch('operations/tenants/:tenantId/suspend')
  async suspendTenantBillingAccess(@Param('tenantId') tenantId: string) {
    return this.subscriptionAdminService.suspendTenantBillingAccess(tenantId);
  }

  @Post('operations/tenants/:tenantId/grace-extension')
  async extendTenantGracePeriod(
    @Param('tenantId') tenantId: string,
    @Body('days') days: number,
    @Body('reason') reason?: string,
  ) {
    if (!days || Number.isNaN(Number(days))) {
      throw new BadRequestException('days is required and must be numeric');
    }

    if (Number(days) < 1 || Number(days) > 365) {
      throw new BadRequestException('days must be between 1 and 365');
    }

    return this.subscriptionAdminService.extendTenantGracePeriod(
      tenantId,
      Number(days),
      reason,
    );
  }

  @Post('operations/tenants/:tenantId/manual-renewal')
  async manuallyRenewTenantSubscription(
    @Param('tenantId') tenantId: string,
    @Body('months') months?: number,
    @Body('reason') reason?: string,
    @Body('planId') planId?: string,
  ) {
    const normalizedMonths = Number(months ?? 1);
    if (!Number.isFinite(normalizedMonths) || normalizedMonths < 1 || normalizedMonths > 24) {
      throw new BadRequestException('months must be between 1 and 24');
    }

    return this.subscriptionAdminService.manuallyRenewTenantSubscription(
      tenantId,
      Math.floor(normalizedMonths),
      reason,
      planId,
    );
  }

  @Get('operations/tenants/:tenantId/action-preview')
  async getBillingActionPreview(
    @Param('tenantId') tenantId: string,
    @Query('action') action: 'grace' | 'renew' | 'suspend' | 'reactivate',
    @Query('days') days?: string,
    @Query('months') months?: string,
  ) {
    if (!action || !['grace', 'renew', 'suspend', 'reactivate'].includes(action)) {
      throw new BadRequestException('action is required and must be grace, renew, suspend, or reactivate');
    }

    return this.subscriptionAdminService.getBillingActionPreview(tenantId, action, {
      days: days ? Number(days) : undefined,
      months: months ? Number(months) : undefined,
    });
  }

  @Get('operations/tenants/:tenantId/manual-payments')
  async getManualPayments(@Param('tenantId') tenantId: string) {
    return this.subscriptionAdminService.listManualPayments(tenantId);
  }

  @Get('operations/reconciliation')
  async getReconciliationDashboard(
    @Query('search') search?: string,
    @Query('tenantId') tenantId?: string,
    @Query('overdueOnly') overdueOnly?: string,
    @Query('mismatchOnly') mismatchOnly?: string,
  ) {
    return this.subscriptionAdminService.getReconciliationDashboard({
      search,
      tenantId,
      overdueOnly: overdueOnly === 'true',
      mismatchOnly: mismatchOnly === 'true',
    });
  }

  @Get('operations/reconciliation/export-csv')
  async exportReconciliationCsv(
    @Res() res: Response,
    @Query('search') search?: string,
    @Query('tenantId') tenantId?: string,
    @Query('overdueOnly') overdueOnly?: string,
    @Query('mismatchOnly') mismatchOnly?: string,
  ) {
    const rows = await this.subscriptionAdminService.exportReconciliationRows({
      search,
      tenantId,
      overdueOnly: overdueOnly === 'true',
      mismatchOnly: mismatchOnly === 'true',
    });

    const headers = [
      'category',
      'tenantId',
      'tenantName',
      'tenantEmail',
      'recordId',
      'amount',
      'currency',
      'status',
      'reference',
      'issue',
      'createdAt',
    ];

    const escape = (value: unknown) => {
      const raw = value == null ? '' : String(value);
      const escaped = raw.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const body = [
      headers.join(','),
      ...rows.map((row) => headers.map((h) => escape((row as any)[h])).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="billing-reconciliation-${Date.now()}.csv"`,
    );

    return res.send(body);
  }

  @Post('operations/tenants/:tenantId/manual-payments')
  async createManualPayment(
    @Param('tenantId') tenantId: string,
    @Body('amount') amount: number,
    @Body('currency') currency?: string,
    @Body('method') method?: string,
    @Body('referenceCode') referenceCode?: string,
    @Body('payerName') payerName?: string,
    @Body('receiptUrl') receiptUrl?: string,
    @Body('notes') notes?: string,
    @Body('months') months?: number,
    @Body('applyNow') applyNow?: boolean,
    @Body('receiptUploadFailed') receiptUploadFailed?: boolean,
    @Body('receiptUploadError') receiptUploadError?: string,
    @Body('reason') reason?: string,
    @Body('planId') planId?: string,
  ) {
    return this.subscriptionAdminService.recordManualPayment(tenantId, {
      amount: Number(amount),
      currency,
      method,
      referenceCode,
      payerName,
      receiptUrl,
      notes,
      months: months ? Number(months) : undefined,
      applyNow: !!applyNow,
      receiptUploadFailed: !!receiptUploadFailed,
      receiptUploadError,
      reason,
      planId,
    });
  }

  @Get('operations/tenants/:tenantId/manual-invoices')
  async getManualInvoices(@Param('tenantId') tenantId: string) {
    return this.subscriptionAdminService.listManualInvoices(tenantId);
  }

  @Post('operations/tenants/:tenantId/manual-invoices')
  async createManualInvoice(
    @Param('tenantId') tenantId: string,
    @Body('amount') amount: number,
    @Body('status') status?: 'draft' | 'issued' | 'paid' | 'void',
    @Body('dueDate') dueDate?: string,
    @Body('subscriptionId') subscriptionId?: string,
    @Body('paymentId') paymentId?: string,
    @Body('notes') notes?: string,
  ) {
    return this.subscriptionAdminService.createManualInvoice(tenantId, {
      amount: Number(amount),
      status,
      dueDate,
      subscriptionId,
      paymentId,
      notes,
    });
  }

  @Patch('operations/tenants/:tenantId/manual-invoices/:invoiceId/status')
  async transitionManualInvoiceStatus(
    @Param('tenantId') tenantId: string,
    @Param('invoiceId') invoiceId: string,
    @Body('status') status: 'draft' | 'issued' | 'paid' | 'void',
    @Body('reason') reason?: string,
  ) {
    return this.subscriptionAdminService.transitionManualInvoiceStatus(
      tenantId,
      invoiceId,
      status,
      reason,
    );
  }

  @Post('operations/tenants/:tenantId/manual-payments/upload-receipt')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadDir = './uploads/manual-payments';
          if (!existsSync(uploadDir)) {
            mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `receipt-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadManualPaymentReceipt(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return {
      receiptUrl: `/uploads/manual-payments/${file.filename}`,
    };
  }

  @Post('operations/tenants/:tenantId/manual-payments/:paymentId/apply')
  async applyManualPaymentToSubscription(
    @Param('tenantId') tenantId: string,
    @Param('paymentId') paymentId: string,
    @Body('months') months?: number,
    @Body('reason') reason?: string,
    @Body('planId') planId?: string,
  ) {
    return this.subscriptionAdminService.applyManualPaymentToSubscription(
      tenantId,
      paymentId,
      months ? Number(months) : undefined,
      reason,
      planId,
    );
  }

  @Get('operations/tenants/:tenantId/timeline')
  async getTenantSubscriptionTimeline(@Param('tenantId') tenantId: string) {
    return this.subscriptionAdminService.getTenantSubscriptionTimeline(tenantId);
  }

  @Get('tenant/:tenantId/usage')
  async getTenantUsage(@Param('tenantId') tenantId: string) {
    return this.subscriptionAdminService.getTenantUsage(tenantId);
  }

  @Get(':id')
  async getSubscriptionById(@Param('id') id: string) {
    return this.subscriptionAdminService.getSubscriptionById(id);
  }

  @Patch(':id/cancel-scheduled')
  async cancelScheduledChange(@Param('id') id: string) {
    return this.subscriptionAdminService.cancelScheduledChange(id);
  }

  @Patch('tenant/:tenantId/force-update')
  async forceSubscriptionUpdate(
    @Param('tenantId') tenantId: string,
    @Body('planId') planId: string,
  ) {
    if (!planId) {
      throw new NotFoundException('Plan ID is required');
    }
    return this.subscriptionAdminService.forceSubscriptionUpdate(
      tenantId,
      planId,
    );
  }

  @Post('assign-plan')
  async assignPlanToTenant(
    @Body('tenantId') tenantId: string,
    @Body('planId') planId: string,
  ) {
    if (!tenantId || !planId) {
      throw new NotFoundException('Tenant ID and Plan ID are required');
    }
    return this.subscriptionAdminService.assignPlanToTenant(tenantId, planId);
  }
}
