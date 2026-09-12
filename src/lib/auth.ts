/**
 * Authentication & Authorization helpers.
 *
 * Design:
 *  - `getCurrentUser()` resolves the active user from a NextAuth session.
 *  - In development (NODE_ENV !== 'production') we fall back to a dev role
 *    so the demo keeps working without a login UI. The fallback role can be
 *    overridden per-request via the `x-dev-role` header or `?devRole=` query
 *    parameter — this lets you exercise different permission profiles.
 *  - In production, no fallback is provided: a missing session yields null
 *    and `requirePermission` will reject with 401.
 *  - `requirePermission(module, action)` returns a discriminated union
 *    `{ ok: true, user } | { ok: false, response }` so route handlers can
 *    `if (!auth.ok) return auth.response;` early-return on denial.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { RBAC_ROLES, hasPermission, type RoleKey } from '@/lib/rbac';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: RoleKey;
}

export interface AuthSession {
  user: AppUser;
  via: 'session' | 'dev-fallback';
}

/** Allowed dev fallback roles (for the `?devRole=` / `x-dev-role` overrides). */
const DEV_ROLE_OVERRIDE_HEADER = 'x-dev-role';
const DEV_ROLE_OVERRIDE_QUERY = 'devrole';

// ── NextAuth configuration ────────────────────────────────────────────────
/**
 * Credentials provider that maps a username → role.
 * For demo/dev purposes the password is not checked strictly; in production
 * replace this with a real user store (DB lookup + bcrypt + email verify).
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
        if (!credentials?.username) return null;
        // Dev-friendly mapping: username === role name (admin/buyer/...).
        // Anything else defaults to admin so demo logins always work.
        const role = (Object.keys(RBAC_ROLES).includes(credentials.username)
          ? credentials.username
          : 'admin') as RoleKey;
        return {
          id: `u-${role}`,
          name: role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          email: `${role}@dmrv.local`,
          role,
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
        };
      }
      return session;
    },
  },
  pages: {
    // No custom sign-in page yet — API-only auth for now.
    signIn: '/api/dmrv/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET || 'dev-only-insecure-secret-DO-NOT-USE-IN-PROD',
};

// ── Dev fallback ──────────────────────────────────────────────────────────
const DEV_DEFAULT_ROLE: RoleKey = 'admin';

function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

function resolveDevRole(req?: NextRequest): RoleKey {
  if (isProd()) {
    // No dev fallback in production. Callers must check null.
    return 'viewer' as RoleKey; // unused — caller checks isProd first
  }
  // 1. Header override: x-dev-role: buyer
  const headerRole = req?.headers.get(DEV_ROLE_OVERRIDE_HEADER);
  if (headerRole && Object.keys(RBAC_ROLES).includes(headerRole)) {
    return headerRole as RoleKey;
  }
  // 2. Query override: ?devrole=viewer
  const queryRole = req?.nextUrl?.searchParams.get(DEV_ROLE_OVERRIDE_QUERY);
  if (queryRole && Object.keys(RBAC_ROLES).includes(queryRole)) {
    return queryRole as RoleKey;
  }
  // 3. Default dev role
  return DEV_DEFAULT_ROLE;
}

// ── Session resolution ────────────────────────────────────────────────────
/**
 * Resolve the current user. In production requires a NextAuth session.
 * In development, falls back to a role derived from request headers/query
 * (defaults to `admin`) so the demo keeps working without login UI.
 */
export async function getCurrentUser(req?: NextRequest): Promise<AppUser | null> {
  // Lazy-import NextAuth to avoid pulling it into client bundles.
  const { getServerSession } = await import('next-auth');
  const session = await getServerSession(authOptions);
  if (session?.user) {
    const u = (session as unknown as { user: AppUser }).user;
    if (u?.role) return u;
  }

  if (isProd()) return null;

  // Dev fallback
  const role = resolveDevRole(req);
  return {
    id: `dev-${role}`,
    name: `Dev ${role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`,
    email: `dev-${role}@dmrv.local`,
    role,
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
          user: { id: user.id, name: user.name, role: user.role },
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
