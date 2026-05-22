import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_OPTIONS,
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
} from '@/lib/services/auth';
import { isAdminRequest } from '@/lib/services/admin-auth-server';

export async function GET(request: Request) {
  return NextResponse.json({ authenticated: await isAdminRequest(request) });
}

export async function POST(request: Request) {
  const { secret } = await request.json().catch(() => ({ secret: '' }));

  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, await createAdminSessionToken(), ADMIN_COOKIE_OPTIONS);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    ...ADMIN_COOKIE_OPTIONS,
    maxAge: 0,
  });
  return response;
}
