import { unstable_cache } from 'next/cache';
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
};

export type PersonnelPage = {
  records: PersonnelRecord[];
  total: number;
};

async function fetchPersonnelPageFromDb(params: PersonnelPageParams): Promise<PersonnelPage> {
  // Data RPCs are server-only (revoked from anon); use the service-role client.
  if (!hasAdminClient()) {
    return { records: [], total: 0 };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('list_personnel_rprmd_paged', {
    p_search: params.search,
    p_view: params.view,
    p_sort: params.sort,
    p_limit: params.limit,
    p_offset: params.offset,
  });

  if (error || !data) {
    return { records: [], total: 0 };
  }

  const parsed = (typeof data === 'string' ? JSON.parse(data) : data) as {
    records?: PersonnelRecord[];
    total?: number;
  };

  return {
    records: parsed.records ?? [],
    total: parsed.total ?? 0,
  };
}

// Arguments are part of the cache key, so each distinct page/search/sort is cached
// independently for a short window and invalidated on import via the shared tag.
export const getPersonnelPage = unstable_cache(
  fetchPersonnelPageFromDb,
  [PERSONNEL_LIST_CACHE_TAG, 'page'],
  {
    tags: [PERSONNEL_LIST_CACHE_TAG],
    revalidate: 60,
  }
);
