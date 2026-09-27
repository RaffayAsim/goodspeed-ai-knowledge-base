import { NextResponse } from 'next/server';
import { getAiClients } from '../../../../lib/server-ai';

export async function GET() {
  const { chatModel, embeddingModel, embeddingDimension } = getAiClients();
  return NextResponse.json({
    provider: process.env.AI_PROVIDER_TYPE || 'gemini',
    chatModel,
    embeddingModel,
    embeddingDimension,
  });
}
