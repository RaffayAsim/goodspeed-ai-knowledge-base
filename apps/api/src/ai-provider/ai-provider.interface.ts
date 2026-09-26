import {
  AiProviderType,
  ChatCompletionResult,
  GenerateChatOptions,
} from '@kb/types';

export interface IAiProvider {
  readonly providerType: AiProviderType;
  
  generateChatCompletion(options: GenerateChatOptions): Promise<ChatCompletionResult>;
  streamChatCompletion(options: GenerateChatOptions): AsyncIterable<string>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
  generateSingleEmbedding(text: string): Promise<number[]>;
}
