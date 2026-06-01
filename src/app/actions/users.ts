'use server';

import { revalidatePath } from 'next/cache';
import { normalizeBadgeNumber } from '@/lib/auth/badge';
import { USERS_TABLE } from '@/lib/auth/constants';
import { hashPasswordForDb } from '@/lib/auth/password';
import {
  assignableRoles,
  canManageTargetRole,
  type AppRole,
} from '@/lib/auth/roles';
import { getSessionUser } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export type UserActionResult = {
  ok: boolean;
  message: string;
};

export type ManagedUser = {
  id: string;
  rank: string | null;
  full_name: string;
  rank_fullname: string | null;
  badge_number: string;
  office: string | null;
  unit: string | null;
  role: AppRole;
  is_active: boolean;
  created_at: string;
};

const USER_LIST_SELECT =
  'id, rank, full_name, rank_fullname, badge_number, office, unit, role, is_active, created_at';

async function requireActor() {
  const session = await getSessionUser();

  if (!session.userId || !session.user?.is_active) {
    throw new Error('Not authenticated.');
  }

  const actorRole = session.user.role;

  if (actorRole !== 'super_admin' && actorRole !== 'RPRMD_admin') {
    throw new Error('You do not have permission to manage users.');
  }

  return session;
}

export async function listManagedUsers(): Promise<ManagedUser[]> {
  await requireActor();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from(USERS_TABLE)
    .select(USER_LIST_SELECT)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ManagedUser[];
}

export async function createManagedUser(formData: FormData): Promise<UserActionResult> {
  const session = await requireActor();
  const actorRole = session.user!.role;

  const rank = String(formData.get('rank') ?? '').trim();
  const fullName = String(formData.get('full_name') ?? '').trim();
  const badgeNumber = normalizeBadgeNumber(String(formData.get('badge_number') ?? ''));
  const office = String(formData.get('office') ?? '').trim();
  const unit = String(formData.get('unit') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const role = String(formData.get('role') ?? '') as AppRole;

  if (!fullName || !badgeNumber || !password) {
    return { ok: false, message: 'Full name, badge number, and password are required.' };
  }

  if (password.length < 6) {
    return { ok: false, message: 'Password must be at least 6 characters.' };
  }

  if (!canManageTargetRole(actorRole, role)) {
    return { ok: false, message: 'You cannot assign this role.' };
  }

  const admin = createAdminClient();
  const passwordHash = await hashPasswordForDb(password);

  if (!passwordHash) {
    return { ok: false, message: 'Unable to hash password. Run sql/005_fix_login_connection.sql first.' };
  }

  const { error } = await admin.from(USERS_TABLE).insert({
    rank: rank || null,
    full_name: fullName,
    badge_number: badgeNumber,
    office: office || null,
    unit: unit || null,
    password: passwordHash,
    role,
    is_active: true,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath('/dashboard/users');
  return { ok: true, message: `User ${badgeNumber} created successfully.` };
}

export async function updateManagedUser(formData: FormData): Promise<UserActionResult> {
  const session = await requireActor();
  const actorRole = session.user!.role;

  const userId = String(formData.get('user_id') ?? '');
  const rank = String(formData.get('rank') ?? '').trim();
  const fullName = String(formData.get('full_name') ?? '').trim();
  const office = String(formData.get('office') ?? '').trim();
  const unit = String(formData.get('unit') ?? '').trim();
  const role = String(formData.get('role') ?? '') as AppRole;
  const isActive = formData.get('is_active') === 'true';

  if (!userId || !fullName) {
    return { ok: false, message: 'User and full name are required.' };
  }

  if (userId === session.userId && !isActive) {
    return { ok: false, message: 'You cannot deactivate your own account.' };
  }

  if (userId === session.userId && role !== actorRole) {
    return { ok: false, message: 'You cannot change your own role.' };
  }

  if (!canManageTargetRole(actorRole, role)) {
    return { ok: false, message: 'You cannot assign this role.' };
  }

  const admin = createAdminClient();

  const { data: target, error: targetError } = await admin
    .from(USERS_TABLE)
    .select('id, role')
    .eq('id', userId)
    .maybeSingle();

  if (targetError || !target) {
    return { ok: false, message: 'User not found.' };
  }

  if (!canManageTargetRole(actorRole, target.role as AppRole)) {
    return { ok: false, message: 'You cannot modify this user.' };
  }

  const { error } = await admin
    .from(USERS_TABLE)
    .update({
      rank: rank || null,
      full_name: fullName,
      office: office || null,
      unit: unit || null,
      role,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath('/dashboard/users');
  return { ok: true, message: 'User updated successfully.' };
}

export async function resetManagedUserPassword(formData: FormData): Promise<UserActionResult> {
  const session = await requireActor();
  const actorRole = session.user!.role;

  const userId = String(formData.get('user_id') ?? '');
  const password = String(formData.get('password') ?? '');

  if (!userId || !password) {
    return { ok: false, message: 'User and password are required.' };
  }

  if (password.length < 6) {
    return { ok: false, message: 'Password must be at least 6 characters.' };
  }

  const admin = createAdminClient();

  const { data: target, error: targetError } = await admin
    .from(USERS_TABLE)
    .select('id, role')
    .eq('id', userId)
    .maybeSingle();

  if (targetError || !target) {
    return { ok: false, message: 'User not found.' };
  }

  if (!canManageTargetRole(actorRole, target.role as AppRole)) {
    return { ok: false, message: 'You cannot reset password for this user.' };
  }

  const passwordHash = await hashPasswordForDb(password);

  if (!passwordHash) {
    return { ok: false, message: 'Unable to hash password. Run sql/005_fix_login_connection.sql first.' };
  }

  const { error } = await admin
    .from(USERS_TABLE)
    .update({
      password: passwordHash,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath('/dashboard/users');
  return { ok: true, message: 'Password reset successfully.' };
}

export async function getAssignableRolesForActor(): Promise<AppRole[]> {
  const session = await requireActor();
  return assignableRoles(session.user?.role);
}
