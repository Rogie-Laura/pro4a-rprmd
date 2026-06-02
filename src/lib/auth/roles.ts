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

/** RLRDD app roles (managed from RPRMD User Management when access_page = RLRDD) */
export const RLRDD_ROLES = [
  'RLRDD_admin',
  'stn_logistics',
  'phq_logistics',
  'rhq_logistics',
] as const;

export type RlrddRole = (typeof RLRDD_ROLES)[number];

export const RLRDD_ROLE_LABELS: Record<RlrddRole, string> = {
  RLRDD_admin: 'RLRDD Admin',
  stn_logistics: 'Station Logistics',
  phq_logistics: 'PHQ Logistics',
  rhq_logistics: 'RHQ Logistics',
};

/** All roles that may appear in the shared users table */
export const ALL_MANAGED_ROLES = [...ROLES, ...RLRDD_ROLES] as const;

export type ManagedRole = (typeof ALL_MANAGED_ROLES)[number];

export const MANAGED_ROLE_LABELS: Record<ManagedRole, string> = {
  ...ROLE_LABELS,
  ...RLRDD_ROLE_LABELS,
};

export function isRlrddRole(role: string | null | undefined): role is RlrddRole {
  return !!role && RLRDD_ROLES.includes(role as RlrddRole);
}

export function isManagedRole(role: string | null | undefined): role is ManagedRole {
  return isAppRole(role) || isRlrddRole(role);
}

export function rolesForAccessPage(accessPage: 'RPRMD' | 'RLRDD' | 'BOTH'): ManagedRole[] {
  if (accessPage === 'BOTH') {
    return ['super_admin'];
  }

  if (accessPage === 'RLRDD') {
    return [...RLRDD_ROLES];
  }

  return [...ROLES];
}

export function isRoleValidForAccessPage(
  role: string,
  accessPage: 'RPRMD' | 'RLRDD' | 'BOTH'
): boolean {
  return rolesForAccessPage(accessPage).includes(role as ManagedRole);
}

export function canAccessRprmd(user: {
  role: string | null | undefined;
  access_page?: string | null;
}): boolean {
  const accessPage = user.access_page ?? 'RPRMD';
  if (accessPage !== 'RPRMD' && accessPage !== 'BOTH') {
    return false;
  }

  return isAppRole(user.role);
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

/** Roles that only see personnel matching their own office + unit. */
export function isScopedPersonnelRole(role: string | null | undefined): boolean {
  return role === 'rhq_admin' || role === 'phq_admin' || role === 'stn_admin';
}

export type PersonnelScope = {
  office: string;
  station: string;
  /** RHQ/PHQ admins also see hyphenated sub-units (e.g. ORPRMD → ORPRMD-RPHAS). */
  includeSubUnits: boolean;
};

/**
 * Returns office/station filters for personnel_list queries.
 * null = no restriction (super_admin, RPRMD_admin).
 */
export function getPersonnelScopeForUser(user: {
  role: AppRole;
  office: string | null;
  unit: string | null;
} | null): PersonnelScope | null {
  if (!user || !isScopedPersonnelRole(user.role)) {
    return null;
  }

  const office = user.office?.trim() ?? '';
  const station = user.unit?.trim() ?? '';

  return {
    office,
    station,
    includeSubUnits: user.role === 'rhq_admin' || user.role === 'phq_admin',
  };
}

export function formatPersonnelScopeLabel(scope: PersonnelScope): string {
  const base = `${scope.office} — ${scope.station}`;
  if (scope.includeSubUnits) {
    return `${base} (incl. ${scope.station}-*)`;
  }
  return base;
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
