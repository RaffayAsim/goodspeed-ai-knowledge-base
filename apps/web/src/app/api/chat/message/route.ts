import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, getAdminSupabaseClient } from '@/lib/server-supabase';
import { getAiClient, generateEmbedding, getChatModelName } from '@/lib/server-ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { conversationId: reqConvId, message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const supabase = getAdminSupabaseClient();

    // 1. Get or create conversation
    let convId = reqConvId;
    if (!convId) {
      const title = message.slice(0, 45) + (message.length > 45 ? '...' : '');
      const { data: newConv, error: newConvError } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, title })
        .select()
        .single();

      if (newConvError || !newConv) {
        return NextResponse.json({ error: `Could not create conversation: ${newConvError?.message}` }, { status: 500 });
      }
      convId = newConv.id;
    }

    // 2. Save user message
    const userTokCount = Math.ceil(message.length / 4);
    await supabase.from('messages').insert({
      conversation_id: convId,
      user_id: user.id,
      role: 'user',
      content: message,
      token_count: userTokCount,
    });

    // 3. RAG Retrieval: embed query
    let chunks: any[] = [];
    try {
      let queryEmbedding = await generateEmbedding(message);
      if (queryEmbedding && queryEmbedding.length > 1536) {
        queryEmbedding = queryEmbedding.slice(0, 1536);
      }
      const { data: rpcChunks, error: rpcError } = await supabase.rpc('match_document_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: 0.2,
        match_count: 5,
        p_user_id: user.id,
      });

      if (!rpcError && rpcChunks && rpcChunks.length > 0) {
        chunks = rpcChunks;
      }
    } catch (e) {
      console.warn('Similarity search failed, falling back to recent chunks:', e);
    }

    if (chunks.length === 0) {
      const { data: fallback } = await supabase
        .from('document_chunks')
        .select('id, document_id, content, metadata, chunk_index')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(4);

      if (fallback) {
        chunks = fallback;
      }
    }

    const citations = chunks.map((c) => ({
      documentId: c.document_id,
      title: c.metadata?.documentTitle || c.metadata?.source || 'Document Reference',
      chunkIndex: c.chunk_index ?? 0,
      snippet: (c.content || '').slice(0, 200),
      similarity: c.similarity ?? 0.85,
    }));

    // Build context
    const contextText = chunks.length > 0
      ? chunks.map((c, i) => `[Source ${i + 1}: ${c.metadata?.documentTitle || 'Document'}]\n${c.content}`).join('\n\n')
      : 'No reference documents found in knowledge base.';

    const systemPrompt = `You are an expert AI knowledge base assistant. Answer the user's question accurately using ONLY the provided context documents when available.
If the documents don't have enough information, answer transparently and note what is missing.
Format your answer with clear markdown (bullet points, bold highlights, code blocks if relevant).

Context from user's knowledge base:
${contextText}`;

    // Load recent messages
    const { data: historyMsgs } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(6);

    const openai = getAiClient();
    const chatMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...(historyMsgs || []).map((m: any) => ({
        role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.content || '',
      })),
      { role: 'user' as const, content: message },
    ];

    const primaryModel = getChatModelName();
    const candidateModels = [
      primaryModel,
      'gemini-flash-latest',
      'gemini-3.7-flash',
      'gemini-3.6-flash',
    ].filter((m, i, arr) => m && arr.indexOf(m) === i);

    let completion: any = null;
    let lastErr: any = null;

    for (const candidate of candidateModels) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          completion = await openai.chat.completions.create({
            model: candidate,
            messages: chatMessages,
            temperature: 0.3,
          });
          if (completion) break;
        } catch (err: any) {
          lastErr = err;
          await new Promise((r) => setTimeout(r, 400));
        }
      }
      if (completion) break;
    }

    if (!completion) {
      throw lastErr || new Error('Failed to generate response');
    }

    const replyContent = completion.choices[0]?.message?.content || 'No response generated.';
    const assistantTokCount = Math.ceil(replyContent.length / 4);

    // Save assistant message
    const { data: savedMsg, error: saveErr } = await supabase
      .from('messages')
      .insert({
        conversation_id: convId,
        user_id: user.id,
        role: 'assistant',
        content: replyContent,
        citations: citations,
        token_count: assistantTokCount,
      })
      .select()
      .single();

    if (saveErr) {
      console.error('Failed to save assistant message:', saveErr);
    }

    return NextResponse.json({
      conversationId: convId,
      message: savedMsg || {
        id: 'temp-' + Date.now(),
        conversation_id: convId,
        role: 'assistant',
        content: replyContent,
        created_at: new Date().toISOString(),
      },
      citations,
    });
  } catch (error: any) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: error.message || 'Failed to send message' }, { status: 500 });
  }
}
