import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE, type SessionPayload } from './auth';

export async function getAuthUser(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
