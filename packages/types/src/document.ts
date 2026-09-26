export interface IDocument {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  chunkCount?: number;
}

export interface CreateDocumentDto {
  title: string;
  content: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateDocumentDto {
  title?: string;
  content?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface IDocumentChunk {
  id: string;
  documentId: string;
  userId: string;
  chunkIndex: number;
  content: string;
  tokenCount?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
