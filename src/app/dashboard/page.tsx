import { PersonnelTable } from '@/components/dashboard/personnel-table';
import { canAddPersonnel } from '@/lib/auth/roles';
import { getSessionUser } from '@/lib/auth/session';
import {
  getPersonnelPage,
  type PersonnelSort,
  type PersonnelView,
} from '@/lib/personnel/fetch-list';

const LIMIT_OPTIONS = [250, 500, 1000, 2000];
const VIEW_OPTIONS: PersonnelView[] = ['all', 'on-duty', 'schooling', 'on-leave'];
const SORT_OPTIONS: PersonnelSort[] = ['rank-asc', 'rank-desc'];

type SearchParams = Record<string, string | string[] | undefined>;

function pickString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const search = pickString(sp.q).trim();

  const viewParam = pickString(sp.view) as PersonnelView;
  const view: PersonnelView = VIEW_OPTIONS.includes(viewParam) ? viewParam : 'all';

  const sortParam = pickString(sp.sort) as PersonnelSort;
  const sort: PersonnelSort = SORT_OPTIONS.includes(sortParam) ? sortParam : 'rank-desc';

  const limitParam = Number.parseInt(pickString(sp.limit), 10);
  const limit = LIMIT_OPTIONS.includes(limitParam) ? limitParam : 250;

  const pageParam = Number.parseInt(pickString(sp.page), 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const offset = (page - 1) * limit;

  const [session, data] = await Promise.all([
    getSessionUser(),
    getPersonnelPage({ search, view, sort, limit, offset }),
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PersonnelTable
        records={data.records}
        total={data.total}
        search={search}
        view={view}
        sort={sort}
        limit={limit}
        page={page}
        canAddPersonnel={canAddPersonnel(session.user?.role)}
      />
    </div>
  );
}
