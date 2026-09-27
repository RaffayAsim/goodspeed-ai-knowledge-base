import OpenAI from 'openai';

export function getAiClients() {
  const chatApiKey = process.env.AI_CHAT_API_KEY || '';
  const chatBaseUrl =
    process.env.AI_CHAT_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai';
  const chatModel = process.env.AI_CHAT_MODEL || 'gemini-3.8-flash';

  const embeddingApiKey = process.env.AI_EMBEDDING_API_KEY || chatApiKey;
  const embeddingBaseUrl = process.env.AI_EMBEDDING_BASE_URL || chatBaseUrl;
  const embeddingModel = process.env.AI_EMBEDDING_MODEL || 'gemini-embedding-001';
  const embeddingDimension = parseInt(process.env.AI_EMBEDDING_DIMENSION || '1536', 10);

  const chatClient = new OpenAI({
    baseURL: chatBaseUrl,
    apiKey: chatApiKey,
    maxRetries: 3,
    timeout: 30000,
  });

  const embeddingClient = new OpenAI({
    baseURL: embeddingBaseUrl,
    apiKey: embeddingApiKey,
    maxRetries: 3,
    timeout: 30000,
  });

  return {
    chatClient,
    embeddingClient,
    chatModel,
    embeddingModel,
    embeddingDimension,
  };
}

export function getAiClient(): OpenAI {
  const { chatClient } = getAiClients();
  return chatClient;
}

export function getChatModelName(): string {
  return process.env.AI_CHAT_MODEL || 'gemini-3.8-flash';
}

export function getProviderInfo() {
  const { chatModel, embeddingModel, embeddingDimension } = getAiClients();
  const providerType = process.env.AI_PROVIDER_TYPE || 'gemini';
  return {
    provider: providerType === 'gemini' ? 'Google Gemini (OpenAI SDK)' : 'OpenAI-Compatible',
    chatModel,
    embeddingModel,
    embeddingDimension,
  };
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const { embeddingClient, embeddingModel } = getAiClients();
  const res = await embeddingClient.embeddings.create({
    model: embeddingModel,
    input: text.replace(/\n/g, ' '),
  });
  return res.data?.[0]?.embedding || [];
}

export function chunkText(
  text: string,
  chunkSize: number = 600,
  overlap: number = 100,
): string[] {
  if (!text || text.trim().length === 0) return [];

  // Simple recursive splitting
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (currentChunk.length + trimmed.length <= chunkSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmed;
    } else {
      if (currentChunk) chunks.push(currentChunk);

      if (trimmed.length > chunkSize) {
        // Split long paragraph by sentences or words
        const sentences = trimmed.split(/(?<=[.?!])\s+/);
        let subChunk = '';
        for (const sentence of sentences) {
          if (subChunk.length + sentence.length <= chunkSize) {
            subChunk += (subChunk ? ' ' : '') + sentence;
          } else {
            if (subChunk) chunks.push(subChunk);
            subChunk = sentence;
          }
        }
        if (subChunk) chunks.push(subChunk);
        currentChunk = '';
      } else {
        currentChunk = trimmed;
      }
    }
  }

  if (currentChunk) chunks.push(currentChunk);

  return chunks;
}
