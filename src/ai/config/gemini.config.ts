import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class GeminiConfig {
  private client: GoogleGenAI | null = null;
  private readonly apiKey: string;
  private readonly chatModel: string;
  private readonly embeddingModel: string;
  private readonly maxChatTokens: number;
  private readonly maxVisualizationTokens: number;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.chatModel = process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash';
    this.embeddingModel =
      process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';

    // Token limits - configurable via env, with cost-conscious defaults
    this.maxChatTokens = parseInt(
      process.env.GEMINI_MAX_CHAT_TOKENS || '1200',
      10,
    );
    this.maxVisualizationTokens = parseInt(
      process.env.GEMINI_MAX_VISUALIZATION_TOKENS || '600',
      10,
    );

    if (this.apiKey && this.apiKey.trim() !== '') {
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
    } else {
      console.warn(
        'Gemini API key not configured. AI features will be limited.',
      );
    }
  }

  getClient(): GoogleGenAI | null {
    return this.client;
  }

  getChatModel(): string {
    return this.chatModel;
  }

  getEmbeddingModel(): string {
    return this.embeddingModel;
  }

  isConfigured(): boolean {
    return this.client !== null && this.apiKey.trim() !== '';
  }

  getMaxChatTokens(): number {
    return this.maxChatTokens;
  }

  getMaxVisualizationTokens(): number {
    return this.maxVisualizationTokens;
  }
}
