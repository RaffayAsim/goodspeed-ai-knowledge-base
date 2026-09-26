export type AiProviderType = 'openai' | 'groq' | 'together' | 'openrouter' | 'ollama' | 'custom';

export interface AiProviderConfig {
  type: AiProviderType;
  // Chat configuration
  chatBaseUrl: string;
  chatApiKey?: string;
  chatModel: string;
  chatTemperature?: number;
  chatMaxTokens?: number;
  
  // Embedding configuration (can point to a different endpoint e.g., OpenAI/Ollama even if chat is on Groq)
  embeddingBaseUrl: string;
  embeddingApiKey?: string;
  embeddingModel: string;
  embeddingDimension: number; // default 1536 for text-embedding-3-small
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateChatOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface EmbeddingResult {
  embedding: number[];
  index: number;
}

export interface IAiService {
  generateChatCompletion(options: GenerateChatOptions): Promise<ChatCompletionResult>;
  streamChatCompletion(options: GenerateChatOptions): AsyncIterable<string>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
  generateSingleEmbedding(text: string): Promise<number[]>;
  getProviderInfo(): {
    provider: AiProviderType;
    chatModel: string;
    embeddingModel: string;
    embeddingDimension: number;
  };
}
