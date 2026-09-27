import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase, getUserFromHeader } from '../../../../lib/server-supabase';
import { getAiClients, chunkText } from '../../../../lib/server-ai';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUserFromHeader(req.headers.get('Authorization'));
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ message: 'Document not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    userId: data.user_id,
    title: data.title,
    content: data.content,
    tags: data.tags || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUserFromHeader(req.headers.get('Authorization'));
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const supabase = getAdminSupabase();

  const { data, error } = await supabase
    .from('documents')
    .update({
      ...(body.title ? { title: body.title.trim() } : {}),
      ...(body.content ? { content: body.content.trim() } : {}),
      ...(body.tags ? { tags: body.tags } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ message: 'Failed to update document' }, { status: 500 });
  }

  // Re-chunk if content was updated
  if (body.content) {
    try {
      await supabase.from('document_chunks').delete().eq('document_id', id);
      const chunks = chunkText(body.content);
      if (chunks.length > 0) {
        const { embeddingClient, embeddingModel, embeddingDimension } = getAiClients();
        const embRes = await embeddingClient.embeddings.create({
          model: embeddingModel,
          input: chunks,
          dimensions: embeddingDimension,
        } as any).catch(async () => {
          return await embeddingClient.embeddings.create({
            model: embeddingModel,
            input: chunks,
          });
        });

        const chunkRows = chunks.map((chunkStr, i) => ({
          document_id: id,
          user_id: user.id,
          chunk_index: i,
          content: chunkStr,
          embedding: embRes.data?.[i]?.embedding || [],
          token_count: Math.ceil(chunkStr.length / 4),
        }));

        await supabase.from('document_chunks').insert(chunkRows);
      }
    } catch (e) {
      console.error('Error updating chunks:', e);
    }
  }

  return NextResponse.json({
    id: data.id,
    userId: data.user_id,
    title: data.title,
    content: data.content,
    tags: data.tags || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
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

  await supabase.from('document_chunks').delete().eq('document_id', id);
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
