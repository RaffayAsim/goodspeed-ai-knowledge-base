import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, getAdminSupabaseClient } from '@/lib/server-supabase';
import { getProviderInfo } from '@/lib/server-ai';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getAdminSupabaseClient();

    // 1. Fetch user messages for token calculation
    const { data: messages } = await supabase
      .from('messages')
      .select('id, role, content, token_count, created_at, citations')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // 2. Fetch document and chunk counts
    const { count: docsCount } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: chunksCount } = await supabase
      .from('document_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // 3. Fetch conversations count
    const { count: convsCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    let totalTokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    let totalQueries = 0;
    let totalResponses = 0;

    const allMsgs = messages || [];
    for (const m of allMsgs) {
      if (m.role === 'user') {
        totalQueries++;
        const pTok = m.token_count || Math.ceil((m.content?.length || 0) / 4) + 250;
        promptTokens += pTok;
        totalTokens += pTok;
      } else if (m.role === 'assistant') {
        totalResponses++;
        const cTok = m.token_count || Math.ceil((m.content?.length || 0) / 4);
        completionTokens += cTok;
        totalTokens += cTok;
      }
    }

    // Build recent queries log
    const recentQueries: Array<{
      id: string;
      query: string;
      responsePreview: string;
      tokenCount: number;
      citationsCount: number;
      createdAt: string;
    }> = [];

    for (let i = 0; i < allMsgs.length; i++) {
      const msg = allMsgs[i];
      if (msg && msg.role === 'user') {
        const assistantResponse = i > 0 && allMsgs[i - 1]?.role === 'assistant' ? allMsgs[i - 1] : null;
        recentQueries.push({
          id: msg.id,
          query: msg.content,
          responsePreview: assistantResponse
            ? assistantResponse.content.slice(0, 160) + (assistantResponse.content.length > 160 ? '...' : '')
            : 'Response generated',
          tokenCount:
            (msg.token_count || Math.ceil((msg.content?.length || 0) / 4) + 250) +
            (assistantResponse?.token_count ||
              (assistantResponse?.content ? Math.ceil(assistantResponse.content.length / 4) : 0)),
          citationsCount: Array.isArray(assistantResponse?.citations) ? assistantResponse.citations.length : 0,
          createdAt: msg.created_at,
        });
        if (recentQueries.length >= 10) break;
      }
    }

    const providerInfo = getProviderInfo();

    return NextResponse.json({
      totalTokens,
      promptTokens,
      completionTokens,
      totalQueries,
      totalResponses,
      totalConversations: convsCount || 0,
      documentsCount: docsCount || 0,
      chunksCount: chunksCount || 0,
      providerInfo,
      recentQueries,
    });
  } catch (error: any) {
    console.error('Error fetching usage stats:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch usage stats' }, { status: 500 });
  }
}
