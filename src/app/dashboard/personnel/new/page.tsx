import Link from 'next/link';
import { requireAddPersonnelAccess } from '@/lib/auth/session';

export default async function AddPersonnelPage() {
  await requireAddPersonnelAccess();

  return (
    <div className="flex h-full min-h-[400px] flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--app-text)]">Add New Personnel</h2>
          <p className="text-sm text-[var(--app-text-muted)]">Personnel entry form coming soon.</p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex h-8 items-center rounded-md border border-[var(--app-border)] px-3 text-xs text-[var(--app-text)] transition hover:bg-[var(--app-hover)]"
        >
          Back to Personnel List
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface-2)] p-10 text-center text-[var(--app-text-muted)]">
        The add personnel form will be available here.
      </div>
    </div>
  );
}
