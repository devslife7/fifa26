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

export async function createAdminSessionToken(): Promise<string> {
  return new SignJWT({ admin: true })
    .setSubject('admin')
    .setIssuedAt()
    .setExpirationTime('7d')
    .setProtectedHeader({ alg: 'HS256' })
    .sign(SECRET);
}

export async function verifyAdminSessionToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload.sub === 'admin' && payload.admin === true;
  } catch {
    return false;
  }
}

export const SESSION_COOKIE = 'session';
export const ADMIN_SESSION_COOKIE = 'admin_session';

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 30 * 24 * 60 * 60, // 30 days
};

export const ADMIN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60, // 7 days
};
