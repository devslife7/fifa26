import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/services/supabase/server';
import { createSessionToken, SESSION_COOKIE, COOKIE_OPTIONS } from '@/lib/services/auth';

export async function POST(request: Request) {
  const { email, code } = await request.json();

  if (!email || !code) {
    return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const normalizedEmail = email.toLowerCase();

  // Look up unexpired, unused OTP
  const { data: otp, error: otpError } = await supabase
    .from('otp_codes')
    .select('*')
    .eq('email', normalizedEmail)
    .eq('code', code)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (otpError || !otp) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
  }

  // Mark as used
  await supabase.from('otp_codes').update({ used: true }).eq('id', otp.id);

  // Find or create profile by email
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, display_name, email')
    .eq('email', normalizedEmail)
    .single();

  let userId: string;
  let displayName: string;

  if (existingProfile) {
    userId = existingProfile.id;
    displayName = existingProfile.display_name || otp.display_name || normalizedEmail.split('@')[0];
    // Update display_name if it was empty
    if (!existingProfile.display_name) {
      await supabase.from('profiles').update({ display_name: displayName }).eq('id', userId);
    }
  } else {
    // Create new profile
    userId = crypto.randomUUID();
    displayName = otp.display_name || normalizedEmail.split('@')[0];
    const { error: insertError } = await supabase.from('profiles').insert({
      id: userId,
      email: normalizedEmail,
      display_name: displayName,
    });
    if (insertError) {
      console.error('Profile insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
    }
  }

  // Create JWT
  const token = await createSessionToken(userId, normalizedEmail, displayName);

  const response = NextResponse.json({
    user: { id: userId, email: normalizedEmail, display_name: displayName },
  });

  response.cookies.set(SESSION_COOKIE, token, COOKIE_OPTIONS);

  return response;
}
