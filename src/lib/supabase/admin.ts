import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey || serviceRoleKey === 'PALITAN_NG_SERVICE_ROLE_KEY') {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function hasAdminClient(): boolean {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return !!serviceRoleKey && serviceRoleKey !== 'PALITAN_NG_SERVICE_ROLE_KEY';
}
