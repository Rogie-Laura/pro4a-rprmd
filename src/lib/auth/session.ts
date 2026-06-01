import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { SESSION_COOKIE } from '@/lib/auth/constants';
import type { AccessPage } from '@/lib/auth/access-page';
import { canSignInToRprmd } from '@/lib/auth/access-page';
import { canAccessRprmd, canAccessSystemSettings, canAddPersonnel, canManageUsers, type AppRole } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';

export type AppUser = {
  id: string;
  rank: string | null;
  full_name: string;
  rank_fullname: string | null;
  badge_number: string;
  office: string | null;
  unit: string | null;
  role: AppRole;
  access_page: AccessPage;
  is_active: boolean;
};

const fetchUserBySession = cache(async (sessionToken: string): Promise<AppUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_user_by_session', {
    p_session: sessionToken,
  });

  if (error || !data) {
    return null;
  }

  return data as AppUser;
});

export const getSessionUser = cache(async (): Promise<{
  userId: string;
  user: AppUser | null;
}> => {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionToken) {
    return { userId: '', user: null };
  }

  const user = await fetchUserBySession(sessionToken);

  if (!user) {
    return { userId: '', user: null };
  }

  return {
    userId: user.id,
    user,
  };
});

export async function requireRprmdAccess() {
  const session = await getSessionUser();

  if (!session.userId || !session.user) {
    redirect('/login');
  }

  if (!canAccessRprmd(session.user)) {
    redirect('/login?error=access');
  }

  return session;
}

export async function requireUserManagementAccess() {
  const session = await requireRprmdAccess();

  if (!canManageUsers(session.user?.role)) {
    redirect('/dashboard');
  }

  return session;
}

export async function requireAddPersonnelAccess() {
  const session = await requireRprmdAccess();

  if (!canAddPersonnel(session.user?.role)) {
    redirect('/dashboard');
  }

  return session;
}

export async function requireSystemSettingsAccess() {
  const session = await requireRprmdAccess();

  if (!canAccessSystemSettings(session.user?.role)) {
    redirect('/dashboard');
  }

  return session;
}
