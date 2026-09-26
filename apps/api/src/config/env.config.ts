import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  
  // Swappable AI Provider Configuration
  AI_PROVIDER_TYPE: z.enum(['openai', 'groq', 'together', 'openrouter', 'ollama', 'custom']).default('openai'),
  
  // Chat Completion Configuration
  AI_CHAT_BASE_URL: z.string().default('https://api.openai.com/v1'),
  AI_CHAT_API_KEY: z.string().default(''),
  AI_CHAT_MODEL: z.string().default('gpt-4o-mini'),
  AI_CHAT_TEMPERATURE: z.coerce.number().default(0.3),
  AI_CHAT_MAX_TOKENS: z.coerce.number().default(1500),
  
  // Embedding Configuration
  AI_EMBEDDING_BASE_URL: z.string().default('https://api.openai.com/v1'),
  AI_EMBEDDING_API_KEY: z.string().default(''),
  AI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  AI_EMBEDDING_DIMENSION: z.coerce.number().default(1536),

  // RAG Configuration
  RAG_TOP_K: z.coerce.number().default(4),
  RAG_SIMILARITY_THRESHOLD: z.coerce.number().default(0.3),
  RAG_CHUNK_SIZE: z.coerce.number().default(600),
  RAG_CHUNK_OVERLAP: z.coerce.number().default(100),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const errorDetails = JSON.stringify(result.error.format(), null, 2);
    throw new Error(`Environment validation error:\n${errorDetails}`);
  }
  return result.data;
}
