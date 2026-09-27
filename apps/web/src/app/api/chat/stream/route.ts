import { NextRequest } from 'next/server';
import { getAdminSupabase, getUserFromHeader } from '../../../../lib/server-supabase';
import { getAiClients } from '../../../../lib/server-ai';

export async function POST(req: NextRequest) {
  const user = await getUserFromHeader(req.headers.get('Authorization'));
  if (!user) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { message, conversationId } = await req.json();
  if (!message || typeof message !== 'string') {
    return new Response(JSON.stringify({ message: 'Message is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = getAdminSupabase();
  const { chatClient, embeddingClient, chatModel, embeddingModel, embeddingDimension } =
    getAiClients();

  // 1. Get or create conversation
  let convId = conversationId;
  if (!convId) {
    const title = message.slice(0, 45) + (message.length > 45 ? '...' : '');
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({ user_id: user.id, title })
      .select()
      .single();
    convId = newConv?.id;
  }

  // 2. Save user message
  await supabase.from('messages').insert({
    conversation_id: convId,
    user_id: user.id,
    role: 'user',
    content: message,
  });

  // 3. RAG Retrieval via Vector Embedding & match_document_chunks RPC
  let chunks: any[] = [];
  try {
    const embRes = await embeddingClient.embeddings.create({
      model: embeddingModel,
      input: message,
      dimensions: embeddingDimension,
    } as any).catch(async () => {
      return await embeddingClient.embeddings.create({
        model: embeddingModel,
        input: message,
      });
    });

    const queryVec = embRes?.data?.[0]?.embedding;

    if (queryVec) {
      const { data: matched } = await supabase.rpc('match_document_chunks', {
        query_embedding: queryVec,
        match_threshold: 0.2,
        match_count: 4,
        p_user_id: user.id,
      });

      chunks = matched || [];
    }

    // Fallback to recent chunks if similarity threshold yielded 0
    if (chunks.length === 0) {
      const { data: recent } = await supabase
        .from('document_chunks')
        .select('id, document_id, chunk_index, content, documents!inner(title)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(4);

      if (recent && recent.length > 0) {
        chunks = recent.map((r: any) => ({
          chunk_id: r.id,
          document_id: r.document_id,
          document_title: r.documents?.title || 'Document',
          chunk_index: r.chunk_index,
          content: r.content,
          similarity: 0.5,
        }));
      }
    }
  } catch (err) {
    console.error('Vector search error:', err);
  }

  const citations = chunks.map((c: any) => ({
    documentId: c.document_id,
    documentTitle: c.document_title,
    chunkId: c.chunk_id,
    chunkIndex: c.chunk_index,
    snippet: c.content ? c.content.slice(0, 300) : '',
    similarity: c.similarity ?? 0.5,
  }));

  // 4. Fetch last 6 messages for multi-turn history
  const { data: historyData } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', convId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(6);

  const history = (historyData || []).reverse().slice(0, -1);

  // 5. Construct augmented prompt
  const contextString = chunks
    .map(
      (c: any, i: number) =>
        `[Excerpt ${i + 1} from Document: "${c.document_title}"]\n${c.content}`,
    )
    .join('\n\n---\n\n');

  const systemPrompt = `You are an expert AI Knowledge Base assistant.
Your answers are grounded in the user's private documents.
Use the provided excerpts below to synthesize a direct, comprehensive, and accurate response.
Cite specific document titles and details when relevant.
If the excerpts do not contain enough information, state that clearly and offer the best general guidance possible.

Relevant Document Context:
${contextString || 'No matching document excerpts were found for this query.'}`;

  const promptMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...history.map((h: any) => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    })),
    { role: 'user', content: message },
  ];

  // 6. SSE Stream
  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Emit citations immediately
      sendEvent({
        type: 'citations',
        conversationId: convId,
        citations,
      });

      let fullContent = '';

      try {
        const stream = await chatClient.chat.completions.create({
          model: chatModel,
          messages: promptMessages,
          stream: true,
          temperature: 0.3,
          max_tokens: 1500,
        });

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            sendEvent({ type: 'delta', content: delta });
          }
        }

        // Token count calculation
        const estimatedPromptTokens = Math.ceil((message.length + 1200) / 4);
        const estimatedCompletionTokens = Math.ceil(fullContent.length / 4);
        const totalTokenCount = estimatedPromptTokens + estimatedCompletionTokens;

        const { data: savedMsg } = await supabase
          .from('messages')
          .insert({
            conversation_id: convId,
            user_id: user.id,
            role: 'assistant',
            content: fullContent,
            citations,
            token_count: totalTokenCount,
          })
          .select()
          .single();

        sendEvent({
          type: 'done',
          messageId: savedMsg?.id,
          conversationId: convId,
          tokenCount: totalTokenCount,
        });
      } catch (streamErr: any) {
        console.error('Streaming completion error:', streamErr);
        sendEvent({
          type: 'error',
          error: streamErr.message || 'Stream processing failed',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
