import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { IAiProvider } from '../ai-provider/ai-provider.interface';
import { RetrievedChunk, RagSearchOptions, RagSearchResult } from '@kb/types';

export interface InsertChunkInput {
  documentId: string;
  userId: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
  tokenCount?: number;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);
  private readonly defaultTopK: number;
  private readonly defaultSimilarityThreshold: number;

  constructor(
    private readonly supabaseService: SupabaseService,
    @Inject('IAiProvider') private readonly aiProvider: IAiProvider,
    private readonly configService: ConfigService,
  ) {
    this.defaultTopK = this.configService.get<number>('RAG_TOP_K', 4);
    this.defaultSimilarityThreshold = this.configService.get<number>('RAG_SIMILARITY_THRESHOLD', 0.3);
  }

  /**
   * Performs vector cosine similarity search using the Supabase pgvector RPC
   */
  async searchSimilarChunks(
    userId: string,
    options: RagSearchOptions,
  ): Promise<RagSearchResult> {
    const limit = options.limit ?? this.defaultTopK;
    const threshold = options.similarityThreshold ?? this.defaultSimilarityThreshold;

    this.logger.debug(`Generating embedding for query: "${options.query}"`);
    const queryEmbedding = await this.aiProvider.generateSingleEmbedding(options.query);

    const client = this.supabaseService.getAdminClient();

    // Invoke pgvector RPC function
    const { data, error } = await client.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
      p_user_id: userId,
    });

    if (error) {
      this.logger.error(`Vector search RPC error: ${error.message}`, error);
      throw new Error(`Failed to perform vector similarity search: ${error.message}`);
    }

    const chunks: RetrievedChunk[] = (data || []).map((row: any) => ({
      chunkId: row.chunk_id,
      documentId: row.document_id,
      documentTitle: row.document_title,
      chunkIndex: row.chunk_index,
      content: row.content,
      similarity: Number(row.similarity.toFixed(4)),
      metadata: row.metadata,
    }));

    return {
      query: options.query,
      chunks,
      totalRetrieved: chunks.length,
    };
  }

  /**
   * Bulk inserts generated chunks and their vector embeddings
   */
  async insertChunks(chunks: InsertChunkInput[]): Promise<void> {
    if (chunks.length === 0) return;

    const client = this.supabaseService.getAdminClient();
    const rows = chunks.map((c) => ({
      document_id: c.documentId,
      user_id: c.userId,
      chunk_index: c.chunkIndex,
      content: c.content,
      embedding: c.embedding,
      token_count: c.tokenCount,
      metadata: c.metadata ?? {},
    }));

    const { error } = await client.from('document_chunks').insert(rows);
    if (error) {
      this.logger.error(`Failed to insert document chunks: ${error.message}`, error);
      throw new Error(`Error saving document vector chunks: ${error.message}`);
    }
  }

  /**
   * Deletes all existing chunks for a document (used on document update or deletion)
   */
  async deleteChunksForDocument(documentId: string, userId: string): Promise<void> {
    const client = this.supabaseService.getAdminClient();
    const { error } = await client
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId)
      .eq('user_id', userId);

    if (error) {
      this.logger.error(`Failed to delete chunks for document ${documentId}: ${error.message}`);
      throw new Error(`Error deleting document chunks: ${error.message}`);
    }
  }
}
