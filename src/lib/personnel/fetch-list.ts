import { unstable_cache } from 'next/cache';
import type { PersonnelScope } from '@/lib/auth/roles';
import { createAdminClient, hasAdminClient } from '@/lib/supabase/admin';
import type { PersonnelRecord } from '@/lib/personnel/types';

export const PERSONNEL_LIST_CACHE_TAG = 'personnel-list';

export type PersonnelSort = 'rank-asc' | 'rank-desc';
export type PersonnelView = 'all' | 'on-duty' | 'schooling' | 'on-leave';

export type PersonnelPageParams = {
  search: string;
  view: PersonnelView;
  sort: PersonnelSort;
  limit: number;
  offset: number;
  scope: PersonnelScope | null;
};

export type PersonnelPage = {
  records: PersonnelRecord[];
  total: number;
  error?: string;
};

type RpcPayload = {
  p_search: string;
  p_view: string;
  p_sort: string;
  p_limit: number;
  p_offset: number;
  p_office?: string | null;
  p_station?: string | null;
  p_include_sub_units?: boolean;
};

function parseRpcResult(data: unknown): PersonnelPage {
  const parsed = (typeof data === 'string' ? JSON.parse(data) : data) as {
    records?: PersonnelRecord[];
    total?: number;
  };

  return {
    records: parsed.records ?? [],
    total: parsed.total ?? 0,
  };
}

function resolveScopeFilters(scope: PersonnelScope | null): {
  office: string | null;
  station: string | null;
  includeSubUnits: boolean;
  incomplete: boolean;
} {
  if (!scope) {
    return { office: null, station: null, includeSubUnits: false, incomplete: false };
  }

  const office = scope.office.trim();
  const station = scope.station.trim();

  if (!office || !station) {
    return { office: null, station: null, includeSubUnits: false, incomplete: true };
  }

  return {
    office,
    station,
    includeSubUnits: scope.includeSubUnits,
    incomplete: false,
  };
}

async function callPersonnelRpc(payload: RpcPayload) {
  const supabase = createAdminClient();
  return supabase.rpc('list_personnel_rprmd_paged', payload);
}

async function fetchPersonnelPageFromDb(params: PersonnelPageParams): Promise<PersonnelPage> {
  if (!hasAdminClient()) {
    return {
      records: [],
      total: 0,
      error: 'SUPABASE_SERVICE_ROLE_KEY is not configured.',
    };
  }

  const { office, station, includeSubUnits, incomplete } = resolveScopeFilters(params.scope);

  if (incomplete) {
    return {
      records: [],
      total: 0,
      error: 'Your account is missing office or unit. Contact an administrator.',
    };
  }

  const basePayload: RpcPayload = {
    p_search: params.search,
    p_view: params.view,
    p_sort: params.sort,
    p_limit: params.limit,
    p_offset: params.offset,
  };

  const scopedPayload: RpcPayload = {
    ...basePayload,
    p_office: office,
    p_station: station,
    p_include_sub_units: includeSubUnits,
  };

  // Prefer the scoped RPC (sql/016). Fall back to the legacy 5-arg RPC if 016
  // has not been applied yet so the list does not silently go empty.
  let { data, error } = await callPersonnelRpc(scopedPayload);

  if (error && office === null && station === null) {
    ({ data, error } = await callPersonnelRpc(basePayload));
  }

  if (error) {
    console.error('[personnel] RPC list_personnel_rprmd_paged failed:', error.message);
    return {
      records: [],
      total: 0,
      error: `Unable to load personnel list. Run sql/018_personnel_sub_unit_scope.sql in Supabase if not yet applied. (${error.message})`,
    };
  }

  if (!data) {
    return { records: [], total: 0, error: 'No data returned from personnel query.' };
  }

  return parseRpcResult(data);
}

export async function getPersonnelPage(params: PersonnelPageParams): Promise<PersonnelPage> {
  const scopeOffice = params.scope?.office?.trim() ?? '';
  const scopeStation = params.scope?.station?.trim() ?? '';

  return unstable_cache(
    () => fetchPersonnelPageFromDb(params),
    [
      PERSONNEL_LIST_CACHE_TAG,
      params.search,
      params.view,
      params.sort,
      String(params.limit),
      String(params.offset),
      scopeOffice,
      scopeStation,
      String(params.scope?.includeSubUnits ?? false),
    ],
    {
      tags: [PERSONNEL_LIST_CACHE_TAG],
      revalidate: 60,
    }
  )();
}
