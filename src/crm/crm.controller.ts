import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { TrialGuard } from '../auth/trial.guard';
import { RequireModules } from '../auth/module-access.decorator';
import { RequireCrmCapabilities } from '../auth/crm-capability-access.decorator';
import { AuthenticatedRequest } from '../auth/request.types';
import { BadRequestException } from '@nestjs/common';
import { CrmService } from './crm.service';

@Controller('crm')
@UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
@RequireModules('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  private getTenantId(req: AuthenticatedRequest): string {
    if (!req.user?.tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return req.user.tenantId;
  }

  @Get('pipeline')
  @Permissions('view_sales')
  @RequireCrmCapabilities('crm.pipeline')
  async getPipeline(@Req() req: AuthenticatedRequest) {
    return this.crmService.getPipelineBoard(this.getTenantId(req));
  }

  @Post('pipeline')
  @Permissions('create_sales')
  @RequireCrmCapabilities('crm.pipeline')
  async createPipeline(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: { name: string; stages?: Array<{ name: string; color?: string }> },
  ) {
    return this.crmService.createPipeline(this.getTenantId(req), body);
  }

  @Post('deals')
  @Permissions('create_sales')
  @RequireCrmCapabilities('crm.pipeline')
  async createDeal(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      title: string;
      value?: number;
      currency?: string;
      pipelineId: string;
      stageId: string;
      contactName?: string;
    },
  ) {
    return this.crmService.createDeal(this.getTenantId(req), body);
  }

  @Put('deals/:id/stage')
  @Permissions('create_sales')
  @RequireCrmCapabilities('crm.pipeline')
  async moveDealStage(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { stageId: string },
  ) {
    return this.crmService.moveDealStage(
      this.getTenantId(req),
      id,
      body.stageId,
    );
  }

  @Get('tasks')
  @Permissions('view_sales')
  @RequireCrmCapabilities('crm.tasks')
  async getTasks(@Req() req: AuthenticatedRequest) {
    return this.crmService.getTasks(this.getTenantId(req));
  }

  @Post('tasks')
  @Permissions('create_sales')
  @RequireCrmCapabilities('crm.tasks')
  async createTask(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      title: string;
      priority?: 'low' | 'medium' | 'high';
      dueDate?: string;
      dealId?: string;
      assignedTo?: string;
    },
  ) {
    return this.crmService.createTask(this.getTenantId(req), body);
  }

  @Put('tasks/:id/status')
  @Permissions('create_sales')
  @RequireCrmCapabilities('crm.tasks')
  async updateTaskStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { status: 'todo' | 'in_progress' | 'done' },
  ) {
    return this.crmService.updateTaskStatus(
      this.getTenantId(req),
      id,
      body.status,
    );
  }

  @Get('reports/summary')
  @Permissions('view_sales')
  @RequireCrmCapabilities('crm.reporting')
  async getReportsSummary(@Req() req: AuthenticatedRequest) {
    return this.crmService.getReportingSummary(this.getTenantId(req));
  }
}
