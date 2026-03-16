import { NextResponse } from 'next/server';
import dns from 'dns/promises';

export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ valid: false, reason: 'Email is required' });
  }

  // Basic format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ valid: false, reason: 'Invalid email format' });
  }

  const domain = email.split('@')[1];

  // MX record check with timeout
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const records = await dns.resolveMx(domain);
    clearTimeout(timeout);

    if (!records || records.length === 0) {
      return NextResponse.json({ valid: false, reason: 'Email domain does not accept mail' });
    }

    return NextResponse.json({ valid: true });
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOTFOUND' || code === 'ENODATA') {
      return NextResponse.json({ valid: false, reason: 'Email domain does not exist' });
    }
    // DNS timeout or other transient error — allow the email through
    return NextResponse.json({ valid: true });
  }
}
