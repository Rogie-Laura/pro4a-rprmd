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

      <div className="max-w-3xl">
        <PersonnelUpload hasServiceRole={hasAdminClient()} />
      </div>
    </div>
  );
}
