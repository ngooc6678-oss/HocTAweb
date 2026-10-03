import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseConfig } from '@/lib/supabase/config';
import { hasSameOrigin } from '@/lib/request-origin';

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request, true)) {
    return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 403 });
  }
  if (getSupabaseConfig()) {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: 'local' });
  }
  const response = new NextResponse(null, { status: 303, headers: { Location: '/login' } });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
