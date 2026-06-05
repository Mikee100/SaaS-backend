import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SalesTargetService } from './sales-target.service';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { TrialGuard } from '../auth/trial.guard';
import { AuthenticatedRequest } from '../auth/request.types';

@UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
@Controller('sales-targets')
export class SalesTargetController {
  constructor(private readonly salesTargetService: SalesTargetService) {}

  @Get()
  @Permissions('view_sales')
  getTargets(@Req() req: AuthenticatedRequest) {
    if (!req.user.tenantId) {
      throw new Error('Tenant context is required');
    }
    return this.salesTargetService.getTargets(req.user.tenantId);
  }

  @Post()
  @Permissions('create_sales')
  createTargets(
    @Body() body: { daily: number; weekly: number; monthly: number },
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user.tenantId) {
      throw new Error('Tenant context is required');
    }
    return this.salesTargetService.createTargets(req.user.tenantId, body);
  }

  @Put()
  @Permissions('create_sales')
  updateTargets(
    @Body() body: { daily: number; weekly: number; monthly: number },
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.user.tenantId) {
      throw new Error('Tenant context is required');
    }
    return this.salesTargetService.updateTargets(req.user.tenantId, body);
  }
}
