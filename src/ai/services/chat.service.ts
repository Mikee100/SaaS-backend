import { Injectable } from '@nestjs/common';
import { OpenAIConfig } from '../config/openai.config';
import { PrismaService } from '../../prisma.service';
import { FormatterService } from './formatter.service';
import {
  SYSTEM_IDENTITY,
  ACTION_GUIDELINES,
  DATA_GUIDELINES,
} from '../prompts/system.instructions';
import { AI_TOOLS } from '../constants/tools';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { ContextSelectorService } from './context-selector.service';
import { DataService } from './data.service';

export interface ChatContext {
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  businessData?: unknown;
  tenantInfo?: unknown;
  branchInfo?: unknown;
  userPreferences?: unknown;
}

export interface ChatResponse {
  response: string;
  category: string;
  suggestions: string[];
  metadata?: Record<string, unknown>;
  toolCalls?: unknown[];
}

@Injectable()
export class ChatService {
  constructor(
    private readonly openaiConfig: OpenAIConfig,
    private readonly prisma: PrismaService,
    private readonly formatter: FormatterService,
    private readonly contextSelector: ContextSelectorService,
    private readonly dataService: DataService,
  ) {}

  private asObject(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : null;
  }

  private asString(value: unknown, fallback: string = ''): string {
    return typeof value === 'string' ? value : fallback;
  }

  private asNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (typeof value === 'bigint') {
      return Number(value);
    }
    return 0;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }

  async generateResponse(
    message: string,
    context: ChatContext,
    tenantId: string,
    branchId: string,
  ): Promise<ChatResponse> {
    if (!this.openaiConfig.isConfigured()) {
      return this.fallbackResponse(message, context);
    }

    const client = this.openaiConfig.getClient();
    if (!client) {
      return this.fallbackResponse(message, context);
    }

    try {
      // 1. Classify the message to determine which data slices are needed (RAG)
      const lastAiResponse = context.conversationHistory?.slice(-1)[0]?.content;
      const needs = this.contextSelector.classify(
        message,
        context.conversationHistory?.[context.conversationHistory.length - 1]
          ?.role === 'assistant'
          ? context.conversationHistory[context.conversationHistory.length - 1]
              ?.content
          : lastAiResponse,
      );

      // 2. Fetch only the needed data slices
      const selectiveData: unknown = await this.dataService.getSelectiveData(
        tenantId,
        branchId,
        needs,
      );

      // 3. Build system prompt with only the relevant context
      const systemPrompt = this.buildSystemPrompt(context, selectiveData);

      // Build conversation messages
      const messages = this.buildMessages(message, context, systemPrompt);

      // Generate response using OpenAI with Tools enabled
      const response = await client.chat.completions.create({
        model: this.openaiConfig.getChatModel(),
        messages: messages as ChatCompletionMessageParam[],
        tools: AI_TOOLS,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: this.openaiConfig.getMaxChatTokens(),
        top_p: 0.9,
      });

      const messageResult = response.choices[0]?.message;
      const aiResponse = messageResult?.content || '';
      const toolCalls = messageResult?.tool_calls;

      // Determine category based on tool calls or simple content check
      let category = 'general';
      if (toolCalls && toolCalls.length > 0) {
        const firstToolCall = this.asObject(toolCalls[0]);
        const functionData = this.asObject(firstToolCall?.function);
        const firstTool = this.asString(functionData?.name);
        if (firstTool === 'generate_chart') category = 'charts';
        else if (firstTool === 'generate_report') category = 'reports';
        else if (firstTool === 'update_inventory') category = 'inventory';
      }

      const suggestions = this.generateSuggestions(
        message,
        aiResponse,
        category,
      );

      return {
        response: aiResponse,
        category,
        suggestions,
        toolCalls: toolCalls ? (toolCalls as unknown[]) : undefined,
        metadata: {
          model: this.openaiConfig.getChatModel(),
          hasToolCalls: !!toolCalls,
        },
      };
    } catch (error: unknown) {
      console.error('Error generating chat response:', error);
      return this.fallbackResponse(message, context);
    }
  }

  private buildSystemPrompt(
    context: ChatContext,
    selectiveData: unknown,
  ): string {
    const tenantInfo = this.asObject(context.tenantInfo) ?? {};
    const bizName = this.asString(tenantInfo.name, 'this business');
    const bizType = this.asString(tenantInfo.businessType, 'business');
    const maxTokens = this.openaiConfig.getMaxChatTokens();

    let prompt = SYSTEM_IDENTITY(bizName, bizType);
    prompt += ACTION_GUIDELINES;
    prompt += DATA_GUIDELINES(maxTokens, bizName);

    // Only inject data sections that were actually fetched (RAG)
    const selectiveDataObj = this.asObject(selectiveData) ?? {};
    const hasAnyData = Object.keys(selectiveDataObj).some(
      (k) => k !== 'summary',
    );
    if (hasAnyData) {
      prompt += `\n=== BUSINESS DATA ===\n`;
      if (selectiveDataObj.sales)
        prompt += this.formatter.formatSalesData(
          selectiveDataObj.sales,
          bizName,
        );
      if (selectiveDataObj.products)
        prompt += this.formatter.formatProductData(
          selectiveDataObj.products,
          bizName,
        );
      if (selectiveDataObj.inventory)
        prompt += this.formatter.formatInventoryData(
          selectiveDataObj.inventory,
          bizName,
        );
      if (selectiveDataObj.customers)
        prompt += this.formatter.formatCustomerData(
          selectiveDataObj.customers,
          bizName,
        );
      if (selectiveDataObj.creditors)
        prompt += this.formatter.formatCreditorData(
          selectiveDataObj.creditors,
          bizName,
        );
      if (selectiveDataObj.expenses)
        prompt += this.formatter.formatExpenseData(
          selectiveDataObj.expenses,
          bizName,
        );
    } else if (selectiveDataObj.summary) {
      // Lightweight summary for general chat
      const s = this.asObject(selectiveDataObj.summary) ?? {};
      prompt += `\n=== BUSINESS SNAPSHOT ===\nTotal Sales: ${this.asNumber(s.totalSales)}, Products: ${this.asNumber(s.totalProducts)}, Customers: ${this.asNumber(s.totalCustomers)}\n`;
    }

    prompt += this.formatter.formatGeneralInfo(context);
    prompt += `\n=== END OF DATA ===\n\n`;
    prompt += `REMEMBER: Answer like a trusted human partner for ${bizName}.`;

    return prompt;
  }

  private buildMessages(
    message: string,
    context: ChatContext,
    systemPrompt: string,
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }> = [{ role: 'system', content: systemPrompt }];

    // Add conversation history if available
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      // Limit to last 10 messages to avoid token limits
      const recentHistory = context.conversationHistory.slice(-10);
      for (const msg of recentHistory) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Add current message
    messages.push({ role: 'user', content: message });

    return messages;
  }

  private generateSuggestions(
    message: string,
    response: string,
    category: string,
  ): string[] {
    void message;
    void response;
    const suggestions: string[] = [];

    // Generate contextual suggestions based on category
    switch (category) {
      case 'sales':
        suggestions.push(
          'View sales trends',
          'Check revenue reports',
          'Analyze product performance',
        );
        break;
      case 'inventory':
        suggestions.push(
          'Check stock levels',
          'View low stock items',
          'Review inventory reports',
        );
        break;
      case 'customers':
        suggestions.push(
          'View customer insights',
          'Check top customers',
          'Analyze customer segments',
        );
        break;
      case 'products':
        suggestions.push(
          'View product performance',
          'Check product details',
          'Review product reports',
        );
        break;
      case 'creditors':
        suggestions.push(
          'Show all our suppliers',
          'List overdue customer credits',
          'Which customers owe us money?',
          'Show supplier contact details',
        );
        break;
      case 'expenses':
        suggestions.push(
          'Break down expenses by category',
          'Show recurring expenses',
          'Compare expenses to last month',
          'What are our biggest costs?',
        );
        break;
      default:
        suggestions.push(
          'View sales dashboard',
          'Check inventory status',
          'Review customer insights',
        );
    }

    return suggestions.slice(0, 4);
  }

  private fallbackResponse(
    message: string,
    context: ChatContext,
  ): ChatResponse {
    void context;
    const lowerMessage = message.toLowerCase();
    let response = "Hey there! I'm ready to help you out with the business. ";
    let category = 'general';

    if (lowerMessage.includes('sales') || lowerMessage.includes('revenue')) {
      response +=
        "I'd be happy to walk you through our sales trends, revenue reports, or how specific products are doing. What would you like to see?";
      category = 'sales';
    } else if (
      lowerMessage.includes('inventory') ||
      lowerMessage.includes('stock')
    ) {
      response +=
        "Let's take a look at the shelves. I can help you check inventory levels, see what's running low, or manage stock.";
      category = 'inventory';
    } else if (lowerMessage.includes('customer')) {
      response +=
        "I love talking about our customers! I can pull up some insights, show you our top buyers, or run some analytics. What's on your mind?";
      category = 'customers';
    } else if (
      lowerMessage.includes('creditor') ||
      lowerMessage.includes('supplier') ||
      lowerMessage.includes('vendor') ||
      lowerMessage.includes('owe') ||
      lowerMessage.includes('credit') ||
      lowerMessage.includes('outstanding') ||
      lowerMessage.includes('overdue') ||
      lowerMessage.includes('payable')
    ) {
      response +=
        "I can pull up information on our suppliers and any outstanding customer credits. I'll show you who we work with and where money is still outstanding.";
      category = 'creditors';
    } else if (
      lowerMessage.includes('expense') ||
      lowerMessage.includes('cost') ||
      lowerMessage.includes('spending') ||
      lowerMessage.includes('salary') ||
      lowerMessage.includes('payroll') ||
      lowerMessage.includes('bills')
    ) {
      response +=
        'Let me pull together the business expense breakdown — I can show you category totals, recurring commitments, and where the biggest costs are.';
      category = 'expenses';
    } else {
      response +=
        'I can help you look at sales, manage inventory, understand our customers, review suppliers and creditors, or analyse business expenses. Just let me know what you need!';
    }

    return {
      response,
      category,
      suggestions: [
        'View sales dashboard',
        'Check inventory status',
        'Review customer insights',
        'Tell me about our suppliers',
        'Show me business expenses',
      ],
    };
  }
}
