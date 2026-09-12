import { NextRequest, NextResponse } from 'next/server';
import { RBAC_ROLES, getRoleList, hasPermission } from '@/lib/rbac';

// GET /api/dmrv/auth — Return RBAC roles and permissions
export async function GET() {
  try {
    const roles = getRoleList();
    return NextResponse.json({ roles, totalRoles: roles.length });
  } catch (error) {
    console.error('Error fetching RBAC:', error);
    return NextResponse.json({ error: 'Failed to fetch RBAC roles' }, { status: 500 });
  }
}

// POST /api/dmrv/auth — Validate access for a role+module combination
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { role: string; module: string; action: string };
    const { role, module: moduleKey, action } = body;

    if (!role || !moduleKey || !action) {
      return NextResponse.json({ error: 'role, module, and action are required' }, { status: 400 });
    }

    const roleConfig = RBAC_ROLES[role as keyof typeof RBAC_ROLES];
    if (!roleConfig) {
      return NextResponse.json(
        { error: `Unknown role: ${role}`, validRoles: Object.keys(RBAC_ROLES) },
        { status: 404 },
      );
    }

    const modulePermissions = roleConfig.permissions[moduleKey as keyof typeof roleConfig.permissions];
    if (!modulePermissions) {
      return NextResponse.json(
        { error: `Unknown module: ${moduleKey}`, validModules: Object.keys(roleConfig.permissions) },
        { status: 404 },
      );
    }

    const granted = hasPermission(role, moduleKey, action);

    return NextResponse.json({
      role,
      module: moduleKey,
      action,
      granted,
      allPermissions: modulePermissions,
      reason: granted
        ? `Role '${role}' has '${action}' permission on '${moduleKey}'`
        : `Role '${role}' does NOT have '${action}' permission on '${moduleKey}'`,
    });
  } catch (error) {
    console.error('Auth validation error:', error);
    return NextResponse.json({ error: 'Auth validation failed', details: String(error) }, { status: 500 });
  }
}
