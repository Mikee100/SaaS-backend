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
} from '@nestjs/common';
import { AiService } from './ai.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { TrialGuard } from '../auth/trial.guard';

@UseGuards(AuthGuard('jwt'), PermissionsGuard, TrialGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

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
}
