'use server';

import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/lib/auth/session';
import { API_KEYS_TABLE, generateApiKey } from '@/lib/api/command';
import { createAdminClient, hasAdminClient } from '@/lib/supabase/admin';

export type ApiKeyRow = {
  id: string;
  label: string;
  key_prefix: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
};

export type GenerateApiKeyResult = {
  ok: boolean;
  message: string;
  rawKey?: string;
};

async function requireSuperAdmin() {
  const session = await getSessionUser();

  if (!session.userId || !session.user?.is_active || session.user.role !== 'super_admin') {
    throw new Error('You do not have permission to manage API keys.');
  }

  return session;
}

export async function listApiKeys(): Promise<ApiKeyRow[]> {
  await requireSuperAdmin();

  if (!hasAdminClient()) {
    return [];
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from(API_KEYS_TABLE)
    .select('id, label, key_prefix, is_active, created_at, last_used_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ApiKeyRow[];
}

export async function generateCommandApiKey(formData: FormData): Promise<GenerateApiKeyResult> {
  try {
    await requireSuperAdmin();

    if (!hasAdminClient()) {
      return { ok: false, message: 'SUPABASE_SERVICE_ROLE_KEY is not configured.' };
    }

    const label = String(formData.get('label') ?? '').trim() || 'Command Analytics';
    const { raw, hash, prefix } = generateApiKey();

    const admin = createAdminClient();
    const { error } = await admin.from(API_KEYS_TABLE).insert({
      label,
      key_hash: hash,
      key_prefix: prefix,
      is_active: true,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath('/dashboard/settings');
    return {
      ok: true,
      message: 'API key created. Copy it now — it will not be shown again.',
      rawKey: raw,
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Failed to create key.' };
  }
}

export async function revokeApiKey(formData: FormData): Promise<GenerateApiKeyResult> {
  try {
    await requireSuperAdmin();

    if (!hasAdminClient()) {
      return { ok: false, message: 'SUPABASE_SERVICE_ROLE_KEY is not configured.' };
    }

    const id = String(formData.get('id') ?? '');
    if (!id) {
      return { ok: false, message: 'Missing key id.' };
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from(API_KEYS_TABLE)
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath('/dashboard/settings');
    return { ok: true, message: 'API key revoked.' };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Failed to revoke key.' };
  }
}
