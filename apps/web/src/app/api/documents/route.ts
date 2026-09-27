import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase, getUserFromHeader } from '../../../lib/server-supabase';
import { getAiClients, chunkText } from '../../../lib/server-ai';

export async function GET(req: NextRequest) {
  const user = await getUserFromHeader(req.headers.get('Authorization'));
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const docs = (data || []).map((d) => ({
    id: d.id,
    userId: d.user_id,
    title: d.title,
    content: d.content,
    tags: d.tags || [],
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  }));

  return NextResponse.json(docs);
}

export async function POST(req: NextRequest) {
  const user = await getUserFromHeader(req.headers.get('Authorization'));
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { title, content, tags } = body;

  if (!title || !content) {
    return NextResponse.json(
      { message: 'Title and content are required' },
      { status: 400 },
    );
  }

  const supabase = getAdminSupabase();

  // 1. Insert document
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert({
      user_id: user.id,
      title: title.trim(),
      content: content.trim(),
      tags: tags || [],
    })
    .select()
    .single();

  if (docError || !doc) {
    return NextResponse.json(
      { message: `Failed to create document: ${docError?.message}` },
      { status: 500 },
    );
  }

  try {
    const chunks = chunkText(content);
    if (chunks.length > 0) {
      const { embeddingClient, embeddingModel } = getAiClients();
      const BATCH_SIZE = 25;
      const chunkRows: any[] = [];

      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        let embRes: any;
        try {
          embRes = await embeddingClient.embeddings.create({
            model: embeddingModel,
            input: batch,
          });
        } catch (e: any) {
          console.warn('Batch embedding error, retrying without batching:', e);
          embRes = await embeddingClient.embeddings.create({
            model: embeddingModel,
            input: batch.join(' ').slice(0, 1000),
          });
        }

        for (let j = 0; j < batch.length; j++) {
          let vec = embRes.data?.[j]?.embedding || embRes.data?.[0]?.embedding || [];
          if (vec.length > 1536) {
            vec = vec.slice(0, 1536);
          }
          chunkRows.push({
            document_id: doc.id,
            user_id: user.id,
            chunk_index: i + j,
            content: batch[j] || '',
            embedding: vec,
            token_count: Math.ceil((batch[j]?.length || 0) / 4),
          });
        }
      }

      await supabase.from('document_chunks').insert(chunkRows);
    }
  } catch (ragErr) {
    console.error('Failed to generate embeddings during document creation:', ragErr);
  }

  return NextResponse.json(
    {
      id: doc.id,
      userId: doc.user_id,
      title: doc.title,
      content: doc.content,
      tags: doc.tags || [],
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    },
    { status: 201 },
  );
}
