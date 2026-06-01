import { createAdminClient } from '@/lib/supabase/admin';

export async function hashPasswordForDb(password: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc('hash_password', { p_password: password });

    if (error || !data) {
      return null;
    }

    return data as string;
  } catch {
    return null;
  }
}
