import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ChunkingService } from '../rag/chunking.service';
import { VectorStoreService } from '../rag/vector-store.service';
import { IAiProvider } from '../ai-provider/ai-provider.interface';
import { CreateDocumentDto, UpdateDocumentDto } from './dto/create-document.dto';
import { IDocument } from '@kb/types';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly chunkingService: ChunkingService,
    private readonly vectorStoreService: VectorStoreService,
    @Inject('IAiProvider') private readonly aiProvider: IAiProvider,
  ) {}

  async findAll(userId: string): Promise<IDocument[]> {
    const client = this.supabaseService.getAdminClient();
    const { data, error } = await client
      .from('documents')
      .select('*, document_chunks(count)')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      this.logger.error(`Error fetching documents: ${error.message}`);
      throw new Error(`Failed to list documents: ${error.message}`);
    }

    return (data || []).map((doc: any) => ({
      id: doc.id,
      userId: doc.user_id,
      title: doc.title,
      content: doc.content,
      tags: doc.tags ?? [],
      metadata: doc.metadata ?? {},
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
      chunkCount: doc.document_chunks?.[0]?.count ?? 0,
    }));
  }

  async findOne(id: string, userId: string): Promise<IDocument> {
    const client = this.supabaseService.getAdminClient();
    const { data, error } = await client
      .from('documents')
      .select('*, document_chunks(count)')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      content: data.content,
      tags: data.tags ?? [],
      metadata: data.metadata ?? {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      chunkCount: data.document_chunks?.[0]?.count ?? 0,
    };
  }

  async create(userId: string, dto: CreateDocumentDto): Promise<IDocument> {
    const client = this.supabaseService.getAdminClient();

    // 1. Insert document record
    const { data: document, error: docError } = await client
      .from('documents')
      .insert({
        user_id: userId,
        title: dto.title,
        content: dto.content,
        tags: dto.tags ?? [],
      })
      .select()
      .single();

    if (docError || !document) {
      this.logger.error(`Error creating document: ${docError?.message}`);
      throw new Error(`Failed to create document: ${docError?.message}`);
    }

    // 2. Run ingestion & embedding pipeline asynchronously/transactionally
    await this.processDocumentEmbedding(document.id, userId, dto.content);

    return this.findOne(document.id, userId);
  }

  async update(id: string, userId: string, dto: UpdateDocumentDto): Promise<IDocument> {
    const client = this.supabaseService.getAdminClient();

    // Verify ownership
    await this.findOne(id, userId);

    const updatePayload: Record<string, any> = {};
    if (dto.title !== undefined) updatePayload.title = dto.title;
    if (dto.tags !== undefined) updatePayload.tags = dto.tags;
    if (dto.content !== undefined) updatePayload.content = dto.content;

    const { error: updateError } = await client
      .from('documents')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', userId);

    if (updateError) {
      this.logger.error(`Error updating document ${id}: ${updateError.message}`);
      throw new Error(`Failed to update document: ${updateError.message}`);
    }

    // If content was modified, re-chunk and re-embed
    if (dto.content !== undefined) {
      await this.vectorStoreService.deleteChunksForDocument(id, userId);
      await this.processDocumentEmbedding(id, userId, dto.content);
    }

    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<{ success: boolean }> {
    const client = this.supabaseService.getAdminClient();

    // Verify ownership
    await this.findOne(id, userId);

    const { error } = await client
      .from('documents')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      this.logger.error(`Error deleting document ${id}: ${error.message}`);
      throw new Error(`Failed to delete document: ${error.message}`);
    }

    return { success: true };
  }

  /**
   * Internal ingestion pipeline: Chunks text, generates vector embeddings, stores in pgvector
   */
  private async processDocumentEmbedding(
    documentId: string,
    userId: string,
    content: string,
  ): Promise<void> {
    const chunks = this.chunkingService.chunkText(content);
    if (chunks.length === 0) return;

    this.logger.log(
      `Processing embeddings for document ${documentId}: ${chunks.length} chunks generated.`,
    );

    const chunkTexts = chunks.map((c) => c.content);
    const embeddings = await this.aiProvider.generateEmbeddings(chunkTexts);

    const chunkRows = chunks.map((chunk, idx) => ({
      documentId,
      userId,
      chunkIndex: chunk.index,
      content: chunk.content,
      embedding: embeddings[idx]!,
      tokenCount: chunk.tokenEstimate,
    }));

    await this.vectorStoreService.insertChunks(chunkRows);
    this.logger.log(`Successfully stored ${chunkRows.length} chunks with vectors for doc ${documentId}.`);
  }
}
