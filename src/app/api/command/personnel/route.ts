import { NextResponse } from 'next/server';
import { CORS_HEADERS, verifyCommandRequest } from '@/lib/api/command';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  const authorized = await verifyCommandRequest(request);
  if (!authorized) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number.parseInt(url.searchParams.get('limit') ?? '500', 10) || 500, 1), 5000);
  const offset = Math.max(Number.parseInt(url.searchParams.get('offset') ?? '0', 10) || 0, 0);
  const search = url.searchParams.get('search') ?? '';

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('list_personnel_rprmd_paged', {
    p_search: search,
    p_view: 'all',
    p_sort: 'rank-desc',
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  const parsed = (typeof data === 'string' ? JSON.parse(data) : data) as {
    records?: unknown[];
    total?: number;
  } | null;

  return NextResponse.json(
    {
      ok: true,
      total: parsed?.total ?? 0,
      count: parsed?.records?.length ?? 0,
      limit,
      offset,
      records: parsed?.records ?? [],
    },
    { status: 200, headers: CORS_HEADERS }
  );
}
