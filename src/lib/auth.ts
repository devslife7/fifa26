import { SignJWT, jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.ADMIN_SECRET!);

export function generateOtp(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, '0');
}

export interface SessionPayload {
  sub: string;
  email: string;
  display_name: string;
}

export async function createSessionToken(userId: string, email: string, displayName: string): Promise<string> {
  return new SignJWT({ email, display_name: displayName })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('30d')
    .setProtectedHeader({ alg: 'HS256' })
    .sign(SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      display_name: payload.display_name as string,
    };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = 'session';

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 30 * 24 * 60 * 60, // 30 days
};
