'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { compareByRank } from '@/lib/personnel/rank-order';
import type { PersonnelRecord } from '@/lib/personnel/types';

type PersonnelTableProps = {
  records: PersonnelRecord[];
  canAddPersonnel?: boolean;
};

type SortOption = 'rank-asc' | 'rank-desc';
type ViewOption = 'all' | 'on-duty' | 'schooling' | 'on-leave';
type LimitOption = 250 | 500 | 1000 | 2000;

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'rank-asc', label: 'Lowest Rank → Highest Rank' },
  { value: 'rank-desc', label: 'Highest Rank → Lowest Rank' },
];

const VIEW_OPTIONS: { value: ViewOption; label: string }[] = [
  { value: 'all', label: 'View All' },
  { value: 'on-duty', label: 'On Duty' },
  { value: 'schooling', label: 'Schooling' },
  { value: 'on-leave', label: 'On Leave' },
];

const LIMIT_OPTIONS: LimitOption[] = [250, 500, 1000, 2000];

/** Adjust column widths here — percentages must total 100 */
const TABLE_COLUMN_WIDTHS = {
  index: 3,
  rank_name: 22,
  badge_number: 7,
  office: 19,
  station: 15,
  designation: 12,
  status: 11,
  disposition: 11,
} as const;

type TableColumnKey = keyof typeof TABLE_COLUMN_WIDTHS;

const TABLE_COLUMNS: { key: TableColumnKey; label: string }[] = [
  { key: 'index', label: '#' },
  { key: 'rank_name', label: 'Rank/Name' },
  { key: 'badge_number', label: 'Badge #' },
  { key: 'office', label: 'Office' },
  { key: 'station', label: 'Unit' },
  { key: 'designation', label: 'Designation' },
  { key: 'status', label: 'Status' },
  { key: 'disposition', label: 'Disposition' },
];

const tableCellClass = 'px-2 py-1 text-[10px] leading-tight';
const tableHeadClass = 'px-2 py-1.5 text-[9px] font-semibold leading-tight whitespace-nowrap';
const tableTruncateClass = 'truncate';

function cell(value: string | null | undefined) {
  return value && value.trim() !== '' ? value : '—';
}

function getStatusBadgeClass(status: string | null | undefined): string {
  const base = 'inline-block max-w-full truncate rounded-full px-1.5 py-px text-[9px] leading-tight';
  const normalized = (status ?? '').trim().toLowerCase();

  if (normalized === 'active') {
    return `${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300`;
  }

  if (normalized === 'admin holdings' || normalized.includes('admin holding')) {
    return `${base} bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300`;
  }

  return `${base} bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300`;
}

function matchesSearch(record: PersonnelRecord, query: string): boolean {
  if (!query) {
    return true;
  }

  const haystack = [
    record.badge_number,
    record.rank,
    record.rank_name,
    record.fname,
    record.mname,
    record.lname,
    record.qual,
    record.designation,
    record.office,
    record.station,
    record.remarks,
    record.email,
    record.phone_number,
    `${record.fname} ${record.mname ?? ''} ${record.lname}`.replace(/\s+/g, ' ').trim(),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

function matchesView(record: PersonnelRecord, view: ViewOption): boolean {
  if (view === 'all') {
    return true;
  }

  const status = (record.status ?? '').toLowerCase();
  const disposition = (record.disposition ?? '').toLowerCase();
  const combined = `${status} ${disposition}`;

  if (view === 'on-duty') {
    return combined.includes('on duty') || status === 'active';
  }

  if (view === 'schooling') {
    return combined.includes('schooling') || combined.includes('school');
  }

  if (view === 'on-leave') {
    return combined.includes('on leave') || combined.includes('leave');
  }

  return true;
}

const labelClass = 'shrink-0 text-xs font-medium text-[var(--app-text-muted)]';
const controlClass =
  'h-8 w-52 rounded-md border border-[var(--app-border)] bg-[var(--app-surface-2)] px-2.5 text-xs text-[var(--app-text)] outline-none focus:border-amber-500/50';
const viewControlClass =
  'h-8 w-32 rounded-md border border-[var(--app-border)] bg-[var(--app-surface-2)] px-2 text-xs text-[var(--app-text)] outline-none focus:border-amber-500/50';
const limitControlClass =
  'h-8 w-20 rounded-md border border-[var(--app-border)] bg-[var(--app-surface-2)] px-2 text-xs text-[var(--app-text)] outline-none focus:border-amber-500/50';
const navButtonClass =
  'inline-flex h-8 min-w-7 items-center justify-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface-2)] px-1.5 text-xs font-medium text-[var(--app-text)] transition hover:bg-[var(--app-hover)] disabled:pointer-events-none disabled:opacity-40';

function ToolbarField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <span className={labelClass}>{label}</span>
      {children}
    </div>
  );
}

function PageNavButton({
  symbol,
  ariaLabel,
  onClick,
  disabled,
}: {
  symbol: string;
  ariaLabel: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={navButtonClass}
      aria-label={ariaLabel}
    >
      {symbol}
    </button>
  );
}

export function PersonnelTable({ records, canAddPersonnel = false }: PersonnelTableProps) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('rank-desc');
  const [view, setView] = useState<ViewOption>('all');
  const [limit, setLimit] = useState<LimitOption>(250);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search, sort, view, limit]);

  const allFilteredRecords = useMemo(() => {
    const query = search.trim();

    const filtered = records.filter(
      (record) => matchesSearch(record, query) && matchesView(record, view)
    );

    const direction = sort === 'rank-asc' ? 'asc' : 'desc';
    filtered.sort((a, b) => compareByRank(a, b, direction));

    return filtered;
  }, [records, search, sort, view]);

  const totalPages = Math.max(1, Math.ceil(allFilteredRecords.length / limit));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== currentPage) {
      setPage(currentPage);
    }
  }, [page, currentPage]);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return allFilteredRecords.slice(start, start + limit);
  }, [allFilteredRecords, currentPage, limit]);

  const rowOffset = (currentPage - 1) * limit;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
        <ToolbarField label="Search:">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Badge or name..."
            className={controlClass}
          />
        </ToolbarField>

        <ToolbarField label="Sort:">
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortOption)}
            className={controlClass}
            aria-label="Sort personnel"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </ToolbarField>

        <ToolbarField label="View:">
          <select
            value={view}
            onChange={(event) => setView(event.target.value as ViewOption)}
            className={viewControlClass}
            aria-label="View filter"
          >
            {VIEW_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </ToolbarField>

        <ToolbarField label="Limit:">
          <select
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value) as LimitOption)}
            className={limitControlClass}
            aria-label="Rows per page"
          >
            {LIMIT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </ToolbarField>

        <div className="flex items-center gap-1.5">
          <PageNavButton
            symbol="<"
            ariaLabel="First page"
            onClick={() => setPage(1)}
            disabled={currentPage <= 1}
          />
          <PageNavButton
            symbol="<<"
            ariaLabel="Previous page"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={currentPage <= 1}
          />
          <span className="min-w-[5.5rem] px-1.5 text-center text-xs text-[var(--app-text-muted)]">
            {currentPage} out of {totalPages}
          </span>
          <PageNavButton
            symbol=">>"
            ariaLabel="Next page"
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={currentPage >= totalPages}
          />
          <PageNavButton
            symbol=">"
            ariaLabel="Last page"
            onClick={() => setPage(totalPages)}
            disabled={currentPage >= totalPages}
          />

          {canAddPersonnel ? (
            <Link
              href="/dashboard/personnel/new"
              className="ml-1 inline-flex h-8 shrink-0 items-center rounded-md bg-amber-500 px-3 text-xs font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              Add New Personnel
            </Link>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-2)]">
        <table className="w-full table-fixed border-collapse text-left">
          <colgroup>
            {TABLE_COLUMNS.map((column) => (
              <col key={column.key} style={{ width: `${TABLE_COLUMN_WIDTHS[column.key]}%` }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10 bg-[var(--app-table-header)]">
            <tr className="border-b border-[var(--app-border)] uppercase tracking-wide text-[var(--app-text-muted)]">
              {TABLE_COLUMNS.map((column) => (
                <th key={column.key} className={tableHeadClass}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRecords.length === 0 ? (
              <tr>
                <td
                  colSpan={TABLE_COLUMNS.length}
                  className="px-2 py-8 text-center text-[10px] text-[var(--app-text-muted)]"
                >
                  No matching personnel records.
                </td>
              </tr>
            ) : (
              paginatedRecords.map((record, index) => (
                <tr
                  key={record.id}
                  className="border-b border-[var(--app-border)]/80 transition hover:bg-[var(--app-hover)]"
                >
                  <td className={`${tableCellClass} text-[var(--app-text-muted)]`}>
                    {rowOffset + index + 1}
                  </td>
                  <td
                    className={`${tableCellClass} ${tableTruncateClass} font-medium text-amber-700 dark:text-amber-100`}
                    title={record.rank_name ?? undefined}
                  >
                    {cell(record.rank_name)}
                  </td>
                  <td
                    className={`${tableCellClass} ${tableTruncateClass} text-left text-[var(--app-text)]`}
                    title={record.badge_number ?? undefined}
                  >
                    {cell(record.badge_number)}
                  </td>
                  <td
                    className={`${tableCellClass} ${tableTruncateClass} text-[var(--app-text)]`}
                    title={record.office ?? undefined}
                  >
                    {cell(record.office)}
                  </td>
                  <td
                    className={`${tableCellClass} ${tableTruncateClass} text-[var(--app-text)]`}
                    title={record.station ?? undefined}
                  >
                    {cell(record.station)}
                  </td>
                  <td
                    className={`${tableCellClass} ${tableTruncateClass} text-[var(--app-text)]`}
                    title={record.designation ?? undefined}
                  >
                    {cell(record.designation)}
                  </td>
                  <td className={tableCellClass}>
                    <span className={getStatusBadgeClass(record.status)}>
                      {cell(record.status)}
                    </span>
                  </td>
                  <td
                    className={`${tableCellClass} ${tableTruncateClass} text-[var(--app-text)]`}
                    title={record.disposition ?? undefined}
                  >
                    {cell(record.disposition)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
