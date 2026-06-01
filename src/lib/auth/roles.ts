export const DATABASE_NAME = 'command_database';

/** R1 = division code for RPRMD (not geographic Region 1) */
export const DIVISION = {
  code: 'R1',
  directorate: 'RPRMD',
  label: 'Regional Personnel Records Management Division',
} as const;

export const DATA_TABLE = 'personnel_list';

/** Login roles */
export const ROLES = [
  'super_admin',
  'RPRMD_admin',
  'rhq_admin',
  'phq_admin',
  'stn_admin',
] as const;

export type AppRole = (typeof ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Super Admin',
  RPRMD_admin: 'RPRMD Admin',
  rhq_admin: 'RHQ Admin',
  phq_admin: 'PHQ Admin',
  stn_admin: 'Station Admin',
};

export const ALLOWED_ROLES: readonly AppRole[] = ROLES;

export function isAppRole(role: string | null | undefined): role is AppRole {
  return !!role && ROLES.includes(role as AppRole);
}

export function canAccessRprmd(role: string | null | undefined): boolean {
  return isAppRole(role);
}

export function canManageUsers(role: string | null | undefined): boolean {
  return role === 'super_admin' || role === 'RPRMD_admin';
}

export function canAddPersonnel(role: string | null | undefined): boolean {
  return role === 'super_admin' || role === 'RPRMD_admin';
}

export function canAccessSystemSettings(role: string | null | undefined): boolean {
  return role === 'super_admin';
}

export function canManageTargetRole(
  actorRole: string | null | undefined,
  targetRole: AppRole
): boolean {
  if (actorRole === 'super_admin') {
    return true;
  }

  if (actorRole === 'RPRMD_admin') {
    return targetRole === 'stn_admin';
  }

  return false;
}

export function assignableRoles(actorRole: string | null | undefined): AppRole[] {
  if (actorRole === 'super_admin') {
    return [...ROLES];
  }

  if (actorRole === 'RPRMD_admin') {
    return ['stn_admin'];
  }

  return [];
}

/** @deprecated use DIVISION */
export const DIRECTORATE = DIVISION;
