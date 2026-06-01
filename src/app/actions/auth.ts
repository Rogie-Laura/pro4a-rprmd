'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, USERS_TABLE } from '@/lib/auth/constants';
import { normalizeBadgeNumber } from '@/lib/auth/badge';
import { canSignInToRprmd } from '@/lib/auth/access-page';
import { canAccessRprmd } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, hasAdminClient } from '@/lib/supabase/admin';

export type LoginResult = {
  ok: boolean;
  message: string;
};

type LoginRpcResult = {
  ok: boolean;
  message?: string;
  session_token?: string;
  user_id?: string;
  role?: string;
  access_page?: string;
};

export async function loginWithBadge(formData: FormData): Promise<LoginResult> {
  const badgeNumber = normalizeBadgeNumber(String(formData.get('badge_number') ?? ''));
  const password = String(formData.get('password') ?? '');

  if (!badgeNumber || !password) {
    return { ok: false, message: 'Badge number and password are required.' };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('login_user', {
      p_badge: badgeNumber,
      p_password: password,
    });

    if (error) {
      const rpcMissing =
        error.code === 'PGRST202' ||
        error.message?.includes('login_user') ||
        error.details?.includes('login_user');

      if (rpcMissing) {
        return {
          ok: false,
          message:
            'Login not set up yet. Run sql/005_fix_login_connection.sql in Supabase SQL Editor, then try again.',
        };
      }

      return { ok: false, message: error.message };
    }

    const result = data as LoginRpcResult;

    if (!result?.ok || !result.session_token) {
      return { ok: false, message: result?.message ?? 'Invalid badge number or password.' };
    }

    if (!canSignInToRprmd(result.access_page) || !canAccessRprmd({ role: result.role, access_page: result.access_page })) {
      return { ok: false, message: 'Access denied. Your account is not allowed to sign in here.' };
    }

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, result.session_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
  } catch {
    return { ok: false, message: 'Login service unavailable. Check Supabase connection.' };
  }

  redirect('/dashboard');
}

export async function logoutUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionToken) {
    try {
      const supabase = await createClient();
      await supabase.rpc('logout_user', { p_session: sessionToken });
    } catch {
      if (hasAdminClient()) {
        try {
          const admin = createAdminClient();
          await admin
            .from(USERS_TABLE)
            .update({ session: null, updated_at: new Date().toISOString() })
            .eq('session', sessionToken);
        } catch {
          // Cookie will still be cleared below.
        }
      }
    }
  }

  cookieStore.delete(SESSION_COOKIE);
  redirect('/login');
}
