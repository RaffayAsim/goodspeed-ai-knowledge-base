import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  AiProviderType,
  ChatCompletionResult,
  GenerateChatOptions,
} from '@kb/types';
import { IAiProvider } from './ai-provider.interface';

@Injectable()
export class OpenAiCompatibleProvider implements IAiProvider {
  private readonly logger = new Logger(OpenAiCompatibleProvider.name);
  public readonly providerType: AiProviderType;

  private readonly chatClient: OpenAI;
  private readonly embeddingClient: OpenAI;

  private readonly chatModel: string;
  private readonly chatTemperature: number;
  private readonly chatMaxTokens: number;

  private readonly embeddingModel: string;
  public readonly embeddingDimension: number;

  constructor(private readonly configService: ConfigService) {
    this.providerType = this.configService.get<AiProviderType>('AI_PROVIDER_TYPE', 'openai');

    // 1. Configure Chat Client
    const chatBaseUrl = this.configService.get<string>('AI_CHAT_BASE_URL', 'https://api.openai.com/v1');
    const chatApiKey = this.configService.get<string>('AI_CHAT_API_KEY', '') || 'dummy-key-for-local';
    this.chatModel = this.configService.get<string>('AI_CHAT_MODEL', 'gpt-4o-mini');
    this.chatTemperature = this.configService.get<number>('AI_CHAT_TEMPERATURE', 0.3);
    this.chatMaxTokens = this.configService.get<number>('AI_CHAT_MAX_TOKENS', 1500);

    this.chatClient = new OpenAI({
      baseURL: chatBaseUrl,
      apiKey: chatApiKey,
    });

    // 2. Configure Embedding Client
    const embeddingBaseUrl = this.configService.get<string>('AI_EMBEDDING_BASE_URL', 'https://api.openai.com/v1');
    const embeddingApiKey = this.configService.get<string>('AI_EMBEDDING_API_KEY', '') || chatApiKey;
    this.embeddingModel = this.configService.get<string>('AI_EMBEDDING_MODEL', 'text-embedding-3-small');
    this.embeddingDimension = this.configService.get<number>('AI_EMBEDDING_DIMENSION', 1536);

    this.embeddingClient = new OpenAI({
      baseURL: embeddingBaseUrl,
      apiKey: embeddingApiKey,
    });

    this.logger.log(
      `AI Provider initialized: [${this.providerType.toUpperCase()}] | Chat Model: ${this.chatModel} (${chatBaseUrl}) | Embedding Model: ${this.embeddingModel} (${embeddingBaseUrl})`,
    );
  }

  async generateChatCompletion(options: GenerateChatOptions): Promise<ChatCompletionResult> {
    try {
      const response = await this.chatClient.chat.completions.create({
        model: this.chatModel,
        messages: options.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options.temperature ?? this.chatTemperature,
        max_tokens: options.maxTokens ?? this.chatMaxTokens,
      });

      const choice = response.choices[0];
      return {
        content: choice?.message?.content ?? '',
        model: response.model,
        usage: {
          promptTokens: response.usage?.prompt_tokens ?? 0,
          completionTokens: response.usage?.completion_tokens ?? 0,
          totalTokens: response.usage?.total_tokens ?? 0,
        },
      };
    } catch (error: any) {
      this.logger.error(`Error in generateChatCompletion: ${error.message}`, error.stack);
      throw error;
    }
  }

  async *streamChatCompletion(options: GenerateChatOptions): AsyncIterable<string> {
    try {
      const stream = await this.chatClient.chat.completions.create({
        model: this.chatModel,
        messages: options.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options.temperature ?? this.chatTemperature,
        max_tokens: options.maxTokens ?? this.chatMaxTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          yield delta;
        }
      }
    } catch (error: any) {
      this.logger.error(`Error in streamChatCompletion: ${error.message}`, error.stack);
      throw error;
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    try {
      // Chunk batch in max 50 items if texts list is large
      const BATCH_SIZE = 50;
      const allEmbeddings: number[][] = [];

      for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE);
        let response: any;
        try {
          response = await this.embeddingClient.embeddings.create({
            model: this.embeddingModel,
            input: batch,
            dimensions: this.embeddingDimension,
          } as any);
        } catch (dimError: any) {
          this.logger.warn(
            `Embeddings create with dimensions=${this.embeddingDimension} failed: ${dimError.message}. Retrying without dimensions parameter.`,
          );
          response = await this.embeddingClient.embeddings.create({
            model: this.embeddingModel,
            input: batch,
          });
        }

        // Ensure embeddings maintain same order as input and match expected dimensions
        const sorted = response.data
          .sort((a: any, b: any) => a.index - b.index)
          .map((item: any) => {
            let vec: number[] = item.embedding;
            if (this.embeddingDimension && vec.length !== this.embeddingDimension) {
              if (vec.length > this.embeddingDimension) {
                this.logger.debug(
                  `Truncating returned embedding from ${vec.length} to configured ${this.embeddingDimension} dimensions`,
                );
                vec = vec.slice(0, this.embeddingDimension);
                const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
                if (norm > 0) {
                  vec = vec.map((v) => v / norm);
                }
              }
            }
            return vec;
          });

        allEmbeddings.push(...sorted);
      }

      return allEmbeddings;
    } catch (error: any) {
      this.logger.error(`Error in generateEmbeddings: ${error.message}`, error.stack);
      throw error;
    }
  }

  async generateSingleEmbedding(text: string): Promise<number[]> {
    const embeddings = await this.generateEmbeddings([text]);
    if (!embeddings[0]) {
      throw new Error('Failed to generate embedding for input text');
    }
    return embeddings[0];
  }

  getProviderInfo() {
    return {
      provider: this.providerType,
      chatModel: this.chatModel,
      embeddingModel: this.embeddingModel,
      embeddingDimension: this.embeddingDimension,
    };
  }
}
