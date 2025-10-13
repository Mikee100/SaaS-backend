import { Controller, Post, Body, UseGuards, Request, Get, Param, Put, Query } from '@nestjs/common';
import { AiService } from './ai.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @Permissions('use_ai_assistant')
  async chat(@Body() body: { message: string; conversationId?: string }, @Request() req) {
    const { message, conversationId } = body;
    const userId = req.user.userId || req.user.sub;
    const tenantId = req.user.tenantId;
    const branchId = req.user.branchId;

    const result = await this.aiService.processChat(message, userId, tenantId, branchId, conversationId);

    // Log the interaction with category and conversationId
    await this.aiService.logInteraction(userId, tenantId, branchId, message, result.response, result.category, conversationId);

    return {
      response: result.response,
      suggestions: result.suggestions,
      category: result.category,
      conversationId: result.conversationId || conversationId
    };
  }

  @Post('feedback')
  @Permissions('use_ai_assistant')
  async submitFeedback(@Body() body: { interactionId: string; rating: number; feedbackText?: string }) {
    const { interactionId, rating, feedbackText } = body;
    await this.aiService.submitFeedback(interactionId, rating, feedbackText);
    return { success: true };
  }

  @Get('history/:userId')
  @Permissions('use_ai_assistant')
  async getConversationHistory(@Param('userId') userId: string, @Request() req, @Query('conversationId') conversationId?: string) {
    const tenantId = req.user.tenantId;
    const history = await this.aiService.getConversationHistory(userId, tenantId, conversationId);
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
    const analysis = await this.aiService.analyzeFeedbackPatterns(userId, tenantId);
    return analysis;
  }

  @Get('performance-metrics')
  @Permissions('use_ai_assistant')
  async getPerformanceMetrics(@Request() req) {
    const userId = req.user.userId || req.user.sub;
    const tenantId = req.user.tenantId;

    const insights = await this.aiService.getLearningInsights(userId, tenantId);
    const feedbackAnalysis = await this.aiService.analyzeFeedbackPatterns(userId, tenantId);

    return {
      userMetrics: {
        totalInteractions: insights.performanceMetrics.totalInteractions,
        averageRating: insights.performanceMetrics.averageRating,
        adaptationLevel: insights.learningProgress.adaptationLevel
      },
      systemMetrics: {
        feedbackQuality: feedbackAnalysis.averageRating,
        improvementAreas: feedbackAnalysis.improvementAreas,
        responsePatterns: feedbackAnalysis.responsePatterns
      }
    };
  }

  @Post('generate-visualization')
  @Permissions('use_ai_assistant')
  async generateVisualization(@Body() body: { data: any; chartType: string; title: string }) {
    const { data, chartType, title } = body;
    const description = await this.aiService.generateVisualizationWithOpenAI(data, chartType, title);
    return { description };
  }
}
