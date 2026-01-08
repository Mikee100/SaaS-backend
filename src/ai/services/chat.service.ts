import { Injectable } from '@nestjs/common';
import { OpenAIConfig } from '../config/openai.config';
import { PrismaService } from '../../prisma.service';
import { ExtractionService, ExtractedData } from './extraction.service';

export interface ChatContext {
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  businessData?: any;
  tenantInfo?: any;
  branchInfo?: any;
  userPreferences?: any;
}

export interface ChatResponse {
  response: string;
  category: string;
  suggestions: string[];
  metadata?: Record<string, any>;
}

@Injectable()
export class ChatService {
  constructor(
    private readonly openaiConfig: OpenAIConfig,
    private readonly prisma: PrismaService,
    private readonly extractionService: ExtractionService,
  ) {}

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
      // Extract intent and entities first
      const extracted = await this.extractionService.extractIntentAndEntities(
        message,
        JSON.stringify(context),
      );

      // Build system prompt with business context
      const systemPrompt = this.buildSystemPrompt(context, tenantId, branchId);

      // Build conversation messages
      const messages = this.buildMessages(message, context, systemPrompt);

      // Generate response using OpenAI with token limit for cost control
      const response = await client.chat.completions.create({
        model: this.openaiConfig.getChatModel(),
        messages,
        temperature: 0.7, // Slightly lower for more focused responses
        max_tokens: this.openaiConfig.getMaxChatTokens(),
        top_p: 0.9,
      });

      const aiResponse = response.choices[0]?.message?.content || '';
      const suggestions = await this.generateSuggestions(
        message,
        aiResponse,
        extracted,
        context,
      );

      return {
        response: aiResponse,
        category: extracted.category || 'general',
        suggestions,
        metadata: {
          intent: extracted.intent,
          confidence: extracted.confidence,
          model: this.openaiConfig.getChatModel(),
        },
      };
    } catch (error: any) {
      console.error('Error generating chat response:', error);
      return this.fallbackResponse(message, context);
    }
  }

  private buildSystemPrompt(
    context: ChatContext,
    tenantId: string,
    branchId: string,
  ): string {
    const businessName = context.tenantInfo?.name || 'this business';
    const businessType = context.tenantInfo?.businessType || 'business';
    const maxTokens = this.openaiConfig.getMaxChatTokens();
    
    let prompt = `You are an intelligent AI business assistant specifically tuned for ${businessName}, a ${businessType} business. You have deep knowledge of THIS SPECIFIC BUSINESS's operations, products, sales, inventory, and customers.

YOUR ROLE:
You are a trusted business advisor who knows ${businessName} inside and out. You understand their products, sales patterns, inventory levels, customer behavior, and business operations. You provide intelligent, data-driven insights specific to THIS BUSINESS.

CAPABILITIES:
You can perform actionable commands including:
- Update inventory: "add 10 stocks to product X", "restock product Y by 5 units"
- Generate reports: "generate sales report", "download inventory report as Excel", "December sales report", "this month's report"
- Create charts: "show sales chart", "create product performance bar chart", "visualize inventory levels"
- Answer questions about sales, products, inventory, and customers
- Generate reports for specific months: "December sales report", "January 2026 report", "last month's sales"

CRITICAL INSTRUCTIONS:
1. ALWAYS use the ACTUAL business data provided below - this is REAL data from ${businessName}
2. Be SPECIFIC to this business - reference actual product names, customer names, and real numbers
3. Analyze patterns and trends in THIS business's data - don't give generic advice
4. When discussing products, use the REAL product names and performance data from this business
5. When discussing sales, use the ACTUAL revenue numbers, trends, and patterns from this business
6. When discussing inventory, reference the ACTUAL stock levels and items for this business
7. When discussing customers, use the REAL customer data and purchasing patterns
8. Format currency appropriately (detect if it's KES/Ksh or USD/$ from the data)
9. Provide actionable, business-specific recommendations based on THIS business's actual performance
10. Be conversational but professional - like a knowledgeable consultant who knows this business well
11. If asked about something not in the data, acknowledge it and suggest what would help
12. Compare current performance to historical patterns when relevant
13. Identify opportunities and risks specific to THIS business
14. When users ask for charts or reports, acknowledge that you can generate them and suggest appropriate types
15. For inventory updates, confirm the product name and quantity before executing

RESPONSE STYLE:
- Use the business name naturally in conversation
- Reference specific products, customers, or metrics when relevant
- Provide context about what the numbers mean for THIS business
- Give recommendations tailored to THIS business's situation
- Be insightful, not just descriptive
- Be CONCISE - prioritize key insights and actionable information
- Use bullet points and numbered lists for clarity
- Focus on the most important data points
- Maximum response length: ${maxTokens} tokens - keep responses focused and concise

`;

    // Build comprehensive business context
    if (context.businessData) {
      const data = context.businessData;
      prompt += `\n=== BUSINESS DATA ===\n`;
      
      if (data.sales) {
        prompt += `\nSALES PERFORMANCE DATA (${businessName}):\n`;
        prompt += `- Total All-Time Revenue: ${data.sales.totalRevenue || 0}\n`;
        prompt += `- Total Sales Transactions: ${data.sales.totalSales || 0}\n`;
        prompt += `- Recent Revenue (Last 30 days): ${data.sales.recentRevenue || 0}\n`;
        prompt += `- Weekly Revenue (Last 7 days): ${data.sales.weeklyRevenue || 0}\n`;
        prompt += `- Today's Revenue: ${data.sales.todayRevenue || 0} (${data.sales.todaySalesCount || 0} sales today)\n`;
        prompt += `- Average Sale Value: ${data.sales.averageSale || 0}\n`;
        prompt += `- Highest Single Sale: ${data.sales.highestSale || 0}\n`;
        prompt += `- Lowest Single Sale: ${data.sales.lowestSale || 0}\n`;
        prompt += `- Daily Average Revenue: ${data.sales.dailyAverage || 0}\n`;
        prompt += `- Sales Trend: ${data.sales.trend || 'stable'} (${data.sales.trendPercentage || 0}% change)\n`;
        prompt += `- Recent Sales Count (30 days): ${data.sales.recentSalesCount || 0}\n`;
        
        if (data.sales.bestMonth) {
          prompt += `\n🏆 BEST PERFORMING MONTH: ${data.sales.bestMonth.month} - Revenue: ${data.sales.bestMonth.revenue}, Sales: ${data.sales.bestMonth.count}\n`;
        }
        
        if (data.sales.monthlySales && data.sales.monthlySales.length > 0) {
          prompt += `\nMONTHLY SALES BREAKDOWN (Ranked by Revenue):\n`;
          data.sales.monthlySales.slice(0, 12).forEach((month: any, index: number) => {
            prompt += `${index + 1}. ${month.month}: Revenue ${month.revenue}, Sales Count ${month.count}\n`;
          });
        }
        
        if (data.sales.currentYearMonthly && data.sales.currentYearMonthly.length > 0) {
          prompt += `\nCURRENT YEAR (${new Date().getFullYear()}) MONTHLY BREAKDOWN:\n`;
          data.sales.currentYearMonthly.forEach((month: any) => {
            prompt += `- ${month.month}: Revenue ${month.revenue}, Sales ${month.count}\n`;
          });
        }
      }

      if (data.products && data.products.topProducts) {
        prompt += `\nPRODUCT PERFORMANCE DATA:\n`;
        prompt += `Total Products in Catalog: ${data.products.totalProducts || 0}\n`;
        if (data.products.metrics) {
          prompt += `Total Product Revenue: ${data.products.metrics.totalProductRevenue || 0}\n`;
          prompt += `Average Product Revenue: ${data.products.metrics.averageProductRevenue || 0}\n`;
          if (data.products.metrics.bestPerformer) {
            prompt += `Best Performing Product: ${data.products.metrics.bestPerformer.name} (Revenue: ${data.products.metrics.bestPerformer.revenue})\n`;
          }
        }
        prompt += `\nTOP PRODUCTS BY REVENUE (${businessName}'s actual products):\n`;
        data.products.topProducts.forEach((product: any, index: number) => {
          prompt += `${index + 1}. "${product.name}" - Revenue: ${product.revenue || 0}, Units Sold: ${product.quantity || 0}, Sales Transactions: ${product.salesCount || 0}, Price: ${product.price || product.averagePrice || 0}\n`;
          if (product.description) {
            prompt += `   Description: ${product.description}\n`;
          }
        });
        if (data.products.allProducts && data.products.allProducts.length > 0) {
          prompt += `\nAdditional Products in Catalog:\n`;
          data.products.allProducts.slice(0, 15).forEach((product: any) => {
            prompt += `- ${product.name} (Price: ${product.price || 0})\n`;
          });
        }
      }

      if (data.inventory) {
        prompt += `\nINVENTORY STATUS (${businessName}):\n`;
        prompt += `- Total Inventory Items: ${data.inventory.totalItems || 0}\n`;
        prompt += `- Low Stock Items (needs attention): ${data.inventory.lowStockCount || 0}\n`;
        prompt += `- Out of Stock Items: ${data.inventory.outOfStockCount || 0}\n`;
        prompt += `- Total Inventory Value: ${data.inventory.totalValue || 0}\n`;
        if (data.inventory.items && data.inventory.items.length > 0) {
          prompt += `\nCurrent Stock Levels:\n`;
          data.inventory.items.slice(0, 20).forEach((item: any) => {
            const statusEmoji = item.status === 'out' ? '🔴' : item.status === 'low' ? '🟡' : '🟢';
            prompt += `${statusEmoji} ${item.name}: ${item.quantity} units (Min: ${item.minStock}, Status: ${item.status})\n`;
          });
          if (data.inventory.lowStockCount > 0) {
            const lowStockItems = data.inventory.items.filter((item: any) => item.status === 'low' || item.status === 'out');
            prompt += `\n⚠️ Items Requiring Attention:\n`;
            lowStockItems.forEach((item: any) => {
              prompt += `- ${item.name}: Only ${item.quantity} units left (Min: ${item.minStock})\n`;
            });
          }
        }
      }

      if (data.customers) {
        prompt += `\nCUSTOMER DATA (${businessName}'s customers):\n`;
        prompt += `- Total Unique Customers: ${data.customers.totalCustomers || 0}\n`;
        prompt += `- Active Customers (Last 30 days): ${data.customers.activeCustomers || 0}\n`;
        prompt += `- Customer Retention Rate: ${data.customers.retentionRate || 0}%\n`;
        if (data.customers.topCustomers && data.customers.topCustomers.length > 0) {
          prompt += `\nTop Customers by Revenue (${businessName}'s best customers):\n`;
          const totalTopCustomerRevenue = data.customers.topCustomers.reduce((sum: number, c: any) => sum + (c.revenue || 0), 0);
          data.customers.topCustomers.forEach((customer: any, index: number) => {
            const percentage = totalTopCustomerRevenue > 0 ? Math.round((customer.revenue / totalTopCustomerRevenue) * 100) : 0;
            prompt += `${index + 1}. "${customer.name}" - Total Revenue: ${customer.revenue || 0}, Purchase Count: ${customer.purchaseCount || 0}, Contribution: ${percentage}%\n`;
          });
        }
      }

      if (data.summary) {
        prompt += `\nBUSINESS SUMMARY:\n`;
        prompt += `- Total Revenue: ${data.summary.totalRevenue || 0}\n`;
        prompt += `- Total Sales: ${data.summary.totalSales || 0}\n`;
        prompt += `- Low Stock Items: ${data.summary.lowStockItems || 0}\n`;
        prompt += `- Total Customers: ${data.summary.totalCustomers || 0}\n`;
        prompt += `- Total Products: ${data.summary.totalProducts || 0}\n`;
      }
    }

    if (context.tenantInfo) {
      prompt += `\n=== BUSINESS INFORMATION ===\n`;
      prompt += `Business Name: ${context.tenantInfo.name || 'Not specified'}\n`;
      prompt += `Business Type: ${context.tenantInfo.businessType || 'Not specified'}\n`;
      prompt += `Contact: ${context.tenantInfo.contactEmail || 'Not specified'}\n`;
      prompt += `Location: ${context.tenantInfo.city || ''}, ${context.tenantInfo.country || ''}\n`;
    }

    if (context.branchInfo) {
      prompt += `\n=== BRANCH INFORMATION ===\n`;
      prompt += `Branch Name: ${context.branchInfo.name || 'Not specified'}\n`;
      prompt += `Location: ${context.branchInfo.city || ''}, ${context.branchInfo.country || ''}\n`;
    }

    if (context.userPreferences) {
      prompt += `\n=== USER PREFERENCES ===\n`;
      prompt += `Frequent Topics: ${context.userPreferences.frequentTopics?.join(', ') || 'None'}\n`;
    }

    prompt += `\n=== END OF BUSINESS DATA ===\n\n`;
    prompt += `REMEMBER: You are specifically tuned to ${businessName}. When answering questions:\n`;
    prompt += `- Use the ACTUAL product names, customer names, and numbers from above\n`;
    prompt += `- Reference specific performance metrics for THIS business\n`;
    prompt += `- Provide insights relevant to THIS business's situation\n`;
    prompt += `- Make recommendations based on THIS business's actual data\n`;
    prompt += `- Be specific - don't give generic advice, give advice for ${businessName}\n`;
    prompt += `- If asked "What are the best performing products?" - list the ACTUAL top products from the data above with their REAL names and numbers\n`;
    prompt += `- If asked about sales - use the REAL revenue numbers and trends from above\n`;
    prompt += `- If asked about inventory - reference the ACTUAL stock levels and items\n`;
    prompt += `- If asked about customers - use the REAL customer data and names\n`;
    prompt += `\nYou know this business intimately. Answer as if you've been working with ${businessName} for years.`;

    return prompt;
  }

  private buildMessages(
    message: string,
    context: ChatContext,
    systemPrompt: string,
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

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

  private async generateSuggestions(
    message: string,
    response: string,
    extracted: ExtractedData,
    context: ChatContext,
  ): Promise<string[]> {
    const suggestions: string[] = [];

    // Generate contextual suggestions based on category
    switch (extracted.category) {
      case 'sales':
        suggestions.push('View sales trends', 'Check revenue reports', 'Analyze product performance');
        break;
      case 'inventory':
        suggestions.push('Check stock levels', 'View low stock items', 'Review inventory reports');
        break;
      case 'customers':
        suggestions.push('View customer insights', 'Check top customers', 'Analyze customer segments');
        break;
      case 'products':
        suggestions.push('View product performance', 'Check product details', 'Review product reports');
        break;
      default:
        suggestions.push('View sales dashboard', 'Check inventory status', 'Review customer insights');
    }

    return suggestions.slice(0, 4);
  }

  private async fallbackResponse(
    message: string,
    context: ChatContext,
  ): Promise<ChatResponse> {
    const lowerMessage = message.toLowerCase();
    let response = "I'm here to help with your business questions! ";
    let category = 'general';

    if (lowerMessage.includes('sales') || lowerMessage.includes('revenue')) {
      response +=
        'You can ask me about sales trends, revenue reports, and product performance.';
      category = 'sales';
    } else if (lowerMessage.includes('inventory') || lowerMessage.includes('stock')) {
      response +=
        'I can help you check inventory levels, stock status, and low stock alerts.';
      category = 'inventory';
    } else if (lowerMessage.includes('customer')) {
      response +=
        'I can provide customer insights, top customers, and customer analytics.';
      category = 'customers';
    } else {
      response +=
        'You can ask me about sales, inventory, customers, products, or any other business data.';
    }

    return {
      response,
      category,
      suggestions: [
        'View sales dashboard',
        'Check inventory status',
        'Review customer insights',
        'View product reports',
      ],
    };
  }
}

