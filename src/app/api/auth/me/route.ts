import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/services/auth-server';

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({
    user: { id: user.sub, email: user.email, display_name: user.display_name },
  });
}
