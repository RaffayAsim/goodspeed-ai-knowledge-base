import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase, getUserFromHeader } from '../../../../lib/server-supabase';

export async function GET(req: NextRequest) {
  const user = await getUserFromHeader(req.headers.get('Authorization'));
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const convs = (data || []).map((c) => ({
    id: c.id,
    userId: c.user_id,
    title: c.title,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }));

  return NextResponse.json(convs);
}
