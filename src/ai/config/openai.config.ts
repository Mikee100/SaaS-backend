import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class OpenAIConfig {
  private openai: OpenAI | null = null;
  private readonly apiKey: string;
  private readonly chatModel: string;
  private readonly embeddingModel: string;
  private readonly extractorModel: string;
  private readonly maxChatTokens: number;
  private readonly maxExtractorTokens: number;
  private readonly maxVisualizationTokens: number;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.chatModel = process.env.OPENAI_CHAT_MODEL || process.env.OPENAI_MODEL || 'gpt-4o';
    this.embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
    this.extractorModel = process.env.OPENAI_EXTRACTOR_MODEL || process.env.OPENAI_MODEL || 'gpt-4o';
    
    // Token limits - configurable via env, with cost-conscious defaults
    this.maxChatTokens = parseInt(process.env.OPENAI_MAX_CHAT_TOKENS || '1200', 10);
    this.maxExtractorTokens = parseInt(process.env.OPENAI_MAX_EXTRACTOR_TOKENS || '300', 10);
    this.maxVisualizationTokens = parseInt(process.env.OPENAI_MAX_VISUALIZATION_TOKENS || '600', 10);

    if (this.apiKey && this.apiKey.trim() !== '') {
      this.openai = new OpenAI({
        apiKey: this.apiKey,
      });
    } else {
      console.warn('OpenAI API key not configured. AI features will be limited.');
    }
  }

  getClient(): OpenAI | null {
    return this.openai;
  }

  getChatModel(): string {
    return this.chatModel;
  }

  getEmbeddingModel(): string {
    return this.embeddingModel;
  }

  getExtractorModel(): string {
    return this.extractorModel;
  }

  isConfigured(): boolean {
    return this.openai !== null && this.apiKey.trim() !== '';
  }

  getMaxChatTokens(): number {
    return this.maxChatTokens;
  }

  getMaxExtractorTokens(): number {
    return this.maxExtractorTokens;
  }

  getMaxVisualizationTokens(): number {
    return this.maxVisualizationTokens;
  }
}

