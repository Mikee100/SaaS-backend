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
import { AiService } from './ai.service';
import { ChartService } from './services/chart.service';
import { ReportService } from './services/report.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { TrialGuard } from '../auth/trial.guard';

@UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly chartService: ChartService,
    private readonly reportService: ReportService,
  ) {}

  @Post('chat')
  @Permissions('use_ai_assistant')
  async chat(
    @Body() body: { message: string; conversationId?: string },
    @Request() req,
  ) {
    const { message, conversationId } = body;
    const userId = req.user.userId || req.user.sub;
    const tenantId = req.user.tenantId;
    const branchId = req.user.branchId;

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
    @Request() req,
    @Query('conversationId') conversationId?: string,
  ) {
    const tenantId = req.user.tenantId;
    const history = await this.aiService.getConversationHistory(
      userId,
      tenantId,
      conversationId,
    );
    return { history };
  }

  @Get('learning-insights')
  @Permissions('use_ai_assistant')
  async getLearningInsights(@Request() req) {
    const userId = req.user.userId || req.user.sub;
    const tenantId = req.user.tenantId;
    const insights = await this.aiService.getLearningInsights(userId, tenantId);
    return insights;
  }

  @Get('feedback-analysis')
  @Permissions('use_ai_assistant')
  async getFeedbackAnalysis(@Request() req) {
    const userId = req.user.userId || req.user.sub;
    const tenantId = req.user.tenantId;
    const analysis = await this.aiService.analyzeFeedbackPatterns(
      userId,
      tenantId,
    );
    return analysis;
  }

  @Get('performance-metrics')
  @Permissions('use_ai_assistant')
  async getPerformanceMetrics(@Request() req) {
    const userId = req.user.userId || req.user.sub;
    const tenantId = req.user.tenantId;

    const insights = await this.aiService.getLearningInsights(userId, tenantId);
    const feedbackAnalysis = await this.aiService.analyzeFeedbackPatterns(
      userId,
      tenantId,
    );

    return {
      userMetrics: {
        totalInteractions: insights.performanceMetrics.totalInteractions,
        averageRating: insights.performanceMetrics.averageRating,
        adaptationLevel: insights.learningProgress.adaptationLevel,
      },
      systemMetrics: {
        feedbackQuality: feedbackAnalysis.averageRating,
        improvementAreas: feedbackAnalysis.improvementAreas,
        responsePatterns: feedbackAnalysis.responsePatterns,
      },
    };
  }

  @Post('generate-visualization')
  @Permissions('use_ai_assistant')
  async generateVisualization(
    @Body() body: { data: any; chartType: string; title: string },
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
    @Request() req,
  ) {
    const { title } = body;
    const userId = req.user.userId || req.user.sub;
    const tenantId = req.user.tenantId;
    const branchId = req.user.branchId;

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
    @Request() req,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const userId = req.user.userId || req.user.sub;
    const tenantId = req.user.tenantId;
    const branchId = req.user.branchId;

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
    @Request() req,
  ) {
    const userId = req.user.userId || req.user.sub;
    const tenantId = req.user.tenantId;

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
    @Request() req,
  ) {
    const userId = req.user.userId || req.user.sub;
    const tenantId = req.user.tenantId;

    const result = await this.aiService.updateConversation(
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
    @Request() req,
  ) {
    const userId = req.user.userId || req.user.sub;
    const tenantId = req.user.tenantId;

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
    @Request() req,
  ) {
    const userId = req.user.userId || req.user.sub;
    const tenantId = req.user.tenantId;

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
    @Request() req,
    @Query('maxInteractions') maxInteractions?: string,
  ) {
    const userId = req.user.userId || req.user.sub;
    const tenantId = req.user.tenantId;

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
    @Request() req,
  ) {
    const tenantId = req.user.tenantId;
    const branchId = req.user.branchId;
    const { chartType, dataType, period, limit } = body;

    let chartConfig;

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
    @Request() req,
  ) {
    const tenantId = req.user.tenantId;
    const branchId = req.user.branchId;
    const { reportType, format, period } = body;

    let reportResult;

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

    return {
      filename: reportResult.filename,
      downloadUrl: `/api/ai/reports/download/${reportResult.filename}`,
      reportType,
      format: format || 'xlsx',
    };
  }

  @Get('reports/download/:filename')
  @Permissions('use_ai_assistant')
  async downloadReport(
    @Param('filename') filename: string,
    @Request() req,
    @Res() res: any,
  ) {
    const { join } = require('path');
    const { existsSync, createReadStream } = require('fs');
    const filePath = join(process.cwd(), 'reports', filename);

    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    createReadStream(filePath).pipe(res);
  }
}
