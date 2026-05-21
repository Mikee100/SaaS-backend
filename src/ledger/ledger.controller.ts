import { Controller, Get, Post, Body, UseGuards, Query, Req, UnauthorizedException, Param } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { AuthGuard } from '@nestjs/passport';
import { JournalEntryDto } from './accounting.types';

@Controller('ledger')
@UseGuards(AuthGuard('jwt'))
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get()
  async getLedger(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new UnauthorizedException();
    return this.ledgerService.getLedgerEntries(tenantId);
  }

  @Post('init-coa')
  async initCOA(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new UnauthorizedException();
    return this.ledgerService.initializeCOA(tenantId);
  }

  @Get('accounts')
  async getAccounts(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new UnauthorizedException();
    return this.ledgerService.getAccounts(tenantId);
  }

  @Post('journal')
  async createJournalEntry(@Req() req: any, @Body() dto: JournalEntryDto) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId || req.user?.sub;
    if (!tenantId || !userId) throw new UnauthorizedException();
    return this.ledgerService.createJournalEntry(tenantId, userId, dto);
  }

  @Get('trial-balance')
  async getTrialBalance(@Req() req: any, @Query('date') date?: string) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new UnauthorizedException();

    let asOfDate: Date | undefined;
    if (date) {
      asOfDate = new Date(date);
      // Include the entire selected day, not just midnight.
      asOfDate.setHours(23, 59, 59, 999);
    }

    return this.ledgerService.getTrialBalance(
      tenantId,
      asOfDate,
    );
  }

  @Get('profit-loss')
  async getProfitLoss(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new UnauthorizedException();
    return this.ledgerService.getProfitAndLoss(
      tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('balance-sheet')
  async getBalanceSheet(@Req() req: any, @Query('date') date?: string) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new UnauthorizedException();
    return this.ledgerService.getBalanceSheet(
      tenantId,
      date ? new Date(date) : undefined,
    );
  }

  @Post('sync')
  async syncLedger(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId || req.user?.sub;
    if (!tenantId || !userId) throw new UnauthorizedException();
    return this.ledgerService.syncLedger(tenantId, userId);
  }

  @Post('reclassify-expenses')
  async reclassifyExpenses(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new UnauthorizedException();
    return this.ledgerService.reclassifyExpenseEntries(tenantId);
  }

  @Get('accounts/:id/entries')
  async getAccountEntries(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new UnauthorizedException();
    return this.ledgerService.getAccountEntries(tenantId, id);
  }
}
