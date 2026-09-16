/**
 * Authentication & Authorization helpers.
 *
 * Design:
 *  - `getCurrentUser()` resolves the active user from a NextAuth session.
 *  - NextAuth's CredentialsProvider now does a REAL DB lookup + bcrypt password
 *    verify against the `User` table.
 *  - In development (NODE_ENV !== 'production') we ALSO support a dev fallback
 *    role (via x-dev-role header / ?devRole= query) so API tests work without
 *    going through the browser login UI. This fallback is OFF in production.
 *  - `requirePermission(module, action)` returns a discriminated union
 *    `{ ok: true, user } | { ok: false, response }` so route handlers can
 *    `if (!auth.ok) return auth.response;` early-return on denial.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { RBAC_ROLES, hasPermission, type RoleKey } from '@/lib/rbac';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: RoleKey;
  username: string;
  status: string;
}

// ── Password hashing helpers ──────────────────────────────────────────────
const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

// ── NextAuth configuration ────────────────────────────────────────────────
/**
 * Credentials provider that performs a real DB lookup + bcrypt password
 * verify against the User table. On success it returns the user's id, name,
 * email, role, username and status — these are persisted in the JWT.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'dMRV Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const username = credentials?.username?.trim().toLowerCase();
        const password = credentials?.password ?? '';
        if (!username || !password) return null;

        const user = await db.user.findUnique({ where: { username } });
        if (!user) return null;
        if (user.status !== 'ACTIVE') return null; // SUSPENDED / LOCKED denied

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        // Update last login timestamp (fire-and-forget)
        db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {});

        return {
          id: user.id,
          name: user.name || user.username,
          email: user.email,
          role: user.role as RoleKey,
          username: user.username,
          status: user.status,
        } as AppUser;
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }, // 30 days
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as AppUser;
        token.role = u.role;
        token.id = u.id;
        token.username = u.username;
        token.status = u.status;
      }
      return token;
    },
    async session({ session, token }) {
      if (session && token.role) {
        (session as unknown as { user: AppUser }).user = {
          id: (token.id as string) || 'unknown',
          name: (token.name as string) || '',
          email: (token.email as string) || '',
          role: token.role as RoleKey,
          username: (token.username as string) || '',
          status: (token.status as string) || 'ACTIVE',
        };
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'dev-only-insecure-secret-DO-NOT-USE-IN-PROD',
};

// ── Dev fallback (development only, explicit override only) ────────────────
const DEV_ROLE_OVERRIDE_HEADER = 'x-dev-role';
const DEV_ROLE_OVERRIDE_QUERY = 'devrole';

function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Resolve a dev role ONLY when an explicit override is provided via
 * x-dev-role header or ?devRole= query parameter. This allows API testing
 * with curl without logging in, but does NOT auto-login browser requests.
 * Returns null when no override is present (browser users must log in).
 */
function resolveDevRole(req?: NextRequest): RoleKey | null {
  const headerRole = req?.headers.get(DEV_ROLE_OVERRIDE_HEADER);
  if (headerRole && Object.keys(RBAC_ROLES).includes(headerRole)) {
    return headerRole as RoleKey;
  }
  const queryRole = req?.nextUrl?.searchParams.get(DEV_ROLE_OVERRIDE_QUERY);
  if (queryRole && Object.keys(RBAC_ROLES).includes(queryRole)) {
    return queryRole as RoleKey;
  }
  return null;
}

// ── Session resolution ────────────────────────────────────────────────────
/**
 * Resolve the current user from a NextAuth session.
 * In development, if no session is present but an explicit dev-role override
 * is provided (x-dev-role header / ?devRole= query), uses that role — this
 * allows API testing with curl. Browser requests (no override) require login.
 * In production, no fallback — missing session yields null.
 */
export async function getCurrentUser(req?: NextRequest): Promise<AppUser | null> {
  // Lazy-import to avoid pulling NextAuth into client bundles.
  const { getServerSession } = await import('next-auth');
  const session = await getServerSession(authOptions);
  if (session?.user) {
    const u = (session as unknown as { user: AppUser }).user;
    if (u?.role) return u;
  }

  if (isProd()) return null;

  // Dev fallback — ONLY with explicit override (header/query), not by default
  const role = resolveDevRole(req);
  if (!role) return null;

  return {
    id: `dev-${role}`,
    name: `Dev ${role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`,
    email: `dev-${role}@dmrv.local`,
    role,
    username: `dev-${role}`,
    status: 'ACTIVE',
  };
}

// ── Permission enforcement ────────────────────────────────────────────────
export type AuthResult =
  | { ok: true; user: AppUser }
  | { ok: false; response: NextResponse };

/**
 * Enforce that the current user has `action` permission on `module`.
 *
 * Usage in a route handler:
 * ```ts
 * export async function POST(req: NextRequest) {
 *   const auth = await requirePermission(req, 'marketplace', 'mint');
 *   if (!auth.ok) return auth.response;
 *   // auth.user is now typed
 *   ...
 * }
 * ```
 */
export async function requirePermission(
  req: NextRequest | undefined,
  module: string,
  action: string,
): Promise<AuthResult> {
  const user = await getCurrentUser(req);

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Unauthorized',
          reason: 'Authentication required',
          module,
          action,
        },
        { status: 401 },
      ),
    };
  }

  if (!hasPermission(user.role, module, action)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Forbidden',
          reason: `Role '${user.role}' does not have '${action}' permission on '${module}'`,
          user: { id: user.id, name: user.name, role: user.role, username: user.username },
          required: { module, action },
        },
        { status: 403 },
      ),
    };
  }

  return { ok: true, user };
}

/**
 * Convenience: require READ permission. Most GET handlers use this.
 */
export async function requireRead(req: NextRequest | undefined, module: string): Promise<AuthResult> {
  return requirePermission(req, module, 'read');
}
