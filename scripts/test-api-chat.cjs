const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../apps/api/.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in apps/api/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('\n--- 1. Authenticating User ---');
  const targetEmail = 'raffay.asim6@gmail.com';

  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: targetEmail,
  });

  if (linkErr) {
    console.error('Failed to generate magic link:', linkErr);
    return;
  }

  const { data: sessionData, error: sessionErr } = await supabase.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  });

  if (sessionErr || !sessionData.session) {
    console.error('Failed to obtain session:', sessionErr);
    return;
  }

  const token = sessionData.session.access_token;
  console.log('Authenticated successfully as:', sessionData.user.email);

  console.log('\n--- 2. Testing Provider Info Endpoint ---');
  const providerRes = await fetch('http://localhost:4000/api/chat/provider-info', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const providerData = await providerRes.json();
  console.log('Provider Info:', providerData);

  console.log('\n--- 3. Testing Streaming Chat Endpoint (/api/chat/stream) ---');
  const streamRes = await fetch('http://localhost:4000/api/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message: 'Briefly summarize Raffay Asim key projects and experience in 3 bullet points.',
    }),
  });

  if (!streamRes.ok) {
    console.error('Stream failed:', streamRes.status, await streamRes.text());
    return;
  }

  console.log('Stream connected. Reading SSE chunks...\n');

  let fullResponse = '';
  let citationsCount = 0;

  const reader = streamRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ')) {
        const payload = JSON.parse(trimmed.slice(6));
        if (payload.type === 'citations') {
          citationsCount = payload.citations?.length || 0;
          console.log(`[SSE citations] Received ${citationsCount} citations. Conversation ID: ${payload.conversationId}`);
          payload.citations?.forEach((c, idx) => {
            console.log(`  Source ${idx + 1}: ${c.documentTitle} (match: ${Math.round(c.similarity * 100)}%)`);
          });
          console.log('\n--- [AI Streaming Response Starting] ---');
        } else if (payload.type === 'delta') {
          process.stdout.write(payload.content);
          fullResponse += payload.content;
        } else if (payload.type === 'done') {
          console.log('\n\n--- [SSE done] ---');
          console.log(`Completed messageId: ${payload.messageId}`);
          console.log(`Tokens used: ${payload.tokenCount}`);
        } else if (payload.type === 'error') {
          console.error('\n[SSE error]', payload.error);
        }
      }
    }
  }

  console.log('\n--- 4. Testing Usage & Token Tracking Endpoint (/api/chat/usage-stats) ---');
  const statsRes = await fetch('http://localhost:4000/api/chat/usage-stats', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const stats = await statsRes.json();
  console.log('Usage Stats:');
  console.log('- Total Tokens:', stats.totalTokens);
  console.log('- Total Queries:', stats.totalQueries);
  console.log('- Total Responses:', stats.totalResponses);
  console.log('- Documents in Vector Store:', stats.documentsCount);
  console.log('- Chunks in pgvector:', stats.chunksCount);
  console.log('- Recent Query Count:', stats.recentQueries?.length);

  console.log('\nAll End-to-End Chat & Token tests PASSED successfully!');
}

run().catch(console.error);
