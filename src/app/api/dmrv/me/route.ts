import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

// GET /api/dmrv/me — return the current authenticated user (or dev fallback)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null, authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      username: user.username,
      status: user.status,
    },
    authenticated: true,
    via: user.id.startsWith('dev-') ? 'dev-fallback' : 'session',
  });
}
