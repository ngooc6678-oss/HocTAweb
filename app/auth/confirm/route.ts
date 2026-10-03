import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseConfig } from '@/lib/supabase/config';

export async function GET(request: NextRequest) {
  let target = '/login?error=confirmation';
  if (getSupabaseConfig()) {
    const supabase = await createClient();
    const tokenHash = request.nextUrl.searchParams.get('token_hash');
    const type = request.nextUrl.searchParams.get('type');
    const code = request.nextUrl.searchParams.get('code');
    // Support the secure token-hash email template and Supabase's default PKCE callback.
    if (tokenHash && (type === 'email' || type === 'signup')) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (!error) target = '/';
    } else if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) target = '/';
    }
  }
  // Return destinations are fixed so a crafted link cannot redirect to another site.
  const response = new NextResponse(null, { status: 303, headers: { Location: target } });
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
