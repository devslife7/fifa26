import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/services/supabase/server';
import { generateOtp } from '@/lib/services/auth';
import { sendOtpEmail } from '@/lib/services/email';

export async function POST(request: Request) {
  const { email, displayName } = await request.json();

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

  const supabase = createServiceClient();

  const { error } = await supabase.from('otp_codes').insert({
    email: email.toLowerCase(),
    code,
    display_name: displayName || email.split('@')[0],
    expires_at: expiresAt,
  });

  if (error) {
    console.error('OTP insert error:', error);
    return NextResponse.json({ error: 'Failed to create OTP' }, { status: 500 });
  }

  try {
    await sendOtpEmail(email, code);
  } catch (err) {
    console.error('Failed to send OTP email:', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
