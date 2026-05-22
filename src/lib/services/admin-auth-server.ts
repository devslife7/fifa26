import { cookies } from 'next/headers';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from './auth';

export async function isAdminRequest(request: Request): Promise<boolean> {
  const adminSecret = process.env.ADMIN_SECRET;
  if (adminSecret && request.headers.get('x-admin-secret') === adminSecret) {
    return true;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return false;

  return verifyAdminSessionToken(token);
}

export function forbiddenResponse() {
  return Response.json({ error: 'Forbidden' }, { status: 403 });
}
