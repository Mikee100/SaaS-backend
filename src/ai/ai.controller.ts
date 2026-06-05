import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
  Put,
  Query,
  Delete,
  Res,
} from '@nestjs/common';
import { createReadStream, existsSync } from 'fs';
import type { Request as ExpressRequest, Response } from 'express';
import { join } from 'path';
import { AiService } from './ai.service';
import { ChartService } from './services/chart.service';
import { ReportService } from './services/report.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { TrialGuard } from '../auth/trial.guard';
import { RequireModules } from '../auth/module-access.decorator';

@UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
@RequireModules('ai')
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly chartService: ChartService,
    private readonly reportService: ReportService,
  ) {}

  private asObject(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : null;
  }

  private asString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private getAuthContext(req: ExpressRequest): {
    userId: string;
    tenantId: string;
    branchId: string;
  } {
    const user = this.asObject(
      (req as ExpressRequest & { user?: unknown }).user,
    );
    return {
      userId: this.asString(user?.userId) || this.asString(user?.sub),
      tenantId: this.asString(user?.tenantId),
      branchId: this.asString(user?.branchId),
    };
  }

  @Post('chat')
  @Permissions('use_ai_assistant')
  async chat(
    @Body() body: { message: string; conversationId?: string },
    @Request() req: ExpressRequest,
  ) {
    const { message, conversationId } = body;
    const { userId, tenantId, branchId } = this.getAuthContext(req);

    const result = await this.aiService.processChat(
      message,
      userId,
      tenantId,
      branchId,
      conversationId,
    );

    // Log the interaction with category and conversationId
    await this.aiService.logInteraction(
      userId,
      tenantId,
      branchId,
      message,
      result.response,
      result.category,
      conversationId,
    );

    return {
      response: result.response,
      suggestions: result.suggestions,
      category: result.category,
      conversationId: result.conversationId || conversationId,
      chartData: result.chartData,
      reportData: result.reportData,
    };
  }

  @Post('feedback')
  @Permissions('use_ai_assistant')
  async submitFeedback(
    @Body()
    body: {
      interactionId: string;
      rating: number;
      feedbackText?: string;
    },
  ) {
    const { interactionId, rating, feedbackText } = body;
    await this.aiService.submitFeedback(interactionId, rating, feedbackText);
    return { success: true };
  }

  @Get('history/:userId')
  @Permissions('use_ai_assistant')
  async getConversationHistory(
    @Param('userId') userId: string,
    @Request() req: ExpressRequest,
    @Query('conversationId') conversationId?: string,
  ) {
    const { tenantId } = this.getAuthContext(req);
    const history = await this.aiService.getConversationHistory(
      userId,
      tenantId,
      conversationId,
    );
    return { history };
  }

  @Get('learning-insights')
  @Permissions('use_ai_assistant')
  async getLearningInsights(@Request() req: ExpressRequest) {
    const { userId, tenantId } = this.getAuthContext(req);
    const insights: unknown = await this.aiService.getLearningInsights(
      userId,
      tenantId,
    );
    return insights;
  }

  @Get('feedback-analysis')
  @Permissions('use_ai_assistant')
  async getFeedbackAnalysis(@Request() req: ExpressRequest) {
    const { userId, tenantId } = this.getAuthContext(req);
    const analysis: unknown = await this.aiService.analyzeFeedbackPatterns(
      userId,
      tenantId,
    );
    return analysis;
  }

  @Get('performance-metrics')
  @Permissions('use_ai_assistant')
  async getPerformanceMetrics(@Request() req: ExpressRequest) {
    const { userId, tenantId } = this.getAuthContext(req);

    const insights = this.asObject(
      await this.aiService.getLearningInsights(userId, tenantId),
    );
    const performanceMetrics =
      this.asObject(insights?.performanceMetrics) ?? {};
    const learningProgress = this.asObject(insights?.learningProgress) ?? {};

    const feedbackAnalysis = this.asObject(
      await this.aiService.analyzeFeedbackPatterns(userId, tenantId),
    );

    const improvementAreasRaw = feedbackAnalysis?.improvementAreas;
    const improvementAreas = Array.isArray(improvementAreasRaw)
      ? improvementAreasRaw
      : [];

    const responsePatterns =
      this.asObject(feedbackAnalysis?.responsePatterns) ?? {};

    return {
      userMetrics: {
        totalInteractions:
          typeof performanceMetrics.totalInteractions === 'number'
            ? performanceMetrics.totalInteractions
            : 0,
        averageRating:
          typeof performanceMetrics.averageRating === 'number'
            ? performanceMetrics.averageRating
            : 0,
        adaptationLevel:
          typeof learningProgress.adaptationLevel === 'number'
            ? learningProgress.adaptationLevel
            : 0,
      },
      systemMetrics: {
        feedbackQuality:
          typeof feedbackAnalysis?.averageRating === 'number'
            ? feedbackAnalysis.averageRating
            : 0,
        improvementAreas,
        responsePatterns,
      },
    };
  }

  @Post('generate-visualization')
  @Permissions('use_ai_assistant')
  async generateVisualization(
    @Body() body: { data: unknown; chartType: string; title: string },
  ) {
    const { data, chartType, title } = body;
    const description = await this.aiService.generateVisualizationWithOpenAI(
      data,
      chartType,
      title,
    );
    return { description };
  }

  // Conversation Management Endpoints
  @Post('conversations')
  @Permissions('use_ai_assistant')
  async createConversation(
    @Body() body: { title?: string },
    @Request() req: ExpressRequest,
  ) {
    const { title } = body;
    const { userId, tenantId, branchId } = this.getAuthContext(req);

    const conversation = await this.aiService.createConversation(
      userId,
      tenantId,
      branchId,
      title,
    );
    return { conversation };
  }

  @Get('conversations')
  @Permissions('use_ai_assistant')
  async getConversations(
    @Request() req: ExpressRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const { userId, tenantId, branchId } = this.getAuthContext(req);

    const conversations = await this.aiService.getConversations(
      userId,
      tenantId,
      branchId,
      limit ? parseInt(limit) : undefined,
      offset ? parseInt(offset) : undefined,
    );
    return { conversations };
  }

  @Get('conversations/:conversationId')
  @Permissions('use_ai_assistant')
  async getConversationById(
    @Param('conversationId') conversationId: string,
    @Request() req: ExpressRequest,
  ) {
    const { userId, tenantId } = this.getAuthContext(req);

    const conversation = await this.aiService.getConversationById(
      conversationId,
      userId,
      tenantId,
    );
    return { conversation };
  }

  @Put('conversations/:conversationId')
  @Permissions('use_ai_assistant')
  async updateConversation(
    @Param('conversationId') conversationId: string,
    @Body() body: { title?: string; isActive?: boolean },
    @Request() req: ExpressRequest,
  ) {
    const { userId, tenantId } = this.getAuthContext(req);

    const result: unknown = await this.aiService.updateConversation(
      conversationId,
      userId,
      tenantId,
      body,
    );
    return { success: true, result };
  }

  @Put('conversations/:conversationId/title')
  @Permissions('use_ai_assistant')
  async generateConversationTitle(
    @Param('conversationId') conversationId: string,
    @Request() req: ExpressRequest,
  ) {
    const { userId, tenantId } = this.getAuthContext(req);

    const title = await this.aiService.generateConversationTitle(
      conversationId,
      userId,
      tenantId,
    );
    return { title };
  }

  @Delete('conversations/:conversationId')
  @Permissions('use_ai_assistant')
  async deleteConversation(
    @Param('conversationId') conversationId: string,
    @Request() req: ExpressRequest,
  ) {
    const { userId, tenantId } = this.getAuthContext(req);

    const success = await this.aiService.deleteConversation(
      conversationId,
      userId,
      tenantId,
    );
    return { success };
  }

  @Get('conversations/:conversationId/context')
  @Permissions('use_ai_assistant')
  async getConversationContext(
    @Param('conversationId') conversationId: string,
    @Request() req: ExpressRequest,
    @Query('maxInteractions') maxInteractions?: string,
  ) {
    const { userId, tenantId } = this.getAuthContext(req);

    const context = await this.aiService.summarizeConversationContext(
      conversationId,
      userId,
      tenantId,
      maxInteractions ? parseInt(maxInteractions) : undefined,
    );
    return { context };
  }

  @Post('generate-chart')
  @Permissions('use_ai_assistant')
  async generateChart(
    @Body()
    body: {
      chartType: string;
      dataType: string;
      period?: string;
      limit?: number;
    },
    @Request() req: ExpressRequest,
  ) {
    const { tenantId, branchId } = this.getAuthContext(req);
    const { chartType, dataType, period, limit } = body;

    let chartConfig: unknown;

    if (dataType === 'product') {
      chartConfig = await this.chartService.generateProductPerformanceChart(
        tenantId,
        branchId,
        chartType as 'bar' | 'pie' | 'doughnut',
        limit || 10,
      );
    } else if (dataType === 'inventory') {
      chartConfig = await this.chartService.generateInventoryChart(
        tenantId,
        branchId,
        chartType as 'bar' | 'pie',
      );
    } else if (dataType === 'customer') {
      chartConfig = await this.chartService.generateCustomerChart(
        tenantId,
        branchId,
        chartType as 'bar' | 'pie' | 'doughnut',
        limit || 10,
      );
    } else {
      chartConfig = await this.chartService.generateSalesChart(
        tenantId,
        branchId,
        chartType as 'line' | 'bar' | 'area',
        (period || '30days') as '7days' | '30days' | '90days' | '1year',
      );
    }

    return { chartConfig };
  }

  @Post('generate-report')
  @Permissions('use_ai_assistant')
  async generateReport(
    @Body()
    body: {
      reportType: string;
      format?: string;
      period?: string;
    },
    @Request() req: ExpressRequest,
  ) {
    const { tenantId, branchId } = this.getAuthContext(req);
    const { reportType, format, period } = body;

    let reportResult: unknown;

    if (reportType === 'inventory') {
      reportResult = await this.reportService.generateInventoryReport(
        tenantId,
        branchId,
        (format || 'xlsx') as 'xlsx' | 'csv',
      );
    } else if (reportType === 'product') {
      reportResult = await this.reportService.generateProductReport(
        tenantId,
        branchId,
        (format || 'xlsx') as 'xlsx' | 'csv',
      );
    } else {
      reportResult = await this.reportService.generateSalesReport(
        tenantId,
        branchId,
        (format || 'xlsx') as 'xlsx' | 'csv',
        (period || '30days') as '7days' | '30days' | '90days' | '1year' | 'all',
      );
    }

    const reportResultObj = this.asObject(reportResult) ?? {};
    return {
      filename: this.asString(reportResultObj.filename),
      downloadUrl: `/api/ai/reports/download/${this.asString(reportResultObj.filename)}`,
      reportType,
      format: format || 'xlsx',
    };
  }

  @Get('reports/download/:filename')
  @Permissions('use_ai_assistant')
  downloadReport(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = join(process.cwd(), 'reports', filename);

    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    createReadStream(filePath).pipe(res);
  }
}
