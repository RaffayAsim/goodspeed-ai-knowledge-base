const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../apps/api/.env') });
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in apps/api/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: process.env.AI_CHAT_API_KEY || 'dummy-key',
  baseURL: process.env.AI_CHAT_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai',
});

async function testRAG() {
  const query = 'What skills and experiences does Raffay have?';
  console.log('Query:', query);

  // 1. Generate embedding
  const embRes = await openai.embeddings.create({
    model: process.env.AI_EMBEDDING_MODEL || 'gemini-embedding-001',
    input: query,
    dimensions: parseInt(process.env.AI_EMBEDDING_DIMENSION || '1536', 10),
  });
  const vector = embRes.data[0].embedding;
  console.log('Generated embedding vector length:', vector.length);

  // 2. Vector search RPC
  const { data: matched, error: rpcErr } = await supabase.rpc('match_document_chunks', {
    query_embedding: vector,
    match_threshold: 0.1,
    match_count: 4,
    p_user_id: '3cced009-3d8a-4318-b4b7-78be02137cce',
  });

  if (rpcErr) {
    console.error('RPC Error:', rpcErr);
    return;
  }
  console.log('Matched chunks count:', matched ? matched.length : 0);
  if (matched) {
    matched.forEach((c, i) => {
      console.log(`[Chunk ${i+1}] Title: ${c.document_title} | Similarity: ${c.similarity.toFixed(3)}`);
      console.log('Content preview:', c.content.slice(0, 100) + '...\n');
    });
  }

  // 3. Chat completion with RAG context
  const context = matched ? matched.map(c => `[From Document: ${c.document_title}]\n${c.content}`).join('\n\n') : '';
  const chatRes = await openai.chat.completions.create({
    model: process.env.AI_CHAT_MODEL || 'gemini-3.8-flash',
    messages: [
      { role: 'system', content: 'You are a helpful AI assistant. Answer using the context below:\n' + context },
      { role: 'user', content: query }
    ],
  });

  console.log('--- AI Response ---');
  console.log(chatRes.choices[0].message.content);
  console.log('\n--- Usage & Tokens ---');
  console.log(chatRes.usage);
}

testRAG().catch(console.error);
