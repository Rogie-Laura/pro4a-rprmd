import { PersonnelTable } from '@/components/dashboard/personnel-table';
import { canAddPersonnel } from '@/lib/auth/roles';
import { requireRprmdAccess } from '@/lib/auth/session';
import type { PersonnelRecord } from '@/lib/personnel/types';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const session = await requireRprmdAccess();
  const supabase = await createClient();

  const { data } = await supabase.rpc('list_personnel_rprmd');

  let records: PersonnelRecord[] = [];
  if (data) {
    records = (typeof data === 'string' ? JSON.parse(data) : data) as PersonnelRecord[];
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PersonnelTable
        records={records}
        canAddPersonnel={canAddPersonnel(session.user?.role)}
      />
    </div>
  );
}
