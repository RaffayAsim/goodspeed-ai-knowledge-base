import { RetrievedChunk } from './rag';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ICitation {
  documentId: string;
  documentTitle: string;
  chunkId: string;
  snippet: string;
  similarity: number;
}

export interface IMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  citations?: ICitation[];
  tokenCount?: number;
  createdAt: string;
}

export interface IConversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: IMessage[];
}

export interface SendMessageDto {
  conversationId?: string; // If omitted, creates a new conversation
  message: string;
  stream?: boolean;
}

export interface ChatStreamChunk {
  type: 'delta' | 'citations' | 'done' | 'error';
  content?: string;
  citations?: ICitation[];
  conversationId?: string;
  messageId?: string;
  error?: string;
}
