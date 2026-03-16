import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-server';
import { createServiceClient } from '@/lib/supabase/server';
import { createSessionToken, SESSION_COOKIE, COOKIE_OPTIONS } from '@/lib/auth';

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { displayName } = await request.json();
  if (!displayName || typeof displayName !== 'string') {
    return NextResponse.json({ error: 'displayName is required' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName })
    .eq('id', user.sub);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Issue new JWT with updated name
  const token = await createSessionToken(user.sub, user.email, displayName);

  const response = NextResponse.json({
    user: { id: user.sub, email: user.email, display_name: displayName },
  });

  response.cookies.set(SESSION_COOKIE, token, COOKIE_OPTIONS);

  return response;
}
