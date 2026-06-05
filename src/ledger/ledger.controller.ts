import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Query,
  Req,
  UnauthorizedException,
  Param,
  ForbiddenException,
  Patch,
} from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { AuthGuard } from '@nestjs/passport';
import { JournalEntryDto } from './accounting.types';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { RequireModules } from '../auth/module-access.decorator';
import { AuthenticatedRequest, AuthenticatedUser } from '../auth/request.types';

@Controller('ledger')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@RequireModules('accounts')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  private getTenantId(req: AuthenticatedRequest): string {
    if (!req.user?.tenantId) {
      throw new UnauthorizedException();
    }
    return req.user.tenantId;
  }

  private getActorUserId(req: AuthenticatedRequest): string {
    const actorUserId = req.user?.userId || req.user?.sub;
    if (!actorUserId) {
      throw new UnauthorizedException();
    }
    return actorUserId;
  }

  private parseAsOfDate(date?: string): Date | undefined {
    if (!date) return undefined;

    const parsedDate = new Date(date);
    // Include the entire selected day, not just midnight.
    parsedDate.setHours(23, 59, 59, 999);
    return parsedDate;
  }

  private getNormalizedRoleNames(
    user: AuthenticatedUser | undefined,
  ): string[] {
    const roles: string[] = [];

    if (Array.isArray(user?.roles)) {
      for (const role of user.roles) {
        if (typeof role === 'string' && role.trim()) {
          roles.push(role.toLowerCase());
        }
      }
    }

    if (typeof user?.role === 'string' && user.role.trim()) {
      roles.push(user.role.toLowerCase());
    }

    return roles;
  }

  private getHeaderBranchId(req: AuthenticatedRequest): string | undefined {
    const headerValue = req.headers['x-branch-id'];
    if (typeof headerValue === 'string' && headerValue.trim()) {
      return headerValue.trim();
    }
    return undefined;
  }

  private getQueryBranchId(req: AuthenticatedRequest): string | undefined {
    const branchIdValue = req.query['branchId'];
    if (typeof branchIdValue === 'string' && branchIdValue.trim()) {
      return branchIdValue.trim();
    }
    return undefined;
  }

  private resolveBranchScope(req: AuthenticatedRequest): string | undefined {
    const roles = this.getNormalizedRoleNames(req.user);
    const assignedBranchId = req.user?.branchId;
    const requestedBranchId =
      this.getHeaderBranchId(req) || this.getQueryBranchId(req);
    const isBranchScopedRole =
      roles.includes('manager') || roles.includes('cashier');

    if (isBranchScopedRole) {
      if (!assignedBranchId) {
        throw new ForbiddenException(
          'Your account is branch-scoped but has no assigned branch. Contact an admin.',
        );
      }
      return assignedBranchId;
    }

    if (requestedBranchId && requestedBranchId !== 'all') {
      return requestedBranchId;
    }

    return undefined;
  }

  @Get()
  @Permissions('view_reports')
  async getLedger(@Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    const effectiveBranchId = this.resolveBranchScope(req);
    return this.ledgerService.getLedgerEntries(tenantId, effectiveBranchId);
  }

  @Post('init-coa')
  @Permissions('create_sales')
  async initCOA(@Req() req: AuthenticatedRequest) {
    return this.ledgerService.initializeCOA(this.getTenantId(req));
  }

  @Get('accounts')
  @Permissions('view_reports')
  async getAccounts(@Req() req: AuthenticatedRequest) {
    return this.ledgerService.getAccounts(this.getTenantId(req));
  }

  @Post('journal')
  @Permissions('create_sales')
  async createJournalEntry(
    @Req() req: AuthenticatedRequest,
    @Body() dto: JournalEntryDto,
  ) {
    const tenantId = this.getTenantId(req);
    const userId = this.getActorUserId(req);
    const effectiveBranchId = this.resolveBranchScope(req);
    const branchPrefix = effectiveBranchId
      ? `BRANCH:${effectiveBranchId}:`
      : undefined;
    const scopedDto = {
      ...dto,
      reference:
        branchPrefix && !(dto.reference || '').startsWith(branchPrefix)
          ? `${branchPrefix}${dto.reference || 'MANUAL'}`
          : dto.reference,
    };
    return this.ledgerService.createJournalEntry(tenantId, userId, scopedDto);
  }

  @Get('trial-balance')
  @Permissions('view_reports')
  async getTrialBalance(
    @Req() req: AuthenticatedRequest,
    @Query('date') date?: string,
  ) {
    const tenantId = this.getTenantId(req);
    const effectiveBranchId = this.resolveBranchScope(req);

    return this.ledgerService.getTrialBalance(
      tenantId,
      this.parseAsOfDate(date),
      effectiveBranchId,
    );
  }

  @Get('profit-loss')
  @Permissions('view_reports')
  async getProfitLoss(
    @Req() req: AuthenticatedRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantId = this.getTenantId(req);
    const effectiveBranchId = this.resolveBranchScope(req);
    return this.ledgerService.getProfitAndLoss(
      tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      effectiveBranchId,
    );
  }

  @Get('balance-sheet')
  @Permissions('view_reports')
  async getBalanceSheet(
    @Req() req: AuthenticatedRequest,
    @Query('date') date?: string,
  ) {
    const tenantId = this.getTenantId(req);
    const effectiveBranchId = this.resolveBranchScope(req);
    return this.ledgerService.getBalanceSheet(
      tenantId,
      this.parseAsOfDate(date),
      effectiveBranchId,
    );
  }

  @Post('sync')
  @Permissions('create_sales')
  async syncLedger(@Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    const userId = this.getActorUserId(req);
    const effectiveBranchId = this.resolveBranchScope(req);
    return this.ledgerService.syncLedger(tenantId, userId, effectiveBranchId);
  }

  @Post('reclassify-expenses')
  @Permissions('create_sales')
  async reclassifyExpenses(@Req() req: AuthenticatedRequest) {
    const tenantId = this.getTenantId(req);
    const effectiveBranchId = this.resolveBranchScope(req);
    return this.ledgerService.reclassifyExpenseEntries(
      tenantId,
      effectiveBranchId,
    );
  }

  @Get('accounts/:id/entries')
  @Permissions('view_reports')
  async getAccountEntries(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limitText?: string,
    @Query('startDate') startDateText?: string,
    @Query('endDate') endDateText?: string,
  ) {
    const tenantId = this.getTenantId(req);
    const effectiveBranchId = this.resolveBranchScope(req);
    const parsedLimit = limitText ? Number(limitText) : undefined;
    const startDate = startDateText ? new Date(startDateText) : undefined;
    const endDate = endDateText ? new Date(endDateText) : undefined;

    return this.ledgerService.getAccountEntries(
      tenantId,
      id,
      effectiveBranchId,
      {
        cursor,
        limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
        startDate,
        endDate,
      },
    );
  }

  @Patch('entry/:id/tag')
  @Permissions('edit_ledger')
  async updateLedgerEntryTag(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body('tag') tag: string,
  ) {
    return this.ledgerService.updateLedgerEntryTag(
      this.getTenantId(req),
      id,
      tag,
    );
  }
}
