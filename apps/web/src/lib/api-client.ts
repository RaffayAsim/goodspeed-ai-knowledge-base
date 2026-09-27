import { createClient } from './supabase';
import { IDocument, IConversation, IMessage, ICitation, IUsageStats, CreateDocumentDto, UpdateDocumentDto } from '@kb/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function getAuthToken(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `API Request failed (${response.status})`;
    try {
      const errorJson = await response.json();
      errorMessage = errorJson.message || errorMessage;
    } catch {
      // ignore parsing error
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

// Document API Methods
export const documentsApi = {
  list: () => apiRequest<IDocument[]>('/documents'),
  get: (id: string) => apiRequest<IDocument>(`/documents/${id}`),
  create: (data: CreateDocumentDto) =>
    apiRequest<IDocument>('/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: UpdateDocumentDto) =>
    apiRequest<IDocument>(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiRequest<{ success: boolean }>(`/documents/${id}`, {
      method: 'DELETE',
    }),
  extractFile: async (file: File): Promise<{ title: string; content: string; format: string }> => {
    const token = await getAuthToken();
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/documents/extract-file`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      let msg = 'Failed to extract text from document';
      try {
        const err = await response.json();
        msg = err.message || msg;
      } catch {}
      throw new Error(msg);
    }

    return response.json();
  },
};

// Chat API Methods
export const chatApi = {
  listConversations: () => apiRequest<IConversation[]>('/chat/conversations'),
  getConversation: (id: string) => apiRequest<IConversation>(`/chat/conversations/${id}`),
  deleteConversation: (id: string) =>
    apiRequest<{ success: boolean }>(`/chat/conversations/${id}`, {
      method: 'DELETE',
    }),
  sendMessage: (dto: { conversationId?: string; message: string }) =>
    apiRequest<{
      conversationId: string;
      message: IMessage;
      citations: ICitation[];
    }>('/chat/message', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  getProviderInfo: () =>
    apiRequest<{
      provider: string;
      chatModel: string;
      embeddingModel: string;
      embeddingDimension: number;
    }>('/chat/provider-info'),
  getUsageStats: () => apiRequest<IUsageStats>('/chat/usage-stats'),

  // Stream message with SSE
  streamMessage: async (
    dto: { conversationId?: string; message: string },
    callbacks: {
      onDelta: (content: string) => void;
      onCitations: (citations: ICitation[], conversationId: string) => void;
      onDone: (data: { messageId?: string; conversationId?: string; tokenCount?: number }) => void;
      onError: (err: string) => void;
    },
  ) => {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ...dto, stream: true }),
    });

    if (!response.ok) {
      const err = await response.text();
      callbacks.onError(err || `Stream failed with status ${response.status}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError('ReadableStream not supported on this browser/environment');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            if (parsed.type === 'delta') {
              callbacks.onDelta(parsed.content);
            } else if (parsed.type === 'citations') {
              callbacks.onCitations(parsed.citations, parsed.conversationId);
            } else if (parsed.type === 'done') {
              callbacks.onDone(parsed);
            } else if (parsed.type === 'error') {
              callbacks.onError(parsed.error);
            }
          } catch (e) {
            console.error('Failed to parse SSE line', e);
          }
        }
      }
    }
  },
};
