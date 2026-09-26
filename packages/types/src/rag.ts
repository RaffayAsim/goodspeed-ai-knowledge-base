export interface ChunkingOptions {
  maxChunkSize: number; // in characters (~500 - 800)
  chunkOverlap: number; // in characters (~100 - 150)
  separators?: string[];
}

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  content: string;
  similarity: number;
  chunkIndex: number;
  metadata?: Record<string, unknown>;
}

export interface RagSearchOptions {
  query: string;
  limit?: number; // default top-k = 4
  similarityThreshold?: number; // e.g. 0.35 (cosine distance threshold)
  filterDocumentIds?: string[];
}

export interface RagSearchResult {
  query: string;
  chunks: RetrievedChunk[];
  totalRetrieved: number;
}
