/**
 * RBAC (Role-Based Access Control) — single source of truth.
 *
 * All roles, modules and permission strings are defined here so that:
 *  - `src/lib/auth.ts` can enforce permissions on API routes
 *  - `src/app/api/dmrv/auth/route.ts` can document them
 *  - Frontend can query /api/dmrv/auth to render role-aware UI
 *
 * Permission strings are free-form lowercase verbs (read, write, mint, trade,
 * retire, approve, reject, verify, execute, delete, configure, update,
 * calculate, export). A role has access to a (module, action) pair iff the
 * action appears in `RBAC_ROLES[role].permissions[module]`.
 */

export type RoleKey =
  | 'admin'
  | 'validator'
  | 'project_developer'
  | 'buyer'
  | 'auditor'
  | 'viewer';

export type ModuleKey =
  | 'dmrv'
  | 'ingestion'
  | 'carbon'
  | 'certification'
  | 'verification'
  | 'marketplace'
  | 'governance'
  | 'audit'
  | 'reporting'
  | 'monitoring'
  | 'logistics'
  | 'footprint'
  | 'simulation';

export interface RoleConfig {
  description: string;
  permissions: Partial<Record<ModuleKey, string[]>>;
}

export const RBAC_ROLES: Record<RoleKey, RoleConfig> = {
  admin: {
    description: 'Full system access — can manage all modules, users, and configurations',
    permissions: {
      dmrv: ['read', 'write', 'delete', 'execute'],
      ingestion: ['read', 'write', 'delete'],
      carbon: ['read', 'write', 'delete', 'verify'],
      certification: ['read', 'write', 'approve', 'reject'],
      verification: ['read', 'write', 'execute'],
      marketplace: ['read', 'write', 'mint', 'trade', 'retire'],
      governance: ['read', 'write', 'delete'],
      audit: ['read', 'write', 'execute'],
      reporting: ['read', 'write', 'export'],
      monitoring: ['read', 'write', 'configure'],
      logistics: ['read', 'write', 'update'],
      footprint: ['read', 'write', 'calculate'],
      simulation: ['read', 'execute'],
    },
  },
  validator: {
    description: 'Can verify, validate and certify carbon credit projects',
    permissions: {
      dmrv: ['read', 'execute'],
      ingestion: ['read'],
      carbon: ['read', 'verify'],
      certification: ['read', 'approve', 'reject'],
      verification: ['read', 'execute'],
      marketplace: ['read'],
      governance: ['read'],
      audit: ['read', 'execute'],
      reporting: ['read', 'export'],
      monitoring: ['read'],
      logistics: ['read'],
      footprint: ['read'],
      simulation: ['read', 'execute'],
    },
  },
  project_developer: {
    description: 'Can create and manage projects, submit data, and request certification',
    permissions: {
      dmrv: ['read'],
      ingestion: ['read', 'write'],
      carbon: ['read'],
      certification: ['read', 'write'],
      verification: ['read'],
      marketplace: ['read'],
      governance: ['read'],
      audit: ['read'],
      reporting: ['read', 'export'],
      monitoring: ['read'],
      logistics: ['read', 'write'],
      footprint: ['read', 'calculate'],
      simulation: ['read', 'execute'],
    },
  },
  buyer: {
    description: 'Can browse marketplace, purchase and retire credits',
    permissions: {
      dmrv: ['read'],
      ingestion: ['read'],
      carbon: ['read'],
      certification: ['read'],
      marketplace: ['read', 'trade', 'retire'],
      reporting: ['read'],
      monitoring: ['read'],
      footprint: ['read'],
      simulation: [],
    },
  },
  auditor: {
    description: 'Read-only access with audit trail visibility',
    permissions: {
      dmrv: ['read'],
      ingestion: ['read'],
      carbon: ['read'],
      certification: ['read'],
      verification: ['read'],
      marketplace: ['read'],
      governance: ['read'],
      audit: ['read', 'write'],
      reporting: ['read', 'export'],
      monitoring: ['read'],
      logistics: ['read'],
      footprint: ['read'],
      simulation: ['read'],
    },
  },
  viewer: {
    description: 'Read-only public access to non-confidential data',
    permissions: {
      dmrv: ['read'],
      ingestion: ['read'],
      carbon: ['read'],
      certification: ['read'],
      marketplace: ['read'],
      reporting: ['read'],
      monitoring: ['read'],
      footprint: ['read'],
    },
  },
};

/**
 * Check whether a role has a given permission on a module.
 * Returns false for unknown roles/modules.
 */
export function hasPermission(role: string, module: string, action: string): boolean {
  const roleConfig = RBAC_ROLES[role as RoleKey];
  if (!roleConfig) return false;
  const perms = roleConfig.permissions[module as ModuleKey];
  if (!perms) return false;
  return perms.includes(action);
}

/** List all valid role keys. */
export function getRoleList(): { role: string; description: string; modules: { module: string; permissions: string[] }[] }[] {
  return Object.entries(RBAC_ROLES).map(([role, config]) => ({
    role,
    description: config.description,
    modules: Object.entries(config.permissions).map(([module, perms]) => ({
      module,
      permissions: perms,
    })),
  }));
}
