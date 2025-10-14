import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import axios from 'axios';
import OpenAI from 'openai';

const FLASK_AI_URL = process.env.FLASK_AI_URL || 'http://localhost:5001';

interface ChatResult {
  response: string;
  category: string;
  suggestions: string[];
  conversationId?: string;
  followUpQuestions?: string[];
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

interface DetectedCommand {
  command: string;
  parameters: Record<string, any>;
  confidence: number;
}

@Injectable()
export class AiService {
  private openai: OpenAI | null = null;

  constructor(private prisma: PrismaService) {
    // Only initialize OpenAI if API key is available
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '') {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    } else {
      console.log('OpenAI API key not configured. AI features will use fallback methods.');
    }
  }

  async processChat(message: string, userId: string, tenantId: string, branchId: string, conversationId?: string): Promise<ChatResult> {
    const lowerMessage = message.toLowerCase();

    try {
      // Get user history for personalization
      const userHistory = await this.getConversationHistory(userId, tenantId);
      const tenantData = await this.getTenantBusinessData(tenantId, branchId);

      // Analyze patterns and personalize
      const patterns = await this.analyzePatterns(userHistory);
      const personalized = await this.getPersonalizedSuggestions(message, tenantData, userHistory);

      // Determine response category for feedback-based improvement
      let responseCategory = 'General';
      if (lowerMessage.includes('best performing product') || lowerMessage.includes('top product')) {
        responseCategory = 'Best Performing Products';
      } else if (lowerMessage.includes('best performing month') || lowerMessage.includes('highest sales month')) {
        responseCategory = 'Best Performing Months';
      } else if (lowerMessage.includes('sales trend') || lowerMessage.includes('sales performance')) {
        responseCategory = 'Sales Trends';
      } else if (lowerMessage.includes('total revenue') || lowerMessage.includes('revenue')) {
        responseCategory = 'Total Revenue';
      }

      // Initialize enhanced suggestions early
      let enhancedSuggestions: string[] = personalized.personalized_suggestions;

      // Handle chart/graph/visualization requests FIRST (before command detection)
      if (lowerMessage.includes('chart') || lowerMessage.includes('graph') || lowerMessage.includes('visualization') || lowerMessage.includes('visualize')) {
        // Detect what type of chart/visualization is requested
        let chartType = 'bar'; // default
        let chartTitle = 'Data Visualization';
        let chartData: any = {};

        if (lowerMessage.includes('sold items') || lowerMessage.includes('sales') || lowerMessage.includes('products sold')) {
          // Get sold items data
          const saleItems = await this.prisma.saleItem.findMany({
            where: {
              sale: {
                tenantId,
                branchId
              }
            },
            include: {
              product: {
                select: {
                  name: true
                }
              }
            },
            take: 20
          });

          const productSales = saleItems.reduce((acc, item) => {
            const productName = item.product.name;
            if (!acc[productName]) {
              acc[productName] = 0;
            }
            acc[productName] += item.quantity;
            return acc;
          }, {} as Record<string, number>);

          chartData = {
            labels: Object.keys(productSales),
            values: Object.values(productSales),
            type: 'product_sales'
          };
          chartType = 'bar';
          chartTitle = 'Items Sold by Product';
        } else if (lowerMessage.includes('sales trend') || lowerMessage.includes('revenue over time')) {
          // Get sales trend data
          const sales = await this.prisma.sale.findMany({
            where: {
              tenantId,
              branchId,
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              }
            },
            select: {
              total: true,
              createdAt: true
            },
            orderBy: { createdAt: 'asc' }
          });

          const dailySales = sales.reduce((acc, sale) => {
            const date = sale.createdAt.toISOString().split('T')[0];
            if (!acc[date]) acc[date] = 0;
            acc[date] += sale.total;
            return acc;
          }, {} as Record<string, number>);

          chartData = {
            dates: Object.keys(dailySales),
            revenue: Object.values(dailySales),
            type: 'sales_trend'
          };
          chartType = 'line';
          chartTitle = 'Sales Trend Over Time';
        } else if (lowerMessage.includes('inventory') || lowerMessage.includes('stock levels')) {
          // Get inventory data
          const inventory = await this.prisma.inventory.findMany({
            where: { tenantId, branchId },
            include: {
              product: {
                select: { name: true }
              }
            },
            take: 15,
            orderBy: { quantity: 'desc' }
          });

          const stockLevels = inventory.reduce((acc, item) => {
            acc[item.product.name] = item.quantity;
            return acc;
          }, {} as Record<string, number>);

          chartData = {
            products: Object.keys(stockLevels),
            quantities: Object.values(stockLevels),
            type: 'inventory_levels'
          };
          chartType = 'bar';
          chartTitle = 'Current Inventory Levels';
        }

        // Generate visualization using OpenAI
        const visualizationDescription = await this.generateVisualizationWithOpenAI(chartData, chartType, chartTitle);

        return {
          response: `📊 **${chartTitle}**\n\n${visualizationDescription}\n\n💡 This visualization helps you understand your business data at a glance. For more detailed analysis, try asking about specific metrics or time periods.`,
          category: 'Data Visualization',
          suggestions: enhancedSuggestions
        };
      }

      // Check for command patterns after visualization check
      const detectedCommand = this.detectCommand(message);
      if (detectedCommand.confidence > 0.7) {
        const commandResult = await this.executeCommand(detectedCommand, userId, tenantId, branchId);
        return {
          response: commandResult.message,
          category: 'Command Execution',
          suggestions: ['Check command results', 'View system status', 'Get help with commands']
        };
      }

      // Get feedback-based improvement suggestions
      const improvementModifier = await this.improveResponseBasedOnFeedback(message, responseCategory, userId, tenantId);

      // Use dynamic query processing for more flexible responses
      let flaskInsights: string[] = [];
      let dynamicResponse = null;

      try {
        // First try dynamic query processing
        const dynamicResult = await this.processDynamicQuery(message, tenantId, branchId, userHistory);
        if (dynamicResult && dynamicResult.response) {
          dynamicResponse = dynamicResult;
          flaskInsights = dynamicResult.insights || [];

          // Enhance suggestions with Flask insights
          if (flaskInsights.length > 0) {
            enhancedSuggestions = [...personalized.personalized_suggestions, ...flaskInsights.slice(0, 2)];
          }
        } else {
          // Fallback to traditional analysis
          const queryAnalysis = await this.analyzeQueryWithNLP(message);
          const personalizedInsights = await this.getPersonalizedInsightsFromFlask(tenantId, branchId, userHistory);

          // Use enhanced insights if available
          if (personalizedInsights.insights && personalizedInsights.insights.length > 0) {
            flaskInsights = personalizedInsights.insights;
          }

          // Enhance suggestions with Flask insights
          if (flaskInsights.length > 0) {
            enhancedSuggestions = [...personalized.personalized_suggestions, ...flaskInsights.slice(0, 2)];
          }
        }
      } catch (flaskError) {
        console.log('Flask AI service not available, using standard responses');
      }

      if (lowerMessage.includes('best performing product') || lowerMessage.includes('top product')) {
        const response = await this.getBestPerformingProducts(tenantId, branchId);
        return {
          response: flaskInsights.length > 0 ? response + '\n\n💡 ' + flaskInsights[0] : response,
          category: 'Best Performing Products',
          suggestions: enhancedSuggestions
        };
      }

      if (lowerMessage.includes('best performing month') || lowerMessage.includes('highest sales month')) {
        const response = await this.getBestPerformingMonths(tenantId, branchId);
        return {
          response: flaskInsights.length > 0 ? response + '\n\n💡 ' + flaskInsights[0] : response,
          category: 'Best Performing Months',
          suggestions: enhancedSuggestions
        };
      }

      if (lowerMessage.includes('sales trend') || lowerMessage.includes('sales performance')) {
        const response = await this.getSalesTrends(tenantId, branchId);
        return {
          response: flaskInsights.length > 0 ? response + '\n\n💡 ' + flaskInsights[0] : response,
          category: 'Sales Trends',
          suggestions: enhancedSuggestions
        };
      }

      if (lowerMessage.includes('total revenue') || lowerMessage.includes('revenue')) {
        const response = await this.getTotalRevenue(tenantId, branchId);
        return {
          response: flaskInsights.length > 0 ? response + '\n\n💡 ' + flaskInsights[0] : response,
          category: 'Total Revenue',
          suggestions: enhancedSuggestions
        };
      }

      // New diverse query handlers
      if (lowerMessage.includes('business info') || lowerMessage.includes('company info') || lowerMessage.includes('owner') || lowerMessage.includes('contact')) {
        const response = await this.getBusinessInfo(tenantId);
        return {
          response: flaskInsights.length > 0 ? response + '\n\n💡 ' + flaskInsights[0] : response,
          category: 'Business Information',
          suggestions: enhancedSuggestions
        };
      }

      if (lowerMessage.includes('branch') || lowerMessage.includes('location') || lowerMessage.includes('store')) {
        const response = await this.getBranchInfo(tenantId, branchId);
        return {
          response: flaskInsights.length > 0 ? response + '\n\n💡 ' + flaskInsights[0] : response,
          category: 'Branch Information',
          suggestions: enhancedSuggestions
        };
      }

      if (lowerMessage.includes('inventory') || lowerMessage.includes('stock') || lowerMessage.includes('product status')) {
        const response = await this.getInventoryStatus(tenantId, branchId);
        return {
          response: flaskInsights.length > 0 ? response + '\n\n💡 ' + flaskInsights[0] : response,
          category: 'Inventory Status',
          suggestions: enhancedSuggestions
        };
      }

      if (lowerMessage.includes('customer') && (lowerMessage.includes('top') || lowerMessage.includes('best') || lowerMessage.includes('insights'))) {
        const response = await this.getCustomerInsights(tenantId, branchId);
        return {
          response: flaskInsights.length > 0 ? response + '\n\n💡 ' + flaskInsights[0] : response,
          category: 'Customer Insights',
          suggestions: enhancedSuggestions
        };
      }

      if (lowerMessage.includes('operational') || lowerMessage.includes('system status') || lowerMessage.includes('overview')) {
        const response = await this.getOperationalData(tenantId, branchId);
        return {
          response: flaskInsights.length > 0 ? response + '\n\n💡 ' + flaskInsights[0] : response,
          category: 'Operational Data',
          suggestions: enhancedSuggestions
        };
      }

      if (lowerMessage.includes('supplier') || lowerMessage.includes('vendor')) {
        const response = await this.getSupplierInfo(tenantId);
        return {
          response: flaskInsights.length > 0 ? response + '\n\n💡 ' + flaskInsights[0] : response,
          category: 'Supplier Information',
          suggestions: enhancedSuggestions
        };
      }

      if (lowerMessage.includes('user') || lowerMessage.includes('employee') || lowerMessage.includes('staff')) {
        const response = await this.getUserInfo(tenantId);
        return {
          response: flaskInsights.length > 0 ? response + '\n\n💡 ' + flaskInsights[0] : response,
          category: 'User Information',
          suggestions: enhancedSuggestions
        };
      }

      // Generate proactive insights
      const proactiveInsights = await this.generateProactiveInsights(tenantData);
      const defaultResponse = `I'm here to help with insights about your business! You can ask me about:\n• Best performing products\n• Best performing months\n• Sales trends\n• Total revenue\n• Business information\n• Branch details\n• Inventory status\n• Customer insights\n• Operational data\n\n${proactiveInsights.length > 0 ? '💡 ' + proactiveInsights[0] + '\n\n' : ''}What would you like to know?`;

      return {
        response: flaskInsights.length > 0 ? defaultResponse + '\n\n💡 ' + flaskInsights[0] : defaultResponse,
        category: 'General',
        suggestions: enhancedSuggestions
      };

    } catch (error) {
      console.error('Error processing AI chat:', error);
      return {
        response: 'Sorry, I encountered an error while processing your request. Please try again.',
        category: 'Error',
        suggestions: ['Try asking about sales trends', 'Check product performance', 'View revenue summary']
      };
    }
  }

  async getConversationHistory(userId: string, tenantId: string, conversationId?: string): Promise<any[]> {
    try {
      const whereClause: any = { userId, tenantId };
      if (conversationId) {
        whereClause.conversationId = conversationId;
      }
      const history = await this.prisma.aIChatInteraction.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 50
      });
      return history;
    } catch (error) {
      console.error('Error fetching conversation history:', error);
      return [];
    }
  }

  async analyzePatterns(conversations: any[]): Promise<PatternAnalysis> {
    if (!conversations.length) {
      return { frequent_keywords: {}, query_categories: {}, insights: [] };
    }

    const queries = conversations.map(conv => conv.userMessage || '').filter(q => q.length > 0);

    // Simple keyword analysis
    const allText = queries.join(' ').toLowerCase();
    const words = allText.split(/\s+/).filter(word => word.length > 2);

    // Remove common stop words
    const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'what', 'how', 'why', 'when', 'where', 'who']);
    const keywords = words.filter(word => !stopWords.has(word));

    const keywordFreq: Record<string, number> = {};
    keywords.forEach(word => {
      keywordFreq[word] = (keywordFreq[word] || 0) + 1;
    });

    // Categorize queries
    const categories: Record<string, number> = {};
    queries.forEach(query => {
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

    // Generate insights
    const insights: string[] = [];
    const totalQueries = queries.length;

    if (categories['performance_analysis'] > totalQueries * 0.3) {
      insights.push("You frequently ask about product performance - consider setting up automated performance reports");
    }

    if (categories['sales_analysis'] > totalQueries * 0.3) {
      insights.push("You focus on sales trends - I can help monitor your sales performance regularly");
    }

    return {
      frequent_keywords: keywordFreq,
      query_categories: categories,
      insights
    };
  }

  async getPersonalizedSuggestions(query: string, tenantData: any, userHistory: any[]): Promise<PersonalizedSuggestions> {
    // Analyze user preferences from history
    const topicPreferences: Record<string, number> = {};

    userHistory.forEach(interaction => {
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

    // Determine primary topic
    const primaryTopic = Object.entries(topicPreferences)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'general';

    // Generate suggestions based on primary topic and tenant data
    const suggestions: string[] = [];

    if (primaryTopic === 'products') {
      suggestions.push("Check your latest product performance");
      if (tenantData.lowStockCount > 0) {
        suggestions.push("Review products running low on stock");
      }
      suggestions.push("View inventory levels");
    } else if (primaryTopic === 'sales') {
      suggestions.push("Review monthly sales trends");
      suggestions.push("Check revenue forecasts");
      if (tenantData.recentSalesTrend === 'up') {
        suggestions.push("Explore what's driving your recent sales growth");
      }
    } else if (primaryTopic === 'customers') {
      suggestions.push("Analyze customer segments");
      suggestions.push("Check customer retention metrics");
    }

    // Add general suggestions
    suggestions.push("View sales analytics dashboard");
    suggestions.push("Check inventory status");
    suggestions.push("Review customer insights");

    return {
      personalized_suggestions: suggestions.slice(0, 4),
      primary_topic: primaryTopic,
      confidence: userHistory.length / 10 // Simple confidence based on history length
    };
  }

  async generateProactiveInsights(tenantData: any): Promise<string[]> {
    const insights: string[] = [];

    // Sales trend insights
    if (tenantData.recentSalesTrend === 'up') {
      insights.push("Your sales are trending upward! Consider increasing inventory for popular products.");
    } else if (tenantData.recentSalesTrend === 'down') {
      insights.push("Sales have declined recently. Review your marketing strategies or product offerings.");
    }

    // Inventory insights
    if (tenantData.lowStockCount > 0) {
      insights.push(`${tenantData.lowStockCount} products are running low on stock. Consider restocking soon.`);
    }

    // Customer insights
    if (tenantData.highValueCustomers > 0) {
      insights.push(`You have ${tenantData.highValueCustomers} high-value customers. Consider personalized marketing campaigns.`);
    }

    return insights;
  }

  async getTenantBusinessData(tenantId: string, branchId: string): Promise<any> {
    try {
      // Get recent sales for trend analysis
      const recentSales = await this.prisma.sale.findMany({
        where: {
          tenantId,
          branchId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        select: {
          total: true,
          createdAt: true
        },
        orderBy: { createdAt: 'asc' }
      });

      // Calculate sales trend
      let salesTrend = 'stable';
      if (recentSales.length > 1) {
        const midpoint = Math.floor(recentSales.length / 2);
        const firstHalf = recentSales.slice(0, midpoint);
        const secondHalf = recentSales.slice(midpoint);

        const firstHalfAvg = firstHalf.reduce((sum, sale) => sum + sale.total, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, sale) => sum + sale.total, 0) / secondHalf.length;

        if (secondHalfAvg > firstHalfAvg * 1.1) {
          salesTrend = 'up';
        } else if (secondHalfAvg < firstHalfAvg * 0.9) {
          salesTrend = 'down';
        }
      }

      // Get low stock items
      const lowStockItems = await this.prisma.inventory.findMany({
        where: {
          tenantId,
          branchId,
          quantity: {
            lte: this.prisma.inventory.fields.minStock
          }
        }
      });

      // Get customer data (simplified)
      const customers = await this.prisma.sale.groupBy({
        by: ['customerName'],
        where: {
          tenantId,
          branchId,
          customerName: { not: null }
        },
        _sum: { total: true },
        _count: true
      });

      const highValueCustomers = customers.filter(c => (c._sum.total || 0) > 50000).length;

      return {
        recentSales,
        salesTrend,
        lowStockCount: lowStockItems.length,
        highValueCustomers,
        totalCustomers: customers.length
      };
    } catch (error) {
      console.error('Error getting tenant business data:', error);
      return {
        recentSales: [],
        salesTrend: 'stable',
        lowStockCount: 0,
        highValueCustomers: 0,
        totalCustomers: 0
      };
    }
  }

  private async getBestPerformingProducts(tenantId: string, branchId: string): Promise<string> {
    const saleItems = await this.prisma.saleItem.findMany({
      where: {
        sale: {
          tenantId,
          branchId
        }
      },
      include: {
        product: {
          select: {
            name: true
          }
        }
      }
    });

    if (saleItems.length === 0) {
      return "No sales data found for your products yet.";
    }

    const productMap = new Map<string, { name: string; totalRevenue: number; totalQuantity: number; salesCount: number }>();

    saleItems.forEach(item => {
      const productName = item.product.name;
      const revenue = item.quantity * item.price;

      if (productMap.has(productName)) {
        const existing = productMap.get(productName)!;
        existing.totalRevenue += revenue;
        existing.totalQuantity += item.quantity;
        existing.salesCount += 1;
      } else {
        productMap.set(productName, {
          name: productName,
          totalRevenue: revenue,
          totalQuantity: item.quantity,
          salesCount: 1
        });
      }
    });

    const productStats = Array.from(productMap.values());
    productStats.sort((a, b) => b.totalRevenue - a.totalRevenue);

    const topProducts = productStats.slice(0, 5);
    let response = "Here are your top performing products by revenue:\n\n";

    topProducts.forEach((product, index) => {
      response += `${index + 1}. ${product.name}\n`;
      response += `   Revenue: Ksh ${product.totalRevenue.toLocaleString()}\n`;
      response += `   Quantity Sold: ${product.totalQuantity}\n`;
      response += `   Sales Count: ${product.salesCount}\n\n`;
    });

    return response;
  }

  private applyImprovementModifier(response: string, modifier: string): string {
    if (!modifier || modifier.trim() === '') {
      return response;
    }
    return response + '\n\nNote: ' + modifier.trim();
  }

  private async getBestPerformingMonths(tenantId: string, branchId: string): Promise<string> {
    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        branchId,
        createdAt: {
          gte: new Date(new Date().getFullYear(), 0, 1)
        }
      },
      select: {
        total: true,
        createdAt: true
      }
    });

    if (sales.length === 0) {
      return "No sales data found for this year.";
    }

    const monthlySales = sales.reduce((acc, sale) => {
      const month = sale.createdAt.getMonth();
      const year = sale.createdAt.getFullYear();
      const key = `${year}-${month + 1}`;

      if (!acc[key]) {
        acc[key] = { total: 0, count: 0 };
      }
      acc[key].total += sale.total;
      acc[key].count += 1;

      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    const sortedMonths = Object.entries(monthlySales)
      .map(([month, data]) => ({
        month,
        ...data
      }))
      .sort((a, b) => b.total - a.total);

    if (sortedMonths.length === 0) {
      return "No monthly sales data available.";
    }

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    let response = "Here are your best performing months this year:\n\n";

    sortedMonths.slice(0, 3).forEach((monthData, index) => {
      const [year, month] = monthData.month.split('-');
      const monthName = monthNames[parseInt(month) - 1];
      response += `${index + 1}. ${monthName} ${year}\n`;
      response += `   Total Revenue: Ksh ${monthData.total.toLocaleString()}\n`;
      response += `   Number of Sales: ${monthData.count}\n\n`;
    });

    return response;
  }

  private async getSalesTrends(tenantId: string, branchId: string): Promise<string> {
    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        branchId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      select: {
        total: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    if (sales.length === 0) {
      return "No recent sales data found.";
    }

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const averageSale = totalRevenue / sales.length;
    const daysWithSales = new Set(sales.map(sale => sale.createdAt.toDateString())).size;

    let response = "Here's your sales performance over the last 30 days:\n\n";
    response += `Total Revenue: Ksh ${totalRevenue.toLocaleString()}\n`;
    response += `Number of Sales: ${sales.length}\n`;
    response += `Average Sale Value: Ksh ${averageSale.toLocaleString(undefined, { maximumFractionDigits: 2 })}\n`;
    response += `Days with Sales: ${daysWithSales}/30\n\n`;

    const midpoint = Math.floor(sales.length / 2);
    const firstHalf = sales.slice(0, midpoint);
    const secondHalf = sales.slice(midpoint);

    const firstHalfTotal = firstHalf.reduce((sum, sale) => sum + sale.total, 0);
    const secondHalfTotal = secondHalf.reduce((sum, sale) => sum + sale.total, 0);

    const trend = secondHalfTotal > firstHalfTotal ? 'increasing' : 'decreasing';
    const trendPercent = Math.abs((secondHalfTotal - firstHalfTotal) / firstHalfTotal * 100);

    response += `Sales Trend: ${trend.charAt(0).toUpperCase() + trend.slice(1)} `;
    response += `(${trendPercent.toFixed(1)}% ${trend === 'increasing' ? 'increase' : 'decrease'} in recent period)`;

    return response;
  }

  private async getTotalRevenue(tenantId: string, branchId: string): Promise<string> {
    const result = await this.prisma.sale.aggregate({
      where: {
        tenantId,
        branchId
      },
      _sum: {
        total: true
      },
      _count: true
    });

    const totalRevenue = result._sum.total || 0;
    const totalSales = result._count;

    let response = "Here's your total revenue summary:\n\n";
    response += `Total Revenue: Ksh ${totalRevenue.toLocaleString()}\n`;
    response += `Total Number of Sales: ${totalSales}\n`;

    if (totalSales > 0) {
      const averageSale = totalRevenue / totalSales;
      response += `Average Sale Value: Ksh ${averageSale.toLocaleString(undefined, { maximumFractionDigits: 2 })}\n`;
    }

    return response;
  }

  async logInteraction(userId: string, tenantId: string, branchId: string, message: string, response: string, category: string, conversationId?: string): Promise<void> {
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
          createdAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error logging AI interaction:', error);
    }
  }

  async submitFeedback(interactionId: string, rating: number, feedbackText?: string): Promise<void> {
    try {
      await this.prisma.aIChatInteraction.update({
        where: { id: interactionId },
        data: {
          metadata: {
            // Append or update feedback in metadata JSON
            // Prisma does not support partial JSON update, so we fetch and update manually
          }
        }
      });
      // Since Prisma does not support partial JSON update, we need to fetch, update, and save
      const interaction = await this.prisma.aIChatInteraction.findUnique({ where: { id: interactionId } });
      if (interaction) {
        const metadata = interaction.metadata || {};
        metadata['feedback'] = { rating, feedbackText, submittedAt: new Date() };
        await this.prisma.aIChatInteraction.update({
          where: { id: interactionId },
          data: { metadata }
        });
      }
    } catch (error) {
      console.error('Error submitting AI feedback:', error);
    }
  }
  async analyzeFeedbackPatterns(userId: string, tenantId: string): Promise<any> {
    try {
      // Get all interactions for the user and tenant, then filter for those with feedback in metadata
      const allInteractions = await this.prisma.aIChatInteraction.findMany({
        where: {
          userId,
          tenantId
        }
      });

      // Filter interactions that have feedback in their metadata
      const interactionsWithFeedback = allInteractions.filter(interaction => {
        const metadata = interaction.metadata as any;
        return metadata && metadata.feedback && metadata.feedback.rating !== undefined;
      });

      const feedbackAnalysis = {
        totalFeedback: interactionsWithFeedback.length,
        averageRating: 0,
        commonIssues: [] as string[],
        improvementAreas: [] as string[],
        responsePatterns: {} as Record<string, any>
      };

      if (interactionsWithFeedback.length > 0) {
        // Calculate average rating
        const ratings = interactionsWithFeedback.map(i => (i.metadata as any)?.feedback?.rating || 0);
        feedbackAnalysis.averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;

        // Analyze common feedback text
        const feedbackTexts = interactionsWithFeedback
          .map(i => (i.metadata as any)?.feedback?.feedbackText || '')
          .filter(text => text.length > 0);

        // Simple text analysis for common issues
        const issueKeywords = {
          'too long': ['long', 'too long', 'verbose', 'lengthy'],
          'not helpful': ['not helpful', 'useless', 'unhelpful', 'not useful'],
          'confusing': ['confusing', 'confused', 'unclear', 'complicated'],
          'inaccurate': ['wrong', 'incorrect', 'inaccurate', 'not right'],
          'missing info': ['missing', 'incomplete', 'not enough', 'more detail']
        };

        const issueCounts: Record<string, number> = {};
        feedbackTexts.forEach(text => {
          const lowerText = text.toLowerCase();
          Object.entries(issueKeywords).forEach(([issue, keywords]) => {
            if (keywords.some(keyword => lowerText.includes(keyword))) {
              issueCounts[issue] = (issueCounts[issue] || 0) + 1;
            }
          });
        });

        // Sort issues by frequency
        feedbackAnalysis.commonIssues = Object.entries(issueCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([issue]) => issue);

        // Generate improvement areas based on feedback
        if (feedbackAnalysis.averageRating < 3) {
          feedbackAnalysis.improvementAreas.push('Overall response quality needs improvement');
        }

        if (issueCounts['too long'] > interactionsWithFeedback.length * 0.2) {
          feedbackAnalysis.improvementAreas.push('Make responses more concise');
        }

        if (issueCounts['not helpful'] > interactionsWithFeedback.length * 0.2) {
          feedbackAnalysis.improvementAreas.push('Provide more specific and actionable information');
        }

        if (issueCounts['confusing'] > interactionsWithFeedback.length * 0.2) {
          feedbackAnalysis.improvementAreas.push('Use clearer language and structure');
        }

        // Analyze response patterns by category
        const categoryPerformance: Record<string, { total: number, avgRating: number }> = {};
        interactionsWithFeedback.forEach(interaction => {
          const category = (interaction.metadata as any)?.category || 'unknown';
          const rating = (interaction.metadata as any)?.feedback?.rating || 0;

          if (!categoryPerformance[category]) {
            categoryPerformance[category] = { total: 0, avgRating: 0 };
          }
          categoryPerformance[category].total += 1;
          categoryPerformance[category].avgRating =
            (categoryPerformance[category].avgRating * (categoryPerformance[category].total - 1) + rating) /
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
        responsePatterns: {}
      };
    }
  }

  async improveResponseBasedOnFeedback(query: string, category: string, userId: string, tenantId: string): Promise<string> {
    try {
      const feedbackAnalysis = await this.analyzeFeedbackPatterns(userId, tenantId);

      // Apply improvements based on feedback patterns
      let improvementModifier = '';

      if (feedbackAnalysis.improvementAreas.includes('Make responses more concise')) {
        improvementModifier += ' Be more concise and direct.';
      }

      if (feedbackAnalysis.improvementAreas.includes('Provide more specific and actionable information')) {
        improvementModifier += ' Include specific data and actionable insights.';
      }

      if (feedbackAnalysis.improvementAreas.includes('Use clearer language and structure')) {
        improvementModifier += ' Use clear, simple language and better structure.';
      }

      // Check category-specific performance
      const categoryRating = feedbackAnalysis.responsePatterns[category]?.avgRating || 0;
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
      const feedbackAnalysis = await this.analyzeFeedbackPatterns(userId, tenantId);

      return {
        conversationInsights: patterns.insights,
        feedbackInsights: feedbackAnalysis.improvementAreas,
        performanceMetrics: {
          totalInteractions: userHistory.length,
          averageRating: feedbackAnalysis.averageRating,
          mostUsedCategory: Object.entries(patterns.query_categories)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none'
        },
        learningProgress: {
          hasLearnedPreferences: userHistory.length > 5,
          hasFeedbackData: feedbackAnalysis.totalFeedback > 0,
          adaptationLevel: Math.min(userHistory.length / 20, 1) // Scale of 0-1 based on interactions
        }
      };
    } catch (error) {
      console.error('Error generating learning insights:', error);
      return {
        conversationInsights: [],
        feedbackInsights: [],
        performanceMetrics: {
          totalInteractions: 0,
          averageRating: 0,
          mostUsedCategory: 'none'
        },
        learningProgress: {
          hasLearnedPreferences: false,
          hasFeedbackData: false,
          adaptationLevel: 0
        }
      };
    }
  }

  // New methods for Flask AI integration
  async analyzeQueryWithNLP(query: string): Promise<any> {
    try {
      const response = await axios.post(`${FLASK_AI_URL}/analyze_query`, { query });
      return response.data;
    } catch (error) {
      console.error('Error calling Flask NLP analysis:', error);
      return null;
    }
  }

  async getPersonalizedInsightsFromFlask(tenantId: string, branchId: string, userHistory: any[]): Promise<any> {
    try {
      const response = await axios.post(`${FLASK_AI_URL}/personalized_insights`, {
        tenant_id: tenantId,
        branch_id: branchId,
        user_history: userHistory
      });
      return response.data;
    } catch (error) {
      console.error('Error calling Flask personalized insights:', error);
      return { insights: [] };
    }
  }

  async trainTenantModels(tenantId: string, branchId?: string): Promise<any> {
    try {
      const response = await axios.post(`${FLASK_AI_URL}/learn_from_data`, {
        tenant_id: tenantId,
        branch_id: branchId
      });
      return response.data;
    } catch (error) {
      console.error('Error training tenant models:', error);
      return null;
    }
  }

  async processDynamicQuery(message: string, tenantId: string, branchId: string, userHistory: any[]): Promise<any> {
    try {
      const response = await axios.post(`${FLASK_AI_URL}/process_dynamic_query`, {
        query: message,
        tenant_id: tenantId,
        branch_id: branchId,
        user_history: userHistory
      });
      return response.data;
    } catch (error) {
      console.error('Error calling Flask dynamic query processing:', error);
      return null;
    }
  }

  // New diverse query handler methods
  private async getBusinessInfo(tenantId: string): Promise<string> {
    try {
      const response = await axios.post(`${FLASK_AI_URL}/get_business_info`, { tenant_id: tenantId });
      const data = response.data;

      if (data.business_info) {
        const business = data.business_info;
        let result = `Here's your business information:\n\n`;
        result += `Business Name: ${business.name || 'Not specified'}\n`;
        result += `Type: ${business.businessType || 'Not specified'}\n`;
        result += `Contact Email: ${business.contactEmail || 'Not specified'}\n`;
        result += `Contact Phone: ${business.contactPhone || 'Not specified'}\n`;
        result += `Address: ${business.address || 'Not specified'}, ${business.city || ''}, ${business.country || ''}\n`;
        result += `Website: ${business.website || 'Not specified'}\n`;
        result += `Founded: ${business.foundedYear || 'Not specified'}\n`;
        result += `Employee Count: ${business.employeeCount || 'Not specified'}\n`;

        if (data.owner_info) {
          const owner = data.owner_info;
          result += `\nOwner Information:\n`;
          result += `Name: ${owner.name || 'Not specified'}\n`;
          result += `Email: ${owner.email || 'Not specified'}\n`;
          result += `Phone: ${owner.phone || 'Not specified'}\n`;
        }

        return result;
      } else {
        return "Business information not found.";
      }
    } catch (error) {
      console.error('Error fetching business info:', error);
      return "Unable to retrieve business information at this time.";
    }
  }

  private async getBranchInfo(tenantId: string, branchId?: string): Promise<string> {
    try {
      const response = await axios.post(`${FLASK_AI_URL}/get_branch_info`, { tenant_id: tenantId, branch_id: branchId });
      const data = response.data;

      if (data.branches && data.branches.length > 0) {
        let result = `Here are your branch details:\n\n`;

        data.branches.forEach((branch: any, index: number) => {
          result += `${index + 1}. ${branch.name}\n`;
          result += `   Address: ${branch.address}, ${branch.city}, ${branch.country}\n`;
          result += `   Phone: ${branch.phone || 'Not specified'}\n`;
          result += `   Email: ${branch.email || 'Not specified'}\n`;
          result += `   Status: ${branch.status || 'Active'}\n`;
          result += `   Main Branch: ${branch.isMainBranch ? 'Yes' : 'No'}\n\n`;
        });

        return result;
      } else {
        return "No branch information found.";
      }
    } catch (error) {
      console.error('Error fetching branch info:', error);
      return "Unable to retrieve branch information at this time.";
    }
  }

  private async getInventoryStatus(tenantId: string, branchId?: string): Promise<string> {
    try {
      const response = await axios.post(`${FLASK_AI_URL}/get_inventory_status`, { tenant_id: tenantId, branch_id: branchId });
      const data = response.data;

      if (data.inventory && data.inventory.length > 0) {
        let result = `Here's your current inventory status:\n\n`;

        // Summary first
        if (data.summary) {
          result += `Summary:\n`;
          result += `• Total Items: ${data.summary.total_items}\n`;
          result += `• Low Stock Items: ${data.summary.low_stock}\n`;
          result += `• Out of Stock Items: ${data.summary.out_of_stock}\n\n`;
        }

        result += `Inventory Details:\n`;
        data.inventory.slice(0, 10).forEach((item: any) => { // Limit to first 10 items
          result += `• ${item.name}: ${item.quantity} units (${item.status})\n`;
        });

        if (data.inventory.length > 10) {
          result += `\n... and ${data.inventory.length - 10} more items`;
        }

        return result;
      } else {
        return "No inventory data found.";
      }
    } catch (error) {
      console.error('Error fetching inventory status:', error);
      return "Unable to retrieve inventory status at this time. The inventory service may be temporarily unavailable.\n\nTry asking:\n• Review monthly sales trends\n• Check revenue forecasts\n• View sales analytics dashboard\n• Check inventory status";
    }
  }

  private async getCustomerInsights(tenantId: string, branchId?: string): Promise<string> {
    try {
      // Get top customers by revenue
      const topCustomersQuery = await this.prisma.sale.groupBy({
        by: ['customerName'],
        where: {
          tenantId,
          branchId: branchId || undefined,
          customerName: { not: null }
        },
        _sum: { total: true },
        _count: true,
        orderBy: { _sum: { total: 'desc' } },
        take: 5
      });

      // Get active customers in last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const activeCustomersQuery = await this.prisma.sale.groupBy({
        by: ['customerName'],
        where: {
          tenantId,
          branchId: branchId || undefined,
          customerName: { not: null },
          createdAt: { gte: thirtyDaysAgo }
        },
        _count: true
      });

      const activeCustomersCount = new Set(activeCustomersQuery.map(c => c.customerName!)).size;

      // Get total customer metrics
      const totalCustomers = await this.prisma.sale.groupBy({
        by: ['customerName'],
        where: {
          tenantId,
          branchId: branchId || undefined,
          customerName: { not: null }
        },
        _count: true
      });

      const totalUniqueCustomers = totalCustomers.length;

      let result = `Here are your customer insights:\n\n`;

      if (topCustomersQuery.length > 0) {
        result += `Top Customers by Revenue:\n`;
        topCustomersQuery.forEach((customer, index) => {
          result += `${index + 1}. ${customer.customerName!}\n`;
          result += `   Revenue: Ksh ${(customer._sum.total || 0).toLocaleString()}\n`;
          result += `   Purchase Count: ${customer._count}\n\n`;
        });
      }

      result += `Active Customers (Last 30 Days): ${activeCustomersCount}\n`;
      result += `Total Unique Customers: ${totalUniqueCustomers}\n`;

      // Generate insights
      const insights: string[] = [];
      if (activeCustomersCount > 0) {
        const retentionRate = Math.round((activeCustomersCount / totalUniqueCustomers) * 100);
        insights.push(`Customer retention rate: ${retentionRate}% (${activeCustomersCount} active out of ${totalUniqueCustomers} total customers)`);
      }

      if (topCustomersQuery.length > 0) {
        const topCustomerRevenue = topCustomersQuery[0]._sum.total || 0;
        const totalRevenue = topCustomersQuery.reduce((sum, c) => sum + (c._sum.total || 0), 0);
        const concentration = Math.round((topCustomerRevenue / totalRevenue) * 100);
        insights.push(`Your top customer contributes ${concentration}% of total revenue from top 5 customers`);
      }

      if (insights.length > 0) {
        result += `\nKey Insights:\n`;
        insights.forEach((insight) => {
          result += `• ${insight}\n`;
        });
      }

      return result;
    } catch (error) {
      console.error('Error fetching customer insights:', error);
      return "Unable to retrieve customer insights at this time.";
    }
  }

  private async getOperationalData(tenantId: string, branchId?: string): Promise<string> {
    try {
      const response = await axios.post(`${FLASK_AI_URL}/get_operational_data`, { tenant_id: tenantId, branch_id: branchId });
      const data = response.data;

      let result = `Here's your operational overview:\n\n`;

      if (data.sales_summary) {
        const sales = data.sales_summary;
        result += `Sales Summary (Last 30 Days):\n`;
        result += `• Total Sales: ${sales.total_sales || 0}\n`;
        result += `• Total Revenue: Ksh ${(sales.total_revenue || 0).toLocaleString()}\n`;
        result += `• Average Sale: Ksh ${(sales.avg_sale_value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}\n`;
        result += `• Highest Sale: Ksh ${(sales.highest_sale || 0).toLocaleString()}\n\n`;
      }

      if (data.user_summary) {
        const users = data.user_summary;
        result += `User Summary:\n`;
        result += `• Total Users: ${users.total_users || 0}\n`;
        result += `• New Users (Last 30 Days): ${users.new_users || 0}\n\n`;
      }

      result += `System Status: ${data.system_status || 'Unknown'}\n`;

      return result;
    } catch (error) {
      console.error('Error fetching operational data:', error);
      return "Unable to retrieve operational data at this time.";
    }
  }

  private async getSupplierInfo(tenantId: string): Promise<string> {
    try {
      // For now, return a placeholder since supplier info might not be implemented in Flask
      // This would need to be added to the Flask service
      return "Supplier information feature is coming soon. Please check back later.";
    } catch (error) {
      console.error('Error fetching supplier info:', error);
      return "Unable to retrieve supplier information at this time.";
    }
  }

  private async getUserInfo(tenantId: string): Promise<string> {
    try {
      const users = await this.prisma.user.findMany({
        where: { tenantId },
        select: {
          name: true,
          email: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      if (users.length > 0) {
        let result = `Here are your recent users:\n\n`;

        users.forEach((user, index) => {
          result += `${index + 1}. ${user.name}\n`;
          result += `   Email: ${user.email}\n`;
          result += `   Joined: ${user.createdAt.toLocaleDateString()}\n\n`;
        });

        if (users.length === 10) {
          result += `... and more users in your system.`;
        }

        return result;
      } else {
        return "No user information found.";
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
      return "Unable to retrieve user information at this time.";
    }
  }

  // Command detection and execution methods
  private detectCommand(message: string): DetectedCommand {
    const lowerMessage = message.toLowerCase().trim();

    // Define command patterns
    const commandPatterns = [
      {
        command: 'create_sale',
        patterns: ['create sale', 'new sale', 'add sale', 'record sale'],
        confidence: 0.9
      },
      {
        command: 'update_inventory',
        patterns: ['update inventory', 'change stock', 'modify inventory', 'adjust stock', 'add stock', 'increase stock', 'restock', 'add units', 'add items'],
        confidence: 0.8
      },
      {
        command: 'get_status',
        patterns: ['system status', 'server status', 'health check', 'status'],
        confidence: 0.9
      },
      {
        command: 'generate_report',
        patterns: ['generate report', 'create report', 'make report', 'run report', 'sales report', 'generate sales report'],
        confidence: 0.8
      },
      {
        command: 'generate_stock_report',
        patterns: ['stock report'],
        confidence: 0.8
      },
      {
        command: 'generate_graph',
        patterns: ['generate graph', 'create graph', 'show graph', 'visualize', 'chart'],
        confidence: 0.8
      },
      {
        command: 'backup_data',
        patterns: ['backup data', 'backup database', 'create backup', 'backup now'],
        confidence: 0.9
      }
    ];

    for (const cmd of commandPatterns) {
      for (const pattern of cmd.patterns) {
        if (lowerMessage.includes(pattern)) {
          // Extract parameters from message
          const parameters: Record<string, any> = {};

          // Simple parameter extraction (can be enhanced)
          if (cmd.command === 'create_sale') {
            // Extract amount if mentioned
            const amountMatch = message.match(/(\d+(?:\.\d{2})?)/);
            if (amountMatch) {
              parameters.amount = parseFloat(amountMatch[1]);
            }
          } else if (cmd.command === 'update_inventory') {
            // Extract quantity and product name for inventory updates
            const quantityMatch = message.match(/(\d+)\s*(?:units?|items?|stock|pieces?)/i);
            if (quantityMatch) {
              parameters.quantity = parseInt(quantityMatch[1]);
            }

            // Extract product name - look for patterns like "add X to product Y" or "increase stock of Y"
            const productPatterns = [
              /(?:add|increase|restock)\s+\d+\s+(?:units?|items?|stock|pieces?)\s+(?:to|for|of)\s+(.+?)(?:\s|$)/i,
              /(?:add|increase|restock)\s+(.+?)\s+(?:by|with)\s+\d+/i,
              /(?:stock|inventory)\s+(?:of|for)\s+(.+?)(?:\s|$)/i
            ];

            for (const pattern of productPatterns) {
              const productMatch = message.match(pattern);
              if (productMatch && productMatch[1]) {
                parameters.productName = productMatch[1].trim();
                break;
              }
            }

            // Store original message for fallback parsing
            parameters.originalMessage = message;
          }

          return {
            command: cmd.command,
            parameters,
            confidence: cmd.confidence
          };
        }
      }
    }

    return {
      command: '',
      parameters: {},
      confidence: 0
    };
  }

  private async executeCommand(detectedCommand: DetectedCommand, userId: string, tenantId: string, branchId: string): Promise<CommandResult> {
    try {
      switch (detectedCommand.command) {
        case 'get_status':
          return await this.executeStatusCommand(tenantId, branchId);

        case 'create_sale':
          return await this.executeCreateSaleCommand(detectedCommand.parameters, userId, tenantId, branchId);

        case 'update_inventory':
          return await this.executeUpdateInventoryCommand(detectedCommand.parameters, tenantId, branchId);

        case 'generate_report':
          return await this.executeGenerateReportCommand(tenantId, branchId);

        case 'generate_stock_report':
          return await this.executeGenerateStockReportCommand(tenantId, branchId);

        case 'generate_graph':
          return await this.executeGenerateGraphCommand(detectedCommand.parameters, tenantId, branchId);

        case 'backup_data':
          return await this.executeBackupCommand(tenantId);

        default:
          return {
            success: false,
            message: `Unknown command: ${detectedCommand.command}`,
            action_taken: 'none'
          };
      }
    } catch (error) {
      console.error('Error executing command:', error);
      return {
        success: false,
        message: `Failed to execute command: ${error.message}`,
        action_taken: 'error'
      };
    }
  }

  private async executeStatusCommand(tenantId: string, branchId: string): Promise<CommandResult> {
    try {
      // Check database connectivity
      const dbStatus = await this.checkDatabaseStatus();

      // Get basic system metrics
      const metrics = await this.getSystemMetrics(tenantId, branchId);

      return {
        success: true,
        message: `System Status:\n• Database: ${dbStatus ? 'Connected' : 'Disconnected'}\n• Total Sales: ${metrics.totalSales}\n• Active Users: ${metrics.activeUsers}\n• Last Backup: ${metrics.lastBackup || 'Unknown'}`,
        action_taken: 'status_check',
        data: { dbStatus, metrics }
      };
    } catch (error) {
      return {
        success: false,
        message: `Status check failed: ${error.message}`,
        action_taken: 'status_check_failed'
      };
    }
  }

  private async executeCreateSaleCommand(parameters: Record<string, any>, userId: string, tenantId: string, branchId: string): Promise<CommandResult> {
    // This would require more complex implementation with proper validation
    // For now, return a placeholder
    return {
      success: false,
      message: 'Sale creation requires additional parameters. Please use the sales interface.',
      action_taken: 'validation_required'
    };
  }

  private async executeUpdateInventoryCommand(parameters: Record<string, any>, tenantId: string, branchId: string): Promise<CommandResult> {
    try {
      // Extract parameters from the command detection
      const { quantity, productName, originalMessage } = parameters;

      // Validate required parameters
      if (!quantity || !productName) {
        return {
          success: false,
          message: 'Stock addition requires specific product name and quantity. Please specify like "add 10 units to product X" or "increase stock of Y by 5".',
          action_taken: 'validation_required'
        };
      }

      // Find the product by name (case-insensitive search)
      const product = await this.prisma.product.findFirst({
        where: {
          tenantId,
          name: {
            contains: productName,
            mode: 'insensitive'
          }
        },
        select: {
          id: true,
          name: true
        }
      });

      if (!product) {
        // Try to find similar products for suggestions
        const similarProducts = await this.prisma.product.findMany({
          where: {
            tenantId,
            name: {
              contains: productName.split(' ')[0], // Try first word
              mode: 'insensitive'
            }
          },
          select: { name: true },
          take: 3
        });

        const suggestions = similarProducts.length > 0
          ? ` Did you mean: ${similarProducts.map(p => p.name).join(', ')}?`
          : '';

        return {
          success: false,
          message: `Product "${productName}" not found.${suggestions}`,
          action_taken: 'product_not_found'
        };
      }

      // Find or create inventory record for this product and branch
      let inventory = await this.prisma.inventory.findFirst({
        where: {
          productId: product.id,
          tenantId,
          branchId
        }
      });

      if (!inventory) {
        // Create new inventory record if it doesn't exist
        inventory = await this.prisma.inventory.create({
          data: {
            id: `${tenantId}-${branchId}-${product.id}`, // Generate a unique ID
            productId: product.id,
            tenantId,
            branchId,
            quantity: 0,
            minStock: 5, // Default minimum stock level
            updatedAt: new Date()
          }
        });
      }

      // Update the inventory quantity
      const newQuantity = inventory.quantity + quantity;
      await this.prisma.inventory.update({
        where: { id: inventory.id },
        data: { quantity: newQuantity }
      });

      // Check if the new quantity is below minimum stock
      const isLowStock = newQuantity <= inventory.minStock;

      let message = `✅ Successfully updated inventory for "${product.name}"\n`;
      message += `• Previous quantity: ${inventory.quantity} units\n`;
      message += `• Added: ${quantity} units\n`;
      message += `• New quantity: ${newQuantity} units`;

      if (isLowStock) {
        message += `\n\n⚠️ Warning: Stock level is now low (${newQuantity} units). Consider restocking soon.`;
      }

      return {
        success: true,
        message,
        action_taken: 'inventory_updated',
        data: {
          productId: product.id,
          productName: product.name,
          previousQuantity: inventory.quantity,
          addedQuantity: quantity,
          newQuantity,
          isLowStock
        }
      };
    } catch (error) {
      console.error('Error executing inventory update command:', error);
      return {
        success: false,
        message: `Failed to update inventory: ${error.message}`,
        action_taken: 'inventory_update_failed'
      };
    }
  }

  private async executeGenerateReportCommand(tenantId: string, branchId: string): Promise<CommandResult> {
    try {
      // Generate a simple sales report
      const sales = await this.prisma.sale.findMany({
        where: { tenantId, branchId },
        take: 10,
        orderBy: { createdAt: 'desc' }
      });

      const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);

      return {
        success: true,
        message: `Report Generated:\n• Recent Sales: ${sales.length}\n• Total Revenue: Ksh ${totalRevenue.toLocaleString()}\n• Report Type: Sales Summary`,
        action_taken: 'report_generated',
        data: { salesCount: sales.length, totalRevenue }
      };
    } catch (error) {
      return {
        success: false,
        message: `Report generation failed: ${error.message}`,
        action_taken: 'report_failed'
      };
    }
  }

  private async executeGenerateStockReportCommand(tenantId: string, branchId: string): Promise<CommandResult> {
    try {
      // Generate a stock report
      const inventory = await this.prisma.inventory.findMany({
        where: { tenantId, branchId },
        include: {
          product: {
            select: {
              name: true,
              price: true
            }
          }
        },
        take: 20,
        orderBy: { quantity: 'asc' }
      });

      const totalItems = inventory.length;
      const lowStockItems = inventory.filter(item => item.quantity <= item.minStock).length;
      const outOfStockItems = inventory.filter(item => item.quantity === 0).length;
      const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * (item.product.price || 0)), 0);

      let message = `Stock Report Generated:\n• Total Items: ${totalItems}\n• Low Stock Items: ${lowStockItems}\n• Out of Stock Items: ${outOfStockItems}\n• Total Inventory Value: Ksh ${totalValue.toLocaleString()}\n\n`;

      if (inventory.length > 0) {
        message += `Top Items by Stock Level:\n`;
        inventory.slice(0, 10).forEach((item, index) => {
          message += `${index + 1}. ${item.product.name}: ${item.quantity} units (${item.quantity <= item.minStock ? 'Low Stock' : 'In Stock'})\n`;
        });
      }

      return {
        success: true,
        message,
        action_taken: 'stock_report_generated',
        data: { totalItems, lowStockItems, outOfStockItems, totalValue }
      };
    } catch (error) {
      return {
        success: false,
        message: `Stock report generation failed: ${error.message}`,
        action_taken: 'stock_report_failed'
      };
    }
  }

  private async executeGenerateGraphCommand(parameters: Record<string, any>, tenantId: string, branchId: string): Promise<CommandResult> {
    try {
      // Generate different types of graphs based on available data
      const graphTypes = ['sales_trend', 'revenue_chart', 'inventory_levels', 'customer_analytics'];

      // Default to sales trend if no specific type requested
      const graphType = parameters.type || 'sales_trend';

      let graphData: any = {};
      let message = '';

      switch (graphType) {
        case 'sales_trend':
          const salesData = await this.prisma.sale.findMany({
            where: { tenantId, branchId },
            select: {
              total: true,
              createdAt: true
            },
            orderBy: { createdAt: 'asc' },
            take: 50
          });

          // Group sales by date
          const salesByDate = salesData.reduce((acc, sale) => {
            const date = sale.createdAt.toISOString().split('T')[0];
            if (!acc[date]) acc[date] = 0;
            acc[date] += sale.total;
            return acc;
          }, {} as Record<string, number>);

          graphData = {
            type: 'line',
            title: 'Sales Trend Over Time',
            xAxis: Object.keys(salesByDate),
            yAxis: Object.values(salesByDate),
            data: salesByDate
          };
          message = `📈 Sales Trend Graph Generated\n\nI've created a line chart showing your sales performance over time. The graph displays daily sales totals for the most recent 50 transactions.\n\nKey Insights:\n• Total data points: ${Object.keys(salesByDate).length}\n• Peak sales day: ${Object.entries(salesByDate).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}\n• Average daily sales: Ksh ${Math.round(Object.values(salesByDate).reduce((a, b) => a + b, 0) / Object.values(salesByDate).length).toLocaleString()}`;
          break;

        case 'revenue_chart':
          const revenueData = await this.prisma.sale.findMany({
            where: { tenantId, branchId },
            select: { total: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 30
          });

          const monthlyRevenue = revenueData.reduce((acc, sale) => {
            const month = sale.createdAt.toISOString().slice(0, 7); // YYYY-MM format
            if (!acc[month]) acc[month] = 0;
            acc[month] += sale.total;
            return acc;
          }, {} as Record<string, number>);

          graphData = {
            type: 'bar',
            title: 'Monthly Revenue Chart',
            xAxis: Object.keys(monthlyRevenue).reverse(),
            yAxis: Object.values(monthlyRevenue).reverse(),
            data: monthlyRevenue
          };
          message = `📊 Monthly Revenue Chart Generated\n\nThis bar chart shows your revenue performance by month. Each bar represents the total revenue for that month.\n\nKey Insights:\n• Best performing month: ${Object.entries(monthlyRevenue).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}\n• Total months shown: ${Object.keys(monthlyRevenue).length}\n• Average monthly revenue: Ksh ${Math.round(Object.values(monthlyRevenue).reduce((a, b) => a + b, 0) / Object.values(monthlyRevenue).length).toLocaleString()}`;
          break;

        case 'inventory_levels':
          const inventoryData = await this.prisma.inventory.findMany({
            where: { tenantId, branchId },
            include: {
              product: {
                select: { name: true }
              }
            },
            take: 20,
            orderBy: { quantity: 'desc' }
          });

          const inventoryLevels = inventoryData.reduce((acc, item) => {
            acc[item.product.name] = item.quantity;
            return acc;
          }, {} as Record<string, number>);

          graphData = {
            type: 'bar',
            title: 'Inventory Levels by Product',
            xAxis: Object.keys(inventoryLevels),
            yAxis: Object.values(inventoryLevels),
            data: inventoryLevels
          };
          message = `📦 Inventory Levels Chart Generated\n\nThis bar chart displays current stock levels for your top 20 products by quantity.\n\nKey Insights:\n• Total products shown: ${Object.keys(inventoryLevels).length}\n• Highest stock item: ${Object.entries(inventoryLevels).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}\n• Low stock items (< 10): ${Object.values(inventoryLevels).filter(q => q < 10).length}`;
          break;

        case 'customer_analytics':
          const customerData = await this.prisma.sale.groupBy({
            by: ['customerName'],
            where: {
              tenantId,
              branchId,
              customerName: { not: null }
            },
            _sum: { total: true },
            _count: true,
            orderBy: { _sum: { total: 'desc' } },
            take: 10
          });

          const customerRevenue = customerData.reduce((acc, customer) => {
            acc[customer.customerName!] = customer._sum.total || 0;
            return acc;
          }, {} as Record<string, number>);

          graphData = {
            type: 'pie',
            title: 'Top Customers by Revenue',
            labels: Object.keys(customerRevenue),
            data: Object.values(customerRevenue),
            customerData: customerRevenue
          };
          message = `👥 Customer Analytics Chart Generated\n\nThis pie chart shows revenue distribution among your top 10 customers.\n\nKey Insights:\n• Total customers shown: ${Object.keys(customerRevenue).length}\n• Top customer revenue: Ksh ${Math.max(...Object.values(customerRevenue)).toLocaleString()}\n• Revenue concentration: ${Math.round((Math.max(...Object.values(customerRevenue)) / Object.values(customerRevenue).reduce((a, b) => a + b, 0)) * 100)}% from top customer`;
          break;

        default:
          return {
            success: false,
            message: `Unknown graph type: ${graphType}. Available types: ${graphTypes.join(', ')}`,
            action_taken: 'invalid_graph_type'
          };
      }

      return {
        success: true,
        message,
        action_taken: 'graph_generated',
        data: {
          graphType,
          graphData,
          availableTypes: graphTypes
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Graph generation failed: ${error.message}`,
        action_taken: 'graph_generation_failed'
      };
    }
  }

  private async executeBackupCommand(tenantId: string): Promise<CommandResult> {
    // This would typically trigger a backup process
    // For now, return a placeholder
    return {
      success: true,
      message: 'Backup initiated successfully. This is a simulated backup command.',
      action_taken: 'backup_initiated'
    };
  }

  private async checkDatabaseStatus(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      return false;
    }
  }

  private async getSystemMetrics(tenantId: string, branchId: string): Promise<any> {
    try {
      const [totalSales, activeUsers] = await Promise.all([
        this.prisma.sale.count({ where: { tenantId, branchId } }),
        this.prisma.user.count({ where: { tenantId } })
      ]);

      return {
        totalSales,
        activeUsers,
        lastBackup: null // Would need to track this in the database
      };
    } catch (error) {
      return {
        totalSales: 0,
        activeUsers: 0,
        lastBackup: null
      };
    }
  }

  async generateVisualizationWithOpenAI(data: any, chartType: string, title: string): Promise<string> {
    try {
      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '') {
        console.log('OpenAI API key not configured, using fallback visualization generation');
        return this.generateFallbackVisualization(data, chartType, title);
      }

      // Check if OpenAI client is initialized
      if (!this.openai) {
        console.log('OpenAI client not initialized, using fallback visualization generation');
        return this.generateFallbackVisualization(data, chartType, title);
      }

      const prompt = `Create a ${chartType} chart visualization for the following data. Title: "${title}"

Data: ${JSON.stringify(data, null, 2)}

Please generate a detailed description of what this chart would look like, including:
1. Chart type and structure
2. Key data points and trends
3. Visual elements (colors, labels, axes)
4. Insights that can be drawn from the data
5. Any notable patterns or anomalies

Make the description vivid and actionable for someone who wants to understand their business data.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a data visualization expert who creates detailed, accurate descriptions of charts and graphs based on provided data. Focus on business analytics and provide actionable insights.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      });

      return response.choices[0]?.message?.content || this.generateFallbackVisualization(data, chartType, title);
    } catch (error: any) {
      // Handle quota/rate limit errors gracefully - these are expected and fallback works
      if (error?.status === 429 || error?.code === 'insufficient_quota' || error?.type === 'insufficient_quota') {
        console.log('OpenAI quota exceeded, using fallback visualization generation');
      } else {
        console.error('Error generating visualization with OpenAI:', error);
      }
      // Fallback to basic visualization description
      return this.generateFallbackVisualization(data, chartType, title);
    }
  }

  private generateFallbackVisualization(data: any, chartType: string, title: string): string {
    try {
      let description = `## 📊 ${title}\n\n`;
      description += `### Chart Type: ${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart 📈\n\n`;

      if (chartType === 'bar') {
        if (data.labels && data.values) {
          description += `### Data Overview\n`;
          description += `- **Total Data Points:** ${data.labels.length}\n`;
          description += `- **Visualization Type:** Bar Chart\n\n`;

          description += `### Product Performance Breakdown\n\n`;
          description += `| Product | Units Sold | Performance | Percentage |\n`;
          description += `|---------|------------|-------------|------------|\n`;

          data.labels.forEach((label: string, index: number) => {
            const value = data.values[index];
            const percentageNum = (value / Math.max(...data.values)) * 100;
            const percentage = percentageNum.toFixed(1);
            const performance = percentageNum >= 80 ? '🏆 High' : percentageNum >= 50 ? '📊 Medium' : '📉 Low';
            description += `| ${label} | ${value} | ${performance} | ${percentage}% |\n`;
          });

          const maxValue = Math.max(...data.values);
          const maxIndex = data.values.indexOf(maxValue);
          const minValue = Math.min(...data.values);
          const minIndex = data.values.indexOf(minValue);
          const average = (data.values.reduce((a: number, b: number) => a + b, 0) / data.values.length);

          description += `\n### Key Performance Metrics\n\n`;
          description += `#### 🏆 Top Performer\n`;
          description += `- **Product:** ${data.labels[maxIndex]}\n`;
          description += `- **Units Sold:** ${maxValue}\n\n`;

          description += `#### 📉 Lowest Performer\n`;
          description += `- **Product:** ${data.labels[minIndex]}\n`;
          description += `- **Units Sold:** ${minValue}\n\n`;

          description += `### Overall Statistics\n`;
          description += `- **Average Units per Product:** ${average.toFixed(1)}\n`;
          description += `- **Performance Range:** ${maxValue - minValue} units\n`;
          description += `- **Total Units Across All Products:** ${data.values.reduce((a: number, b: number) => a + b, 0)}\n\n`;
        }
      } else if (chartType === 'line') {
        if (data.dates && data.revenue) {
          description += `### Trend Analysis\n`;
          description += `- **Time Periods Analyzed:** ${data.dates.length}\n`;
          description += `- **Visualization Type:** Line Chart\n\n`;

          const totalRevenue = data.revenue.reduce((a: number, b: number) => a + b, 0);
          const avgRevenue = totalRevenue / data.revenue.length;
          const maxRevenue = Math.max(...data.revenue);
          const minRevenue = Math.min(...data.revenue);
          const maxIndex = data.revenue.indexOf(maxRevenue);
          const minIndex = data.revenue.indexOf(minRevenue);

          description += `### Revenue Performance Summary\n\n`;
          description += `#### Financial Overview\n`;
          description += `- **Total Revenue:** Ksh ${totalRevenue.toLocaleString()}\n`;
          description += `- **Average Revenue per Period:** Ksh ${avgRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}\n`;
          description += `- **Revenue Range:** Ksh ${minRevenue.toLocaleString()} - Ksh ${maxRevenue.toLocaleString()}\n\n`;

          description += `#### Period-by-Period Breakdown\n\n`;
          description += `| Date | Revenue | Trend |\n`;
          description += `|------|---------|-------|\n`;

          data.dates.forEach((date: string, index: number) => {
            const revenue = data.revenue[index];
            const prevRevenue = index > 0 ? data.revenue[index - 1] : revenue;
            const trend = revenue > prevRevenue ? '↗️ Up' : revenue < prevRevenue ? '↘️ Down' : '➡️ Stable';
            description += `| ${date} | Ksh ${revenue.toLocaleString()} | ${trend} |\n`;
          });

          description += `\n### Performance Highlights\n\n`;
          description += `#### Best Performing Period\n`;
          description += `- **Date:** ${data.dates[maxIndex]}\n`;
          description += `- **Revenue:** Ksh ${maxRevenue.toLocaleString()}\n\n`;

          description += `#### Lowest Performing Period\n`;
          description += `- **Date:** ${data.dates[minIndex]}\n`;
          description += `- **Revenue:** Ksh ${minRevenue.toLocaleString()}\n\n`;

          description += `#### Growth Analysis\n`;
          const growthRate = ((maxRevenue / minRevenue - 1) * 100);
          description += `- **Overall Growth:** ${growthRate > 0 ? '+' : ''}${growthRate.toFixed(1)}% from lowest to highest period\n`;
          description += `- **Revenue Volatility:** ${((maxRevenue - minRevenue) / avgRevenue * 100).toFixed(1)}% variation from average\n\n`;
        }
      }

      description += `## 💡 Business Intelligence Insights\n\n`;
      description += `### Strategic Recommendations\n`;
      description += `- Use this data to identify market trends and customer preferences\n`;
      description += `- Focus resources on high-performing products/services\n`;
      description += `- Monitor underperforming areas for potential improvements\n`;
      description += `- Track seasonal patterns to optimize inventory and staffing\n\n`;

      description += `### Next Steps\n`;
      description += `- Review detailed analytics for deeper insights\n`;
      description += `- Compare with historical data for trend validation\n`;
      description += `- Set performance targets based on current metrics\n`;
      description += `- Implement data-driven optimization strategies\n\n`;

      description += `---\n*💡 For interactive visualizations and advanced analytics features, consider upgrading your plan.*`;

      return description;
    } catch (fallbackError) {
      console.error('Error generating fallback visualization:', fallbackError);
      return `## 📊 ${title}\n\n### Chart Type: ${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart\n\n### Data Summary\n- **Available Data Points:** ${Object.keys(data).length}\n\n*Unable to generate detailed breakdown at this time. Please try again or contact support.*`;
    }
  }
}
