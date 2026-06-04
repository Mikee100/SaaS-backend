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
import { CrmService } from './crm.service';

@Controller('crm')
@UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
@RequireModules('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get('pipeline')
  @Permissions('view_sales')
  @RequireCrmCapabilities('crm.pipeline')
  async getPipeline(@Req() req) {
    return this.crmService.getPipelineBoard(req.user.tenantId);
  }

  @Post('pipeline')
  @Permissions('create_sales')
  @RequireCrmCapabilities('crm.pipeline')
  async createPipeline(
    @Req() req,
    @Body() body: { name: string; stages?: Array<{ name: string; color?: string }> },
  ) {
    return this.crmService.createPipeline(req.user.tenantId, body);
  }

  @Post('deals')
  @Permissions('create_sales')
  @RequireCrmCapabilities('crm.pipeline')
  async createDeal(
    @Req() req,
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
    return this.crmService.createDeal(req.user.tenantId, body);
  }

  @Put('deals/:id/stage')
  @Permissions('create_sales')
  @RequireCrmCapabilities('crm.pipeline')
  async moveDealStage(
    @Req() req,
    @Param('id') id: string,
    @Body() body: { stageId: string },
  ) {
    return this.crmService.moveDealStage(req.user.tenantId, id, body.stageId);
  }

  @Get('tasks')
  @Permissions('view_sales')
  @RequireCrmCapabilities('crm.tasks')
  async getTasks(@Req() req) {
    return this.crmService.getTasks(req.user.tenantId);
  }

  @Post('tasks')
  @Permissions('create_sales')
  @RequireCrmCapabilities('crm.tasks')
  async createTask(
    @Req() req,
    @Body()
    body: {
      title: string;
      priority?: 'low' | 'medium' | 'high';
      dueDate?: string;
      dealId?: string;
      assignedTo?: string;
    },
  ) {
    return this.crmService.createTask(req.user.tenantId, body);
  }

  @Put('tasks/:id/status')
  @Permissions('create_sales')
  @RequireCrmCapabilities('crm.tasks')
  async updateTaskStatus(
    @Req() req,
    @Param('id') id: string,
    @Body() body: { status: 'todo' | 'in_progress' | 'done' },
  ) {
    return this.crmService.updateTaskStatus(req.user.tenantId, id, body.status);
  }

  @Get('reports/summary')
  @Permissions('view_sales')
  @RequireCrmCapabilities('crm.reporting')
  async getReportsSummary(@Req() req) {
    return this.crmService.getReportingSummary(req.user.tenantId);
  }
}
