import { createHash, randomBytes } from 'crypto';
import { createAdminClient, hasAdminClient } from '@/lib/supabase/admin';

export const API_KEYS_TABLE = 'api_keys';

/** Origin allowed to call the command API from a browser context. */
export const COMMAND_ORIGIN = 'https://command.pro4a-1key.com';

export const KEY_PREFIX = 'pk_';

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey.trim()).digest('hex');
}

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = `${KEY_PREFIX}${randomBytes(24).toString('hex')}`;
  return {
    raw,
    hash: hashApiKey(raw),
    prefix: raw.slice(0, 10),
  };
}

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': COMMAND_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, x-api-key, Content-Type',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
};

function extractKey(request: Request): string | null {
  const auth = request.headers.get('authorization');
  if (auth?.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }

  const headerKey = request.headers.get('x-api-key');
  if (headerKey) {
    return headerKey.trim();
  }

  return null;
}

/**
 * Validates the API key from the request against active keys.
 * Returns true when authorized. Touches last_used_at on success.
 */
export async function verifyCommandRequest(request: Request): Promise<boolean> {
  if (!hasAdminClient()) {
    return false;
  }

  const provided = extractKey(request);
  if (!provided) {
    return false;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from(API_KEYS_TABLE)
    .select('id')
    .eq('key_hash', hashApiKey(provided))
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  // Best-effort usage timestamp; ignore failures.
  await admin
    .from(API_KEYS_TABLE)
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id);

  return true;
}
