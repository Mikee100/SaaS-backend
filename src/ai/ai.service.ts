import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BackupService } from '../backup/backup.service';
import { OpenAIConfig } from './config/openai.config';
import { ChatService, ChatContext } from './services/chat.service';
import { DataService } from './services/data.service';
import { ExtractionService } from './services/extraction.service';
import { EmbeddingService } from './services/embedding.service';
import { ChartService } from './services/chart.service';
import { ReportService } from './services/report.service';

interface ChatResult {
  response: string;
  category: string;
  suggestions: string[];
  conversationId?: string;
  followUpQuestions?: string[];
  chartData?: any;
  reportData?: {
    filename: string;
    downloadUrl: string;
    reportType: string;
    format: string;
  };
}

interface PatternAnalysis {
  frequent_keywords: Record<string, number>;
  query_categories: Record<string, number>;
  insights: string[];
}

interface PersonalizedSuggestions {
  personalized_suggestions: string[];
  primary_topic: string;
  confidence: number;
}

interface CommandResult {
  success: boolean;
  message: string;
  action_taken?: string;
  data?: any;
}

@Injectable()
export class AiService {
  constructor(
    private prisma: PrismaService,
    private backupService: BackupService,
    private openaiConfig: OpenAIConfig,
    private chatService: ChatService,
    private dataService: DataService,
    private extractionService: ExtractionService,
    private embeddingService: EmbeddingService,
    private chartService: ChartService,
    private reportService: ReportService,
  ) {}

  async processChat(
    message: string,
    userId: string,
    tenantId: string,
    branchId: string,
    conversationId?: string,
  ): Promise<ChatResult> {
    try {
      // Handle conversation management
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        const newConversation = await this.createConversation(
          userId,
          tenantId,
          branchId,
          this.generateConversationTitleFromMessage(message),
        );
        activeConversationId = newConversation.id;
      }

      if (!activeConversationId) {
        throw new Error('Failed to create or find conversation');
      }

      // Get conversation history
      const conversationHistory = await this.getConversationHistory(
        userId,
        tenantId,
        activeConversationId,
        20,
      );

      // Get business data
      const businessData = await this.dataService.getBusinessData(tenantId, branchId);
      const tenantInfo = await this.dataService.getTenantInfo(tenantId);
      const branchInfo = await this.dataService.getBranchInfo(tenantId, branchId);

      // Build chat context
      const historyMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      for (const interaction of conversationHistory.reverse()) {
        historyMessages.push({ role: 'user', content: interaction.userMessage });
        historyMessages.push({ role: 'assistant', content: interaction.aiResponse });
      }

      const chatContext: ChatContext = {
        conversationHistory: historyMessages,
        businessData,
        tenantInfo,
        branchInfo,
        userPreferences: await this.getUserPreferences(userId, tenantId),
      };

      // Check for commands first
      const extracted = await this.extractionService.extractIntentAndEntities(
        message,
        JSON.stringify(chatContext),
      );

      if (extracted.intent?.startsWith('command_') || this.isCommand(message)) {
        const commandResult = await this.executeCommand(
          message,
          extracted,
          userId,
          tenantId,
          branchId,
        );
        if (commandResult.success) {
          const result: ChatResult = {
            response: commandResult.message,
            category: 'Command Execution',
            suggestions: ['View system status', 'Check command results'],
            conversationId: activeConversationId,
          };

          // Add chart data if chart was generated
          if (commandResult.data?.chartConfig) {
            result.chartData = commandResult.data.chartConfig;
          }

          // Add report data if report was generated
          if (commandResult.data?.downloadUrl) {
            result.reportData = {
              filename: commandResult.data.filename,
              downloadUrl: commandResult.data.downloadUrl,
              reportType: commandResult.data.reportType || 'sales',
              format: commandResult.data.format || 'xlsx',
            };
          }

          return result;
        }
      }

      // Generate AI response
      const chatResponse = await this.chatService.generateResponse(
        message,
        chatContext,
        tenantId,
        branchId,
      );

      return {
        response: chatResponse.response,
        category: chatResponse.category,
        suggestions: chatResponse.suggestions,
        conversationId: activeConversationId,
      };
    } catch (error) {
      console.error('Error processing AI chat:', error);
      return {
        response:
          'Sorry, I encountered an error while processing your request. Please try again.',
        category: 'Error',
        suggestions: [
          'Try asking about sales trends',
          'Check product performance',
          'View revenue summary',
        ],
      };
    }
  }

  private isCommand(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const commandKeywords = [
      'create sale',
      'update inventory',
      'add stock',
      'add stocks',
      'restock',
      'backup data',
      'generate report',
      'create chart',
      'show graph',
      'download report',
      'system status',
    ];
    return commandKeywords.some((keyword) => lowerMessage.includes(keyword));
  }

  private async executeCommand(
    message: string,
    extracted: any,
    userId: string,
    tenantId: string,
    branchId: string,
  ): Promise<CommandResult> {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('backup') || lowerMessage.includes('backup data')) {
      return await this.executeBackupCommand(tenantId);
    }

    if (lowerMessage.includes('system status') || lowerMessage.includes('status')) {
      return await this.executeStatusCommand(tenantId, branchId);
    }

    if (
      lowerMessage.includes('update inventory') ||
      lowerMessage.includes('add stock') ||
      lowerMessage.includes('restock')
    ) {
      return await this.executeUpdateInventoryCommand(
        message,
        extracted,
        tenantId,
        branchId,
      );
    }

      if (
        lowerMessage.includes('generate report') ||
        lowerMessage.includes('sales report') ||
        lowerMessage.includes('download report') ||
        lowerMessage.includes('report')
      ) {
        return await this.executeGenerateReportCommand(
          message,
          extracted,
          tenantId,
          branchId,
        );
      }

      if (
        lowerMessage.includes('create chart') ||
        lowerMessage.includes('show graph') ||
        lowerMessage.includes('generate chart') ||
        lowerMessage.includes('visualize')
      ) {
        return await this.executeGenerateChartCommand(
          message,
          extracted,
          tenantId,
          branchId,
        );
      }

      return {
        success: false,
        message: 'Command not recognized. Please try a different command.',
        action_taken: 'none',
      };
    }

  private async executeBackupCommand(tenantId: string): Promise<CommandResult> {
    try {
      const backupResult = await this.backupService.createBackup(
        `ai-triggered-${tenantId}-${Date.now()}`,
      );
      return {
        success: true,
        message: `Backup initiated successfully. Backup file: ${backupResult.filename} (${(backupResult.size / 1024 / 1024).toFixed(2)} MB)`,
        action_taken: 'backup_initiated',
        data: {
          backupId: backupResult.filename,
          size: backupResult.size,
          createdAt: backupResult.createdAt,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to initiate backup: ${error.message}`,
        action_taken: 'backup_failed',
      };
    }
  }

  private async executeStatusCommand(
    tenantId: string,
    branchId: string,
  ): Promise<CommandResult> {
    try {
      const dbStatus = await this.checkDatabaseStatus();
      const metrics = await this.getSystemMetrics(tenantId, branchId);
      return {
        success: true,
        message: `System Status:\n• Database: ${dbStatus ? 'Connected' : 'Disconnected'}\n• Total Sales: ${metrics.totalSales}\n• Active Users: ${metrics.activeUsers}\n• Last Backup: ${metrics.lastBackup || 'Unknown'}`,
        action_taken: 'status_check',
        data: { dbStatus, metrics },
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Status check failed: ${error.message}`,
        action_taken: 'status_check_failed',
      };
    }
  }

  private async executeUpdateInventoryCommand(
    message: string,
    extracted: any,
    tenantId: string,
    branchId: string,
  ): Promise<CommandResult> {
    try {
      // Enhanced extraction - look for numbers in the message
      const numberMatch = message.match(/\b(\d+)\b/);
      const quantity = numberMatch
        ? parseInt(numberMatch[1])
        : extracted.parameters?.quantity ||
          extracted.parameters?.numbers?.[0] ||
          extracted.entities?.quantity;

      // Enhanced product name extraction
      const productName =
        extracted.entities?.product ||
        extracted.parameters?.productName ||
        this.extractProductNameFromMessage(message);

      if (!quantity || !productName) {
        return {
          success: false,
          message:
            'Stock addition requires specific product name and quantity. Please specify like "add 10 units to product X" or "increase stock of Y by 5".',
          action_taken: 'validation_required',
        };
      }

      const product = await this.prisma.product.findFirst({
        where: {
          tenantId,
          name: {
            contains: productName,
            mode: 'insensitive',
          },
        },
      });

      if (!product) {
        return {
          success: false,
          message: `Product "${productName}" not found.`,
          action_taken: 'product_not_found',
        };
      }

      let inventory = await this.prisma.inventory.findFirst({
        where: {
          productId: product.id,
          tenantId,
          branchId,
        },
      });

      if (!inventory) {
        inventory = await this.prisma.inventory.create({
          data: {
            id: `${tenantId}-${branchId}-${product.id}`,
            productId: product.id,
            tenantId,
            branchId,
            quantity: 0,
            minStock: 5,
            updatedAt: new Date(),
          },
        });
      }

      const newQuantity = inventory.quantity + quantity;
      await this.prisma.inventory.update({
        where: { id: inventory.id },
        data: { quantity: newQuantity },
      });

      const isLowStock = newQuantity <= inventory.minStock;
      let responseMessage = `✅ Successfully updated inventory for "${product.name}"\n`;
      responseMessage += `• Previous quantity: ${inventory.quantity} units\n`;
      responseMessage += `• Added: ${quantity} units\n`;
      responseMessage += `• New quantity: ${newQuantity} units`;

      if (isLowStock) {
        responseMessage += `\n\n⚠️ Warning: Stock level is now low (${newQuantity} units). Consider restocking soon.`;
      }

      return {
        success: true,
        message: responseMessage,
        action_taken: 'inventory_updated',
        data: {
          productId: product.id,
          productName: product.name,
          previousQuantity: inventory.quantity,
          addedQuantity: quantity,
          newQuantity,
          isLowStock,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to update inventory: ${error.message}`,
        action_taken: 'inventory_update_failed',
      };
    }
  }

  private async executeGenerateReportCommand(
    message: string,
    extracted: any,
    tenantId: string,
    branchId: string,
  ): Promise<CommandResult> {
    try {
      const lowerMessage = message.toLowerCase();
      let reportType = 'sales';
      let format: 'xlsx' | 'csv' = 'xlsx';
      let period: '7days' | '30days' | '90days' | '1year' | 'all' = '30days';
      let specificMonth: { year: number; month: number } | undefined;

      // Determine report type
      if (lowerMessage.includes('inventory') || lowerMessage.includes('stock')) {
        reportType = 'inventory';
      } else if (lowerMessage.includes('product')) {
        reportType = 'product';
      }

      // Determine format
      if (lowerMessage.includes('csv') || lowerMessage.includes('excel')) {
        format = lowerMessage.includes('csv') ? 'csv' : 'xlsx';
      }

      // Check for specific month requests
      const monthNames = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ];
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();

      for (let i = 0; i < monthNames.length; i++) {
        if (lowerMessage.includes(monthNames[i])) {
          // Extract year if mentioned, otherwise use current year or previous year if month is in the past
          const yearMatch = message.match(/\b(20\d{2})\b/);
          let year = yearMatch ? parseInt(yearMatch[1]) : currentYear;
          
          // If month is in the future relative to current date, use previous year
          if (i > currentMonth && !yearMatch) {
            year = currentYear - 1;
          }
          
          specificMonth = { year, month: i };
          break;
        }
      }

      // Determine period (only if no specific month)
      if (!specificMonth) {
        if (lowerMessage.includes('7 days') || lowerMessage.includes('week')) {
          period = '7days';
        } else if (lowerMessage.includes('90 days') || lowerMessage.includes('3 months')) {
          period = '90days';
        } else if (lowerMessage.includes('year') || lowerMessage.includes('12 months')) {
          period = '1year';
        } else if (lowerMessage.includes('all') || lowerMessage.includes('everything')) {
          period = 'all';
        } else if (lowerMessage.includes('this month') || lowerMessage.includes('current month')) {
          specificMonth = { year: currentYear, month: currentMonth };
        } else if (lowerMessage.includes('last month') || lowerMessage.includes('previous month')) {
          const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
          specificMonth = { year: lastMonthYear, month: lastMonth };
        }
      }

      let reportResult;
      if (reportType === 'inventory') {
        reportResult = await this.reportService.generateInventoryReport(
          tenantId,
          branchId,
          format,
        );
      } else if (reportType === 'product') {
        reportResult = await this.reportService.generateProductReport(
          tenantId,
          branchId,
          format,
        );
      } else {
        reportResult = await this.reportService.generateSalesReport(
          tenantId,
          branchId,
          format,
          period,
          specificMonth,
        );
      }

      let periodMessage: string = period;
      if (specificMonth) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        periodMessage = `${monthNames[specificMonth.month]} ${specificMonth.year}`;
      }

      return {
        success: true,
        message: `✅ Report generated successfully!\n\n📄 Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report\n📅 Period: ${periodMessage}\n📊 Format: ${format.toUpperCase()}\n📁 Filename: ${reportResult.filename}\n\nYou can download the report using the download link.`,
        action_taken: 'report_generated',
        data: {
          reportType,
          format,
          period: periodMessage,
          filename: reportResult.filename,
          filePath: reportResult.filePath,
          downloadUrl: `/api/ai/reports/download/${reportResult.filename}`,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Report generation failed: ${error.message}`,
        action_taken: 'report_failed',
      };
    }
  }

  private async executeGenerateChartCommand(
    message: string,
    extracted: any,
    tenantId: string,
    branchId: string,
  ): Promise<CommandResult> {
    try {
      const lowerMessage = message.toLowerCase();
      let chartType: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' = 'line';
      let dataType = 'sales';
      let period: '7days' | '30days' | '90days' | '1year' = '30days';
      let limit = 10;

      // Determine chart type
      if (lowerMessage.includes('bar')) {
        chartType = 'bar';
      } else if (lowerMessage.includes('pie')) {
        chartType = 'pie';
      } else if (lowerMessage.includes('doughnut')) {
        chartType = 'doughnut';
      } else if (lowerMessage.includes('area')) {
        chartType = 'area';
      }

      // Determine data type
      if (lowerMessage.includes('product')) {
        dataType = 'product';
      } else if (lowerMessage.includes('inventory') || lowerMessage.includes('stock')) {
        dataType = 'inventory';
      } else if (lowerMessage.includes('customer')) {
        dataType = 'customer';
      }

      // Determine period
      if (lowerMessage.includes('7 days') || lowerMessage.includes('week')) {
        period = '7days';
      } else if (lowerMessage.includes('90 days') || lowerMessage.includes('3 months')) {
        period = '90days';
      } else if (lowerMessage.includes('year') || lowerMessage.includes('12 months')) {
        period = '1year';
      }

      // Extract limit if mentioned
      const limitMatch = message.match(/\b(\d+)\b/);
      if (limitMatch) {
        const num = parseInt(limitMatch[1]);
        if (num > 0 && num <= 50) {
          limit = num;
        }
      }

      let chartConfig;
      if (dataType === 'product') {
        const productChartType = chartType === 'line' || chartType === 'area' ? 'bar' : chartType;
        chartConfig = await this.chartService.generateProductPerformanceChart(
          tenantId,
          branchId,
          productChartType as 'bar' | 'pie' | 'doughnut',
          limit,
        );
      } else if (dataType === 'inventory') {
        const inventoryChartType = chartType === 'line' || chartType === 'area' || chartType === 'doughnut' ? 'bar' : chartType;
        chartConfig = await this.chartService.generateInventoryChart(
          tenantId,
          branchId,
          inventoryChartType as 'bar' | 'pie',
        );
      } else if (dataType === 'customer') {
        const customerChartType = chartType === 'line' || chartType === 'area' ? 'bar' : chartType;
        chartConfig = await this.chartService.generateCustomerChart(
          tenantId,
          branchId,
          customerChartType as 'bar' | 'pie' | 'doughnut',
          limit,
        );
      } else {
        const salesChartType = chartType === 'pie' || chartType === 'doughnut' ? 'line' : chartType;
        chartConfig = await this.chartService.generateSalesChart(
          tenantId,
          branchId,
          salesChartType as 'line' | 'bar' | 'area',
          period,
        );
      }

      return {
        success: true,
        message: `📊 Chart generated successfully!\n\nChart Type: ${chartConfig.type}\nTitle: ${chartConfig.title}\n\nThe chart data is ready to be displayed.`,
        action_taken: 'chart_generated',
        data: {
          chartConfig,
          chartType: chartConfig.type,
          title: chartConfig.title,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Chart generation failed: ${error.message}`,
        action_taken: 'chart_failed',
      };
    }
  }

  private extractProductNameFromMessage(message: string): string | null {
    // Try to extract product name from common patterns
    const patterns = [
      /(?:add|update|increase|set)\s+(?:\d+\s+)?(?:stocks?|units?|items?)\s+(?:to|for|of)\s+(.+?)(?:\s|$|\.|,)/i,
      /(?:product|item)\s+(.+?)(?:\s|$|\.|,)/i,
      /"([^"]+)"/, // Quoted product name
      /'([^']+)'/, // Single quoted product name
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  private async checkDatabaseStatus(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      return false;
    }
  }

  private async getSystemMetrics(
    tenantId: string,
    branchId: string,
  ): Promise<any> {
    try {
      const [totalSales, activeUsers] = await Promise.all([
        this.prisma.sale.count({ where: { tenantId, branchId } }),
        this.prisma.user.count({ where: { tenantId } }),
      ]);

      return {
        totalSales,
        activeUsers,
        lastBackup: null,
      };
    } catch (error) {
      return {
        totalSales: 0,
        activeUsers: 0,
        lastBackup: null,
      };
    }
  }

  private async getUserPreferences(
    userId: string,
    tenantId: string,
  ): Promise<any> {
    try {
      const history = await this.getConversationHistory(userId, tenantId);
      const patterns = await this.analyzePatterns(history);
      return {
        frequentTopics: Object.keys(patterns.query_categories).slice(0, 5),
        insights: patterns.insights,
      };
    } catch (error) {
      return {};
    }
  }

  // Conversation Management Methods (keeping existing methods)
  async getConversationHistory(
    userId: string,
    tenantId: string,
    conversationId?: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<any[]> {
    try {
      const whereClause: any = { userId, tenantId };
      if (conversationId) {
        whereClause.conversationId = conversationId;
      }
      const history = await this.prisma.aIChatInteraction.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });
      return history;
    } catch (error) {
      console.error('Error fetching conversation history:', error);
      return [];
    }
  }

  async createConversation(
    userId: string,
    tenantId: string,
    branchId: string,
    title?: string,
  ): Promise<any> {
    try {
      const conversation = await this.prisma.conversation.create({
        data: {
          userId,
          tenantId,
          branchId,
          title: title || 'New Conversation',
          isActive: true,
        },
      });
      return conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  async getConversations(
    userId: string,
    tenantId: string,
    branchId?: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<any[]> {
    try {
      const whereClause: any = {
        userId,
        tenantId,
        isActive: true,
      };
      if (branchId) {
        whereClause.branchId = branchId;
      }

      const conversations = await this.prisma.conversation.findMany({
        where: whereClause,
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          _count: {
            select: {
              interactions: true,
            },
          },
        },
      });
      return conversations;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }

  async getConversationById(
    conversationId: string,
    userId: string,
    tenantId: string,
  ): Promise<any | null> {
    try {
      const conversation = await this.prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId,
          tenantId,
          isActive: true,
        },
        include: {
          interactions: {
            orderBy: { createdAt: 'asc' },
            take: 50,
          },
          _count: {
            select: {
              interactions: true,
            },
          },
        },
      });
      return conversation;
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return null;
    }
  }

  async updateConversation(
    conversationId: string,
    userId: string,
    tenantId: string,
    updates: { title?: string; isActive?: boolean },
  ): Promise<any> {
    try {
      const conversation = await this.prisma.conversation.updateMany({
        where: {
          id: conversationId,
          userId,
          tenantId,
        },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
      });
      return conversation;
    } catch (error) {
      console.error('Error updating conversation:', error);
      throw error;
    }
  }

  async deleteConversation(
    conversationId: string,
    userId: string,
    tenantId: string,
  ): Promise<boolean> {
    try {
      await this.prisma.conversation.updateMany({
        where: {
          id: conversationId,
          userId,
          tenantId,
        },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });
      return true;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return false;
    }
  }

  async generateConversationTitle(
    conversationId: string,
    userId: string,
    tenantId: string,
  ): Promise<string> {
    try {
      const interactions = await this.prisma.aIChatInteraction.findMany({
        where: {
          conversationId,
          userId,
          tenantId,
        },
        orderBy: { createdAt: 'asc' },
        take: 3,
      });

      if (interactions.length === 0) {
        return 'New Conversation';
      }

      const firstMessage = interactions[0].userMessage;
      if (firstMessage.length > 50) {
        return firstMessage.substring(0, 47) + '...';
      }
      return firstMessage;
    } catch (error) {
      console.error('Error generating conversation title:', error);
      return 'Conversation';
    }
  }

  async summarizeConversationContext(
    conversationId: string,
    userId: string,
    tenantId: string,
    maxInteractions: number = 10,
  ): Promise<string> {
    try {
      const interactions = await this.prisma.aIChatInteraction.findMany({
        where: {
          conversationId,
          userId,
          tenantId,
        },
        orderBy: { createdAt: 'desc' },
        take: maxInteractions,
      });

      if (interactions.length === 0) {
        return '';
      }

      const summary = interactions
        .reverse()
        .map((interaction, index) => {
          const userMsg = interaction.userMessage.substring(0, 100);
          const aiResponse = interaction.aiResponse.substring(0, 150);
          return `Turn ${index + 1}: User asked about "${userMsg}"... AI responded: "${aiResponse}"...`;
        })
        .join(' ');

      return `Previous conversation context: ${summary}`;
    } catch (error) {
      console.error('Error summarizing conversation context:', error);
      return '';
    }
  }

  private generateConversationTitleFromMessage(message: string): string {
    const trimmedMessage = message.trim();
    if (trimmedMessage.length > 50) {
      return trimmedMessage.substring(0, 47) + '...';
    }
    return trimmedMessage || 'New Conversation';
  }

  async analyzePatterns(conversations: any[]): Promise<PatternAnalysis> {
    if (!conversations.length) {
      return { frequent_keywords: {}, query_categories: {}, insights: [] };
    }

    const queries = conversations
      .map((conv) => conv.userMessage || '')
      .filter((q) => q.length > 0);

    const allText = queries.join(' ').toLowerCase();
    const words = allText.split(/\s+/).filter((word) => word.length > 2);

    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'what', 'how', 'why', 'when', 'where', 'who',
    ]);
    const keywords = words.filter((word) => !stopWords.has(word));

    const keywordFreq: Record<string, number> = {};
    keywords.forEach((word) => {
      keywordFreq[word] = (keywordFreq[word] || 0) + 1;
    });

    const categories: Record<string, number> = {};
    queries.forEach((query) => {
      const lower = query.toLowerCase();
      if (lower.includes('best') || lower.includes('top') || lower.includes('performing') || lower.includes('product')) {
        categories['performance_analysis'] = (categories['performance_analysis'] || 0) + 1;
      } else if (lower.includes('sales') || lower.includes('trend') || lower.includes('revenue') || lower.includes('growth')) {
        categories['sales_analysis'] = (categories['sales_analysis'] || 0) + 1;
      } else if (lower.includes('customer') || lower.includes('segment') || lower.includes('churn')) {
        categories['customer_analysis'] = (categories['customer_analysis'] || 0) + 1;
      } else {
        categories['general'] = (categories['general'] || 0) + 1;
      }
    });

    const insights: string[] = [];
    const totalQueries = queries.length;

    if (categories['performance_analysis'] > totalQueries * 0.3) {
      insights.push('You frequently ask about product performance - consider setting up automated performance reports');
    }

    if (categories['sales_analysis'] > totalQueries * 0.3) {
      insights.push('You focus on sales trends - I can help monitor your sales performance regularly');
    }

    return {
      frequent_keywords: keywordFreq,
      query_categories: categories,
      insights,
    };
  }

  async getPersonalizedSuggestions(
    query: string,
    tenantData: any,
    userHistory: any[],
  ): Promise<PersonalizedSuggestions> {
    const topicPreferences: Record<string, number> = {};

    userHistory.forEach((interaction) => {
      const response = interaction.aiResponse || '';
      if (response.toLowerCase().includes('product')) {
        topicPreferences['products'] = (topicPreferences['products'] || 0) + 1;
      }
      if (response.toLowerCase().includes('sales') || response.toLowerCase().includes('revenue')) {
        topicPreferences['sales'] = (topicPreferences['sales'] || 0) + 1;
      }
      if (response.toLowerCase().includes('customer')) {
        topicPreferences['customers'] = (topicPreferences['customers'] || 0) + 1;
      }
    });

    const primaryTopic =
      Object.entries(topicPreferences).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      'general';

    const suggestions: string[] = [];

    if (primaryTopic === 'products') {
      suggestions.push('Check your latest product performance');
      if (tenantData.lowStockCount > 0) {
        suggestions.push('Review products running low on stock');
      }
      suggestions.push('View inventory levels');
    } else if (primaryTopic === 'sales') {
      suggestions.push('Review monthly sales trends');
      suggestions.push('Check revenue forecasts');
      if (tenantData.recentSalesTrend === 'up') {
        suggestions.push("Explore what's driving your recent sales growth");
      }
    } else if (primaryTopic === 'customers') {
      suggestions.push('Analyze customer segments');
      suggestions.push('Check customer retention metrics');
    }

    suggestions.push('View sales analytics dashboard');
    suggestions.push('Check inventory status');
    suggestions.push('Review customer insights');

    return {
      personalized_suggestions: suggestions.slice(0, 4),
      primary_topic: primaryTopic,
      confidence: userHistory.length / 10,
    };
  }

  async logInteraction(
    userId: string,
    tenantId: string,
    branchId: string,
    message: string,
    response: string,
    category: string,
    conversationId?: string,
  ): Promise<void> {
    try {
      await this.prisma.aIChatInteraction.create({
        data: {
          userId,
          tenantId,
          branchId,
          conversationId,
          userMessage: message,
          aiResponse: response,
          metadata: { category },
          createdAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error logging AI interaction:', error);
    }
  }

  async submitFeedback(
    interactionId: string,
    rating: number,
    feedbackText?: string,
  ): Promise<void> {
    try {
      const interaction = await this.prisma.aIChatInteraction.findUnique({
        where: { id: interactionId },
      });
      if (interaction) {
        const metadata = interaction.metadata || {};
        metadata['feedback'] = {
          rating,
          feedbackText,
          submittedAt: new Date(),
        };
        await this.prisma.aIChatInteraction.update({
          where: { id: interactionId },
          data: { metadata },
        });
      }
    } catch (error) {
      console.error('Error submitting AI feedback:', error);
    }
  }

  async analyzeFeedbackPatterns(
    userId: string,
    tenantId: string,
  ): Promise<any> {
    try {
      const allInteractions = await this.prisma.aIChatInteraction.findMany({
        where: {
          userId,
          tenantId,
        },
      });

      const interactionsWithFeedback = allInteractions.filter((interaction) => {
        const metadata = interaction.metadata as any;
        return (
          metadata &&
          metadata.feedback &&
          metadata.feedback.rating !== undefined
        );
      });

      const feedbackAnalysis = {
        totalFeedback: interactionsWithFeedback.length,
        averageRating: 0,
        commonIssues: [] as string[],
        improvementAreas: [] as string[],
        responsePatterns: {} as Record<string, any>,
      };

      if (interactionsWithFeedback.length > 0) {
        const ratings = interactionsWithFeedback.map(
          (i) => (i.metadata as any)?.feedback?.rating || 0,
        );
        feedbackAnalysis.averageRating =
          ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;

        const feedbackTexts = interactionsWithFeedback
          .map((i) => (i.metadata as any)?.feedback?.feedbackText || '')
          .filter((text) => text.length > 0);

        const issueKeywords = {
          'too long': ['long', 'too long', 'verbose', 'lengthy'],
          'not helpful': ['not helpful', 'useless', 'unhelpful', 'not useful'],
          confusing: ['confusing', 'confused', 'unclear', 'complicated'],
          inaccurate: ['wrong', 'incorrect', 'inaccurate', 'not right'],
          'missing info': ['missing', 'incomplete', 'not enough', 'more detail'],
        };

        const issueCounts: Record<string, number> = {};
        feedbackTexts.forEach((text) => {
          const lowerText = text.toLowerCase();
          Object.entries(issueKeywords).forEach(([issue, keywords]) => {
            if (keywords.some((keyword) => lowerText.includes(keyword))) {
              issueCounts[issue] = (issueCounts[issue] || 0) + 1;
            }
          });
        });

        feedbackAnalysis.commonIssues = Object.entries(issueCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([issue]) => issue);

        if (feedbackAnalysis.averageRating < 3) {
          feedbackAnalysis.improvementAreas.push(
            'Overall response quality needs improvement',
          );
        }

        if (issueCounts['too long'] > interactionsWithFeedback.length * 0.2) {
          feedbackAnalysis.improvementAreas.push('Make responses more concise');
        }

        if (
          issueCounts['not helpful'] >
          interactionsWithFeedback.length * 0.2
        ) {
          feedbackAnalysis.improvementAreas.push(
            'Provide more specific and actionable information',
          );
        }

        if (issueCounts['confusing'] > interactionsWithFeedback.length * 0.2) {
          feedbackAnalysis.improvementAreas.push(
            'Use clearer language and structure',
          );
        }

        const categoryPerformance: Record<
          string,
          { total: number; avgRating: number }
        > = {};
        interactionsWithFeedback.forEach((interaction) => {
          const category = (interaction.metadata as any)?.category || 'unknown';
          const rating = (interaction.metadata as any)?.feedback?.rating || 0;

          if (!categoryPerformance[category]) {
            categoryPerformance[category] = { total: 0, avgRating: 0 };
          }
          categoryPerformance[category].total += 1;
          categoryPerformance[category].avgRating =
            (categoryPerformance[category].avgRating *
              (categoryPerformance[category].total - 1) +
              rating) /
            categoryPerformance[category].total;
        });

        feedbackAnalysis.responsePatterns = categoryPerformance;
      }

      return feedbackAnalysis;
    } catch (error) {
      console.error('Error analyzing feedback patterns:', error);
      return {
        totalFeedback: 0,
        averageRating: 0,
        commonIssues: [],
        improvementAreas: [],
        responsePatterns: {},
      };
    }
  }

  async improveResponseBasedOnFeedback(
    query: string,
    category: string,
    userId: string,
    tenantId: string,
  ): Promise<string> {
    try {
      const feedbackAnalysis = await this.analyzeFeedbackPatterns(
        userId,
        tenantId,
      );

      let improvementModifier = '';

      if (
        feedbackAnalysis.improvementAreas.includes(
          'Make responses more concise',
        )
      ) {
        improvementModifier += ' Be more concise and direct.';
      }

      if (
        feedbackAnalysis.improvementAreas.includes(
          'Provide more specific and actionable information',
        )
      ) {
        improvementModifier += ' Include specific data and actionable insights.';
      }

      if (
        feedbackAnalysis.improvementAreas.includes(
          'Use clearer language and structure',
        )
      ) {
        improvementModifier += ' Use clear, simple language and better structure.';
      }

      const categoryRating =
        feedbackAnalysis.responsePatterns[category]?.avgRating || 0;
      if (categoryRating < 3) {
        improvementModifier += ` This ${category.toLowerCase()} response needs special attention for quality.`;
      }

      return improvementModifier;
    } catch (error) {
      console.error('Error generating response improvement:', error);
      return '';
    }
  }

  async getLearningInsights(userId: string, tenantId: string): Promise<any> {
    try {
      const userHistory = await this.getConversationHistory(userId, tenantId);
      const patterns = await this.analyzePatterns(userHistory);
      const feedbackAnalysis = await this.analyzeFeedbackPatterns(
        userId,
        tenantId,
      );

      return {
        conversationInsights: patterns.insights,
        feedbackInsights: feedbackAnalysis.improvementAreas,
        performanceMetrics: {
          totalInteractions: userHistory.length,
          averageRating: feedbackAnalysis.averageRating,
          mostUsedCategory:
            Object.entries(patterns.query_categories).sort(
              ([, a], [, b]) => b - a,
            )[0]?.[0] || 'none',
        },
        learningProgress: {
          hasLearnedPreferences: userHistory.length > 5,
          hasFeedbackData: feedbackAnalysis.totalFeedback > 0,
          adaptationLevel: Math.min(userHistory.length / 20, 1),
        },
      };
    } catch (error) {
      console.error('Error generating learning insights:', error);
      return {
        conversationInsights: [],
        feedbackInsights: [],
        performanceMetrics: {
          totalInteractions: 0,
          averageRating: 0,
          mostUsedCategory: 'none',
        },
        learningProgress: {
          hasLearnedPreferences: false,
          hasFeedbackData: false,
          adaptationLevel: 0,
        },
      };
    }
  }

  async generateVisualizationWithOpenAI(
    data: any,
    chartType: string,
    title: string,
  ): Promise<string> {
    if (!this.openaiConfig.isConfigured()) {
      return this.generateFallbackVisualization(data, chartType, title);
    }

    const client = this.openaiConfig.getClient();
    if (!client) {
      return this.generateFallbackVisualization(data, chartType, title);
    }

    try {
      const prompt = `Create a ${chartType} chart visualization for the following data. Title: "${title}"

Data: ${JSON.stringify(data, null, 2)}

Please generate a detailed description of what this chart would look like, including:
1. Chart type and structure
2. Key data points and trends
3. Visual elements (colors, labels, axes)
4. Insights that can be drawn from the data
5. Any notable patterns or anomalies

Make the description vivid and actionable for someone who wants to understand their business data.`;

      const response = await client.chat.completions.create({
        model: this.openaiConfig.getChatModel(),
        messages: [
          {
            role: 'system',
            content:
              'You are a data visualization expert who creates detailed, accurate descriptions of charts and graphs based on provided data. Focus on business analytics and provide actionable insights.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: this.openaiConfig.getMaxVisualizationTokens(),
        temperature: 0.7,
      });

      return (
        response.choices[0]?.message?.content ||
        this.generateFallbackVisualization(data, chartType, title)
      );
    } catch (error: any) {
      console.error('Error generating visualization with OpenAI:', error);
      return this.generateFallbackVisualization(data, chartType, title);
    }
  }

  private generateFallbackVisualization(
    data: any,
    chartType: string,
    title: string,
  ): string {
    return `## 📊 ${title}\n\n### Chart Type: ${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart\n\n### Data Summary\n- **Available Data Points:** ${Object.keys(data).length}\n\n*Visualization description would be displayed here.*`;
  }
}

