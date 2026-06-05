import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SuperadminGuard } from './superadmin.guard';
import { TrialGuard } from '../auth/trial.guard';
import { SupportService } from './support.service';
import {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from './support.service';

@Controller('admin/support')
@UseGuards(AuthGuard('jwt'), SuperadminGuard, TrialGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  private asStatus(value?: string): TicketStatus | undefined {
    return ['open', 'in_progress', 'resolved', 'closed'].includes(value ?? '')
      ? (value as TicketStatus)
      : undefined;
  }

  private asPriority(value?: string): TicketPriority | undefined {
    return ['low', 'medium', 'high', 'critical'].includes(value ?? '')
      ? (value as TicketPriority)
      : undefined;
  }

  private asCategory(value?: string): TicketCategory | undefined {
    return [
      'technical',
      'billing',
      'feature_request',
      'bug_report',
      'general',
    ].includes(value ?? '')
      ? (value as TicketCategory)
      : undefined;
  }

  @Get('tickets')
  async getTickets(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
  ) {
    return this.supportService.getTickets(status, priority);
  }

  @Get('tickets/:id/responses')
  async getTicketResponses(@Param('id') ticketId: string) {
    return this.supportService.getTicketResponses(ticketId);
  }

  @Put('tickets/:id')
  async updateTicket(
    @Param('id') ticketId: string,
    @Body() body: { status?: string; priority?: string },
  ) {
    return this.supportService.updateTicket(ticketId, {
      status: this.asStatus(body.status),
      priority: this.asPriority(body.priority),
    });
  }

  @Post('tickets/:id/responses')
  async addResponse(
    @Param('id') ticketId: string,
    @Req() req: { user: { userId?: string; sub?: string } },
    @Body() body: { message: string; isInternal?: boolean },
  ) {
    const userId = req.user?.userId || req.user?.sub;
    if (!userId) {
      throw new Error('User not found in request');
    }
    return this.supportService.addResponse(
      ticketId,
      userId,
      body.message,
      body.isInternal ?? false,
    );
  }

  @Post('tickets')
  async createTicket(
    @Body()
    body: {
      tenantId: string;
      userId: string;
      subject: string;
      description: string;
      priority?: string;
      category?: string;
    },
  ) {
    return this.supportService.createTicket({
      tenantId: body.tenantId,
      userId: body.userId,
      subject: body.subject,
      description: body.description,
      priority: this.asPriority(body.priority),
      category: this.asCategory(body.category),
    });
  }
}
