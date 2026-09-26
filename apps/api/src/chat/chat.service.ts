import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { VectorStoreService } from '../rag/vector-store.service';
import { IAiProvider } from '../ai-provider/ai-provider.interface';
import {
  IConversation,
  IMessage,
  ICitation,
  ChatMessage,
  RetrievedChunk,
} from '@kb/types';
import { SendMessageDto } from './dto/send-message.dto';
import { Response } from 'express';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly vectorStoreService: VectorStoreService,
    @Inject('IAiProvider') private readonly aiProvider: IAiProvider,
  ) {}

  async listConversations(userId: string): Promise<IConversation[]> {
    const client = this.supabaseService.getAdminClient();
    const { data, error } = await client
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list conversations: ${error.message}`);
    }

    return (data || []).map((c: any) => ({
      id: c.id,
      userId: c.user_id,
      title: c.title,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));
  }

  async getConversation(id: string, userId: string): Promise<IConversation> {
    const client = this.supabaseService.getAdminClient();
    const { data: conv, error: convError } = await client
      .from('conversations')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (convError || !conv) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }

    const { data: messages, error: msgError } = await client
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (msgError) {
      throw new Error(`Failed to load messages: ${msgError.message}`);
    }

    return {
      id: conv.id,
      userId: conv.user_id,
      title: conv.title,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at,
      messages: (messages || []).map((m: any) => ({
        id: m.id,
        conversationId: m.conversation_id,
        role: m.role,
        content: m.content,
        citations: m.citations ?? [],
        createdAt: m.created_at,
      })),
    };
  }

  async deleteConversation(id: string, userId: string): Promise<{ success: boolean }> {
    const client = this.supabaseService.getAdminClient();
    const { error } = await client
      .from('conversations')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete conversation: ${error.message}`);
    }

    return { success: true };
  }

  /**
   * Non-streaming chat endpoint
   */
  async sendMessage(userId: string, dto: SendMessageDto): Promise<{
    conversationId: string;
    message: IMessage;
    citations: ICitation[];
  }> {
    const client = this.supabaseService.getAdminClient();

    // 1. Get or create conversation
    let convId = dto.conversationId;
    if (!convId) {
      const title = dto.message.slice(0, 45) + (dto.message.length > 45 ? '...' : '');
      const { data: newConv, error: newConvError } = await client
        .from('conversations')
        .insert({ user_id: userId, title })
        .select()
        .single();

      if (newConvError || !newConv) {
        throw new Error(`Could not create conversation: ${newConvError?.message}`);
      }
      convId = newConv.id;
    }

    // 2. Save user message
    await client.from('messages').insert({
      conversation_id: convId,
      user_id: userId,
      role: 'user',
      content: dto.message,
    });

    // 3. RAG Retrieval: find relevant chunks
    const searchResult = await this.vectorStoreService.searchSimilarChunks(userId, {
      query: dto.message,
      limit: 4,
    });

    const citations = this.extractCitations(searchResult.chunks);

    // 4. Fetch prior message history (last 6 messages for multi-turn conversational context)
    const history = await this.loadRecentHistory(convId!, userId, 6);

    // 5. Construct augmented prompt
    const promptMessages = this.constructPromptMessages(
      dto.message,
      searchResult.chunks,
      history,
    );

    // 6. Generate AI response
    const completion = await this.aiProvider.generateChatCompletion({
      messages: promptMessages,
    });

    // 7. Save assistant message with citations
    const { data: savedAssistantMsg, error: saveMsgErr } = await client
      .from('messages')
      .insert({
        conversation_id: convId,
        user_id: userId,
        role: 'assistant',
        content: completion.content,
        citations,
        token_count: completion.usage?.totalTokens,
      })
      .select()
      .single();

    if (saveMsgErr || !savedAssistantMsg) {
      throw new Error(`Failed to save assistant response: ${saveMsgErr?.message}`);
    }

    return {
      conversationId: convId!,
      message: {
        id: savedAssistantMsg.id,
        conversationId: savedAssistantMsg.conversation_id,
        role: 'assistant',
        content: savedAssistantMsg.content,
        citations: savedAssistantMsg.citations,
        createdAt: savedAssistantMsg.created_at,
      },
      citations,
    };
  }

  /**
   * Server-Sent Events (SSE) streaming chat endpoint
   */
  async streamMessage(
    userId: string,
    dto: SendMessageDto,
    res: Response,
  ): Promise<void> {
    const client = this.supabaseService.getAdminClient();

    // Set headers for SSE stream
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const writeSSE = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // 1. Get or create conversation
      let convId = dto.conversationId;
      if (!convId) {
        const title = dto.message.slice(0, 45) + (dto.message.length > 45 ? '...' : '');
        const { data: newConv } = await client
          .from('conversations')
          .insert({ user_id: userId, title })
          .select()
          .single();
        convId = newConv.id;
      }

      // 2. Save user message
      await client.from('messages').insert({
        conversation_id: convId,
        user_id: userId,
        role: 'user',
        content: dto.message,
      });

      // 3. RAG Retrieval
      const searchResult = await this.vectorStoreService.searchSimilarChunks(userId, {
        query: dto.message,
        limit: 4,
      });

      const citations = this.extractCitations(searchResult.chunks);

      // Emit citations and conversationId event right away so UI can show sources
      writeSSE({
        type: 'citations',
        conversationId: convId,
        citations,
      });

      // 4. Load history
      const history = await this.loadRecentHistory(convId!, userId, 6);

      // 5. Construct prompt
      const promptMessages = this.constructPromptMessages(
        dto.message,
        searchResult.chunks,
        history,
      );

      // 6. Stream tokens
      let fullContent = '';
      const stream = this.aiProvider.streamChatCompletion({
        messages: promptMessages,
      });

      for await (const chunk of stream) {
        fullContent += chunk;
        writeSSE({
          type: 'delta',
          content: chunk,
        });
      }

      // 7. Persist complete assistant message in database
      const { data: savedMsg } = await client
        .from('messages')
        .insert({
          conversation_id: convId,
          user_id: userId,
          role: 'assistant',
          content: fullContent,
          citations,
        })
        .select()
        .single();

      writeSSE({
        type: 'done',
        messageId: savedMsg?.id,
        conversationId: convId,
      });

      res.end();
    } catch (error: any) {
      this.logger.error(`Error in streamMessage: ${error.message}`, error.stack);
      writeSSE({
        type: 'error',
        error: error.message || 'Stream processing failed',
      });
      res.end();
    }
  }

  private extractCitations(chunks: RetrievedChunk[]): ICitation[] {
    return chunks.map((c) => ({
      documentId: c.documentId,
      documentTitle: c.documentTitle,
      chunkId: c.chunkId,
      snippet: c.content.slice(0, 200) + (c.content.length > 200 ? '...' : ''),
      similarity: c.similarity,
    }));
  }

  private async loadRecentHistory(
    conversationId: string,
    userId: string,
    limit: number,
  ): Promise<ChatMessage[]> {
    const client = this.supabaseService.getAdminClient();
    const { data } = await client
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!data) return [];
    return data.reverse().map((m: any) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
  }

  private constructPromptMessages(
    userQuery: string,
    chunks: RetrievedChunk[],
    history: ChatMessage[],
  ): ChatMessage[] {
    let contextBlock = 'No relevant documents found in knowledge base.';

    if (chunks.length > 0) {
      contextBlock = chunks
        .map(
          (c, idx) =>
            `[Source ${idx + 1}: "${c.documentTitle}" (Similarity: ${Math.round(c.similarity * 100)}%)]\n${c.content}`,
        )
        .join('\n\n---\n\n');
    }

    const systemPrompt = `You are a knowledgeable, accurate AI Knowledge Base Assistant.
Your task is to answer the user's questions based primarily on the provided Document Context below.

Rules:
1. Ground your answers firmly in the provided Context.
2. If the answer is directly supported by the context, state it clearly and reference the source title.
3. If the context does not contain enough information to answer the question, state honestly that the knowledge base doesn't have that information, but offer general helpful knowledge if applicable while clarifying it wasn't in the docs.
4. Format your output with clean Markdown (headings, bullet points, code blocks where appropriate).

=== DOCUMENT CONTEXT ===
${contextBlock}
========================`;

    return [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userQuery },
    ];
  }
}
