import { Injectable } from '@nestjs/common';
import { OpenAIConfig } from '../config/openai.config';

@Injectable()
export class EmbeddingService {
  constructor(private readonly openaiConfig: OpenAIConfig) {}

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openaiConfig.isConfigured()) {
      throw new Error('OpenAI API key not configured');
    }

    const client = this.openaiConfig.getClient();
    if (!client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const response = await client.embeddings.create({
        model: this.openaiConfig.getEmbeddingModel(),
        input: text,
      });

      return response.data[0].embedding;
    } catch (error: unknown) {
      console.error('Error generating embedding:', error);
      throw new Error(
        `Failed to generate embedding: ${this.getErrorMessage(error)}`,
      );
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.openaiConfig.isConfigured()) {
      throw new Error('OpenAI API key not configured');
    }

    const client = this.openaiConfig.getClient();
    if (!client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const response = await client.embeddings.create({
        model: this.openaiConfig.getEmbeddingModel(),
        input: texts,
      });

      return response.data.map((item) => item.embedding);
    } catch (error: unknown) {
      console.error('Error generating embeddings:', error);
      throw new Error(
        `Failed to generate embeddings: ${this.getErrorMessage(error)}`,
      );
    }
  }

  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) {
      return 0;
    }

    return dotProduct / denominator;
  }
}
