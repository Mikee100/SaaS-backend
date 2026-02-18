import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const;
const TICKET_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
const TICKET_CATEGORIES = ['technical', 'billing', 'feature_request', 'bug_report', 'general'] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getTickets(
    status?: string,
    priority?: string,
  ): Promise<
    Array<{
      id: string;
      tenantId: string;
      tenantName: string;
      userId: string;
      userName: string;
      userEmail: string;
      subject: string;
      description: string;
      priority: TicketPriority;
      status: TicketStatus;
      category: TicketCategory;
      createdAt: string;
      updatedAt: string;
      assignedTo?: string;
      resolution?: string;
      attachments?: string[];
    }>
  > {
    const where: Record<string, unknown> = {};
    if (status && status !== 'all') {
      where.status = status;
    }
    if (priority && priority !== 'all') {
      where.priority = priority;
    }

    const tickets = await this.prisma.supportTicket.findMany({
      where,
      include: {
        tenant: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tickets.map((t) => ({
      id: t.id,
      tenantId: t.tenantId,
      tenantName: t.tenant.name,
      userId: t.userId,
      userName: t.user.name,
      userEmail: t.user.email,
      subject: t.subject,
      description: t.description,
      priority: t.priority as TicketPriority,
      status: t.status as TicketStatus,
      category: t.category as TicketCategory,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      assignedTo: t.assignedTo ?? undefined,
      resolution: t.resolution ?? undefined,
      attachments: (t.attachments as string[] | null) ?? undefined,
    }));
  }

  async getTicketResponses(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const responses = await this.prisma.supportTicketResponse.findMany({
      where: { ticketId },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return responses.map((r) => ({
      id: r.id,
      ticketId: r.ticketId,
      userId: r.userId,
      userName: r.user.name,
      message: r.message,
      isInternal: r.isInternal,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async updateTicket(
    ticketId: string,
    data: { status?: TicketStatus; priority?: TicketPriority },
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.status && TICKET_STATUSES.includes(data.status)) {
      updateData.status = data.status;
    }
    if (data.priority && TICKET_PRIORITIES.includes(data.priority)) {
      updateData.priority = data.priority;
    }

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
    });
  }

  async addResponse(
    ticketId: string,
    userId: string,
    message: string,
    isInternal: boolean,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const response = await this.prisma.supportTicketResponse.create({
      data: {
        ticketId,
        userId,
        message,
        isInternal,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    // Optionally set ticket to in_progress when first response is added
    if (ticket.status === 'open') {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'in_progress', updatedAt: new Date() },
      });
    }

    return {
      id: response.id,
      ticketId: response.ticketId,
      userId: response.userId,
      userName: response.user.name,
      message: response.message,
      isInternal: response.isInternal,
      createdAt: response.createdAt.toISOString(),
    };
  }

  async createTicket(data: {
    tenantId: string;
    userId: string;
    subject: string;
    description: string;
    priority?: TicketPriority;
    category?: TicketCategory;
  }) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        subject: data.subject,
        description: data.description,
        priority: data.priority ?? 'medium',
        category: data.category ?? 'general',
      },
      include: {
        tenant: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return {
      id: ticket.id,
      tenantId: ticket.tenantId,
      tenantName: ticket.tenant.name,
      userId: ticket.userId,
      userName: ticket.user.name,
      userEmail: ticket.user.email,
      subject: ticket.subject,
      description: ticket.description,
      priority: ticket.priority as TicketPriority,
      status: ticket.status as TicketStatus,
      category: ticket.category as TicketCategory,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    };
  }
}
