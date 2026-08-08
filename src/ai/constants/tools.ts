import { FunctionDeclaration, Type } from '@google/genai';

export const AI_TOOLS: FunctionDeclaration[] = [
  {
    name: 'generate_chart',
    description:
      'Generate a visual chart or graph (sales trends, product performance, etc.)',
    parameters: {
      type: Type.OBJECT,
      properties: {
        chartType: {
          type: Type.STRING,
          format: 'enum',
          enum: ['line', 'bar', 'pie', 'doughnut', 'area'],
          description: 'The visual style of the chart',
        },
        dataType: {
          type: Type.STRING,
          format: 'enum',
          enum: [
            'sales',
            'product',
            'inventory',
            'customer',
            'payroll',
            'restaurant',
            'salesTargets',
          ],
          description: 'The type of data to visualize',
        },
        period: {
          type: Type.STRING,
          format: 'enum',
          enum: ['7days', '30days', '90days', '1year'],
          description: 'Time range for the data',
        },
        limit: {
          type: Type.NUMBER,
          description: 'Number of items to show (e.g., top 10 products)',
        },
      },
      required: ['chartType', 'dataType'],
    },
  },
  {
    name: 'generate_report',
    description: 'Generate a downloadable report in Excel or CSV format',
    parameters: {
      type: Type.OBJECT,
      properties: {
        reportType: {
          type: Type.STRING,
          format: 'enum',
          enum: [
            'sales',
            'inventory',
            'product',
            'payroll',
            'restaurant',
            'salesTargets',
          ],
          description: 'The content of the report',
        },
        format: {
          type: Type.STRING,
          format: 'enum',
          enum: ['xlsx', 'csv'],
          description: 'File format of the report',
        },
        period: {
          type: Type.STRING,
          format: 'enum',
          enum: ['7days', '30days', '90days', '1year', 'all'],
          description: 'Time frame for the report',
        },
      },
      required: ['reportType'],
    },
  },
  {
    name: 'update_inventory',
    description: 'Adjust or restock inventory levels for a specific product',
    parameters: {
      type: Type.OBJECT,
      properties: {
        productName: {
          type: Type.STRING,
          description: 'Name of the product to update',
        },
        quantity: {
          type: Type.NUMBER,
          description:
            'The amount to add to current stock (use negative for removals)',
        },
      },
      required: ['productName', 'quantity'],
    },
  },
  {
    name: 'initiate_backup',
    description: 'Trigger a manual backup of the system data',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'get_system_status',
    description:
      'Check the current status of the database and key system metrics',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
];
