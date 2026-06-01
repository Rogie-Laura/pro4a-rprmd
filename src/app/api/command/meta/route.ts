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

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('command_meta');

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  const meta = typeof data === 'string' ? JSON.parse(data) : data;

  return NextResponse.json({ ok: true, ...meta }, { status: 200, headers: CORS_HEADERS });
}
