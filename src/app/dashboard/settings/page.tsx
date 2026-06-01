import Link from 'next/link';
import { PersonnelUpload } from '@/components/dashboard/personnel-upload';
import { requireSystemSettingsAccess } from '@/lib/auth/session';
import { hasAdminClient } from '@/lib/supabase/admin';

export default async function SystemSettingsPage() {
  await requireSystemSettingsAccess();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[var(--app-text)]">System Settings</h2>
        <p className="text-sm text-[var(--app-text-muted)]">
          Super Admin tools for managing RPRMD system data.
        </p>
      </div>

      <div className="max-w-6xl space-y-4">
        <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--app-text)]">User Management</h3>
              <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                Create, edit, and reset passwords for login accounts.
              </p>
            </div>
            <Link
              href="/dashboard/users"
              className="inline-flex h-8 shrink-0 items-center rounded-md bg-amber-500 px-4 text-xs font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              Manage Users
            </Link>
          </div>
        </div>

        <PersonnelUpload hasServiceRole={hasAdminClient()} />
      </div>
    </div>
  );
}
