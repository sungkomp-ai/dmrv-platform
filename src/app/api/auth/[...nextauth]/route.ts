import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

// Force Node.js runtime — Prisma (better-sqlite3) requires native bindings
// that are not available in the Edge runtime.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
