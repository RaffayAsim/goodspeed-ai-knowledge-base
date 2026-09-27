import { createClient } from '@supabase/supabase-js';

export function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

export const getAdminSupabaseClient = getAdminSupabase;

export async function getUserFromHeader(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  const client = createClient(url, anonKey, {
    auth: { persistSession: false },
  });
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('authorization');
  return getUserFromHeader(authHeader);
}
