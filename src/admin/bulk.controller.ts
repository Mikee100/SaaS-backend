import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SuperadminGuard } from './superadmin.guard';
import { TrialGuard } from '../auth/trial.guard';
import { BulkService, BulkOperation } from './bulk.service';

@Controller('admin/bulk')
@UseGuards(AuthGuard('jwt'), SuperadminGuard, TrialGuard)
export class BulkController {
  private readonly logger = new Logger(BulkController.name);

  constructor(private readonly bulkService: BulkService) {}

  @Get('operations')
  async getOperations(): Promise<BulkOperation[]> {
    return this.bulkService.getOperations();
  }

  @Post('execute')
  async execute(
    @Body() body: { action: string; tenantIds?: string[]; userIds?: string[]; confirmation?: string },
  ) {
    const { action, tenantIds, userIds, confirmation } = body;

    const destructiveActions = ['suspend_users', 'suspend_tenants', 'delete_tenants'];
    if (destructiveActions.includes(action) && confirmation !== 'CONFIRM') {
      throw new BadRequestException(
        'Destructive actions require confirmation. Please type CONFIRM.',
      );
    }

    return this.bulkService.execute(action, tenantIds ?? [], userIds ?? []);
  }
}
