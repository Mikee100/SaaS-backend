import { ChatCompletionTool } from 'openai/resources/chat/completions';

export const AI_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'generate_chart',
      description: 'Generate a visual chart or graph (sales trends, product performance, etc.)',
      parameters: {
        type: 'object',
        properties: {
          chartType: {
            type: 'string',
            enum: ['line', 'bar', 'pie', 'doughnut', 'area'],
            description: 'The visual style of the chart',
          },
          dataType: {
            type: 'string',
            enum: ['sales', 'product', 'inventory', 'customer'],
            description: 'The type of data to visualize',
          },
          period: {
            type: 'string',
            enum: ['7days', '30days', '90days', '1year'],
            description: 'Time range for the data',
          },
          limit: {
            type: 'number',
            description: 'Number of items to show (e.g., top 10 products)',
          },
        },
        required: ['chartType', 'dataType'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_report',
      description: 'Generate a downloadable report in Excel or CSV format',
      parameters: {
        type: 'object',
        properties: {
          reportType: {
            type: 'string',
            enum: ['sales', 'inventory', 'product'],
            description: 'The content of the report',
          },
          format: {
            type: 'string',
            enum: ['xlsx', 'csv'],
            description: 'File format of the report',
          },
          period: {
            type: 'string',
            enum: ['7days', '30days', '90days', '1year', 'all'],
            description: 'Time frame for the report',
          },
        },
        required: ['reportType'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_inventory',
      description: 'Adjust or restock inventory levels for a specific product',
      parameters: {
        type: 'object',
        properties: {
          productName: {
            type: 'string',
            description: 'Name of the product to update',
          },
          quantity: {
            type: 'number',
            description: 'The amount to add to current stock (use negative for removals)',
          },
        },
        required: ['productName', 'quantity'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'initiate_backup',
      description: 'Trigger a manual backup of the system data',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_system_status',
      description: 'Check the current status of the database and key system metrics',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
];
