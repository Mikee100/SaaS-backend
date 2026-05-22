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
} from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { AuthGuard } from '@nestjs/passport';
import { JournalEntryDto } from './accounting.types';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('ledger')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  private getNormalizedRoleNames(user: any): string[] {
    const roles: any[] = [];

    if (Array.isArray(user?.roles)) {
      roles.push(...user.roles);
    }

    if (user?.role) {
      roles.push(user.role);
    }

    return roles
      .map((role: any) =>
        typeof role === 'string'
          ? role.toLowerCase()
          : String(role?.name || '').toLowerCase(),
      )
      .filter(Boolean);
  }

  private resolveBranchScope(req: any): string | undefined {
    const roles = this.getNormalizedRoleNames(req?.user);
    const assignedBranchId = req?.user?.branchId as string | undefined;
    const requestedBranchId =
      (req?.headers?.['x-branch-id'] as string | undefined) ||
      (req?.query?.branchId as string | undefined);
    const isBranchScopedRole = roles.includes('manager') || roles.includes('cashier');

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
  async getLedger(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new UnauthorizedException();
    const effectiveBranchId = this.resolveBranchScope(req);
    return this.ledgerService.getLedgerEntries(tenantId, effectiveBranchId);
  }

  @Post('init-coa')
  @Permissions('create_sales')
  async initCOA(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new UnauthorizedException();
    return this.ledgerService.initializeCOA(tenantId);
  }

  @Get('accounts')
  @Permissions('view_reports')
  async getAccounts(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new UnauthorizedException();
    return this.ledgerService.getAccounts(tenantId);
  }

  @Post('journal')
  @Permissions('create_sales')
  async createJournalEntry(@Req() req: any, @Body() dto: JournalEntryDto) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId || req.user?.sub;
    if (!tenantId || !userId) throw new UnauthorizedException();
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
  async getTrialBalance(@Req() req: any, @Query('date') date?: string) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new UnauthorizedException();
    const effectiveBranchId = this.resolveBranchScope(req);

    let asOfDate: Date | undefined;
    if (date) {
      asOfDate = new Date(date);
      // Include the entire selected day, not just midnight.
      asOfDate.setHours(23, 59, 59, 999);
    }

    return this.ledgerService.getTrialBalance(
      tenantId,
      asOfDate,
      effectiveBranchId,
    );
  }

  @Get('profit-loss')
  @Permissions('view_reports')
  async getProfitLoss(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new UnauthorizedException();
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
  async getBalanceSheet(@Req() req: any, @Query('date') date?: string) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new UnauthorizedException();
    const effectiveBranchId = this.resolveBranchScope(req);
    return this.ledgerService.getBalanceSheet(
      tenantId,
      date ? new Date(date) : undefined,
      effectiveBranchId,
    );
  }

  @Post('sync')
  @Permissions('create_sales')
  async syncLedger(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId || req.user?.sub;
    if (!tenantId || !userId) throw new UnauthorizedException();
    const effectiveBranchId = this.resolveBranchScope(req);
    return this.ledgerService.syncLedger(tenantId, userId, effectiveBranchId);
  }

  @Post('reclassify-expenses')
  @Permissions('create_sales')
  async reclassifyExpenses(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new UnauthorizedException();
    const effectiveBranchId = this.resolveBranchScope(req);
    return this.ledgerService.reclassifyExpenseEntries(tenantId, effectiveBranchId);
  }

  @Get('accounts/:id/entries')
  @Permissions('view_reports')
  async getAccountEntries(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new UnauthorizedException();
    const effectiveBranchId = this.resolveBranchScope(req);
    return this.ledgerService.getAccountEntries(tenantId, id, effectiveBranchId);
  }
}
