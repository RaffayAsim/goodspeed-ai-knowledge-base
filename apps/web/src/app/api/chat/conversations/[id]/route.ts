import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase, getUserFromHeader } from '../../../../../lib/server-supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUserFromHeader(req.headers.get('Authorization'));
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = getAdminSupabase();

  const { data: conv, error: convErr } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (convErr || !conv) {
    return NextResponse.json({ message: 'Conversation not found' }, { status: 404 });
  }

  const { data: messages, error: msgErr } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (msgErr) {
    return NextResponse.json({ message: msgErr.message }, { status: 500 });
  }

  return NextResponse.json({
    id: conv.id,
    userId: conv.user_id,
    title: conv.title,
    createdAt: conv.created_at,
    updatedAt: conv.updated_at,
    messages: (messages || []).map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      role: m.role,
      content: m.content,
      citations: m.citations || [],
      tokenCount: m.token_count || undefined,
      createdAt: m.created_at,
    })),
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUserFromHeader(req.headers.get('Authorization'));
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = getAdminSupabase();

  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
