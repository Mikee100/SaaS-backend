import { Injectable } from '@nestjs/common';
import { OpenAIConfig } from '../config/openai.config';

export interface ExtractedData {
  intent?: string;
  entities?: Record<string, any>;
  parameters?: Record<string, any>;
  category?: string;
  confidence?: number;
}

@Injectable()
export class ExtractionService {
  constructor(private readonly openaiConfig: OpenAIConfig) {}

  async extractIntentAndEntities(
    message: string,
    context?: string,
  ): Promise<ExtractedData> {
    if (!this.openaiConfig.isConfigured()) {
      return this.fallbackExtraction(message);
    }

    const client = this.openaiConfig.getClient();
    if (!client) {
      return this.fallbackExtraction(message);
    }

    try {
      const systemPrompt = `You are an AI assistant that extracts intent, entities, and parameters from user messages in a business management context.

Analyze the user's message and extract:
1. Intent: What the user wants to do (e.g., "get_sales_data", "update_inventory", "add_stock", "generate_report", "create_chart", "view_reports")
2. Entities: Key business entities mentioned (products, customers, dates, amounts, etc.)
   - For inventory commands: extract product names, quantities, stock levels
   - For reports: extract report type (sales, inventory, product), format (xlsx, csv), period (7days, 30days, 90days, 1year, all)
   - For charts: extract chart type (line, bar, pie, doughnut, area), data type (sales, product, inventory, customer), period, limit
3. Parameters: Specific values or filters mentioned
   - numbers: Array of all numbers found in the message
   - quantity: The quantity to add/update (for inventory commands)
   - productName: The name of the product (for inventory commands)
   - chartType: Type of chart requested
   - reportType: Type of report requested
   - period: Time period for reports/charts
4. Category: Business category (sales, inventory, customers, reports, charts, etc.)
5. Confidence: Your confidence level (0-1)

IMPORTANT: For commands like "add 10 stocks to product X" or "add ten stocks to maybe a product":
- Extract the number (10, ten, etc.) as quantity
- Extract the product name (X, product name, etc.) as productName in entities
- Set intent to "update_inventory" or "add_stock"
- Set category to "inventory"

IMPORTANT: For report requests with specific months like "December sales report" or "January 2026 report":
- Extract month names (January, February, March, April, May, June, July, August, September, October, November, December)
- Extract year if mentioned (e.g., "2026", "2025")
- Set intent to "generate_report" or "get_sales_report"
- Set category to "reports"
- Include month name in entities.month and year in entities.year or parameters.year

Return a JSON object with this structure:
{
  "intent": "string",
  "entities": {
    "product": "string (product name if mentioned)",
    "quantity": number (if mentioned)
  },
  "parameters": {
    "numbers": [array of numbers],
    "quantity": number,
    "productName": "string",
    "chartType": "string",
    "reportType": "string",
    "period": "string"
  },
  "category": "string",
  "confidence": 0.0-1.0
}`;

      const userPrompt = context
        ? `Context: ${context}\n\nUser message: ${message}`
        : `User message: ${message}`;

      const response = await client.chat.completions.create({
        model: this.openaiConfig.getExtractorModel(),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: this.openaiConfig.getMaxExtractorTokens(),
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return this.fallbackExtraction(message);
      }

      try {
        const extracted = JSON.parse(content);
        return {
          intent: extracted.intent,
          entities: extracted.entities || {},
          parameters: extracted.parameters || {},
          category: extracted.category || 'general',
          confidence: extracted.confidence || 0.7,
        };
      } catch (parseError) {
        console.error('Error parsing extraction response:', parseError);
        return this.fallbackExtraction(message);
      }
    } catch (error: any) {
      console.error('Error extracting intent and entities:', error);
      return this.fallbackExtraction(message);
    }
  }

  private fallbackExtraction(message: string): ExtractedData {
    const lowerMessage = message.toLowerCase();
    let intent = 'general_query';
    let category = 'general';
    const entities: Record<string, any> = {};
    const parameters: Record<string, any> = {};

    // Simple keyword-based extraction as fallback
    if (lowerMessage.includes('sales') || lowerMessage.includes('revenue')) {
      intent = 'get_sales_data';
      category = 'sales';
    } else if (lowerMessage.includes('inventory') || lowerMessage.includes('stock')) {
      intent = 'get_inventory_data';
      category = 'inventory';
    } else if (lowerMessage.includes('customer')) {
      intent = 'get_customer_data';
      category = 'customers';
    } else if (lowerMessage.includes('product')) {
      intent = 'get_product_data';
      category = 'products';
    }

    // Extract numbers
    const numbers = message.match(/\d+/g);
    if (numbers) {
      parameters.numbers = numbers.map(Number);
    }

    // Extract dates (simple patterns)
    const datePatterns = [
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(today|yesterday|last week|last month)/i,
    ];
    for (const pattern of datePatterns) {
      const match = message.match(pattern);
      if (match) {
        parameters.date = match[1];
        break;
      }
    }

    return {
      intent,
      entities,
      parameters,
      category,
      confidence: 0.5,
    };
  }
}

