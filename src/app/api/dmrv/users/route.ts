import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requirePermission, requireRead, hashPassword, type AppUser } from '@/lib/auth';
import { RBAC_ROLES, type RoleKey } from '@/lib/rbac';

// GET /api/dmrv/users — list all users (requires audit:read — admin/auditor)
export async function GET(request: NextRequest) {
  const auth = await requireRead(request, 'audit');
  if (!auth.ok) return auth.response;

  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        // NOTE: passwordHash intentionally NOT selected
      },
    });

    return NextResponse.json({
      users,
      total: users.length,
      roles: Object.keys(RBAC_ROLES),
    });
  } catch (error) {
    console.error('Users list error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// Zod schema for user creation
const CreateUserSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9_.-]+$/, 'username must be lowercase alphanumeric, dots, dashes, underscores'),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(6).max(128),
  role: z.enum(Object.keys(RBAC_ROLES) as [RoleKey, ...RoleKey[]]),
});

// POST /api/dmrv/users — create a new user (requires governance:write — admin only)
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'governance', 'write');
  if (!auth.ok) return auth.response;
  const creator: AppUser = auth.user;

  try {
    const body = await request.json();
    const parsed = CreateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { username, email, name, password, role } = parsed.data;

    // Check for existing username/email
    const existing = await db.user.findFirst({
      where: { OR: [{ username }, { email }] },
      select: { username: true, email: true },
    });
    if (existing) {
      const field = existing.username === username ? 'username' : 'email';
      return NextResponse.json({ error: `${field} already taken` }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: {
        username,
        email,
        name,
        passwordHash,
        role,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    // Audit log (projectId null — user management is not project-scoped)
    await db.auditLog.create({
      data: {
        agentName: `${creator.name} (${creator.role})`,
        action: 'create_user',
        projectId: null,
        details: JSON.stringify({ newUserId: user.id, username, role, createdBy: creator.id }),
        severity: 'INFO',
      },
    });

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    console.error('User create error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

// PATCH /api/dmrv/users — update user role/status (requires governance:write — admin only)
const UpdateUserSchema = z.object({
  id: z.string().cuid(),
  role: z.enum(Object.keys(RBAC_ROLES) as [RoleKey, ...RoleKey[]]).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'LOCKED']).optional(),
  name: z.string().min(1).max(100).optional(),
});

export async function PATCH(request: NextRequest) {
  const auth = await requirePermission(request, 'governance', 'write');
  if (!auth.ok) return auth.response;
  const admin: AppUser = auth.user;

  try {
    const body = await request.json();
    const parsed = UpdateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { id, role, status, name } = parsed.data;

    const target = await db.user.findUnique({
      where: { id },
      select: { id: true, username: true, role: true, status: true, name: true },
    });
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent self-lockout: admin cannot suspend/lock their own account
    if (id === admin.id && status && status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Cannot suspend or lock your own account' },
        { status: 400 },
      );
    }

    const data: { role?: string; status?: string; name?: string } = {};
    if (role && role !== target.role) data.role = role;
    if (status && status !== target.status) data.status = status;
    if (name !== undefined && name !== target.name) data.name = name;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: true, user: target, message: 'No changes' });
    }

    const updated = await db.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    await db.auditLog.create({
      data: {
        agentName: `${admin.name} (${admin.role})`,
        action: 'update_user',
        projectId: null,
        details: JSON.stringify({
          targetUser: target.username,
          previous: { role: target.role, status: target.status, name: target.name },
          updated: data,
          updatedBy: admin.id,
        }),
        severity: 'WARN',
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error('User update error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
