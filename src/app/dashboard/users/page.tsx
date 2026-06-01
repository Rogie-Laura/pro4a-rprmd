import { UserManagement } from '@/components/user-management';
import { getAssignableRolesForActor, listManagedUsers } from '@/app/actions/users';
import { requireUserManagementAccess } from '@/lib/auth/session';
import { getPersonnelLookupOptions } from '@/lib/personnel/lookup-options';

export default async function UsersPage() {
  const session = await requireUserManagementAccess();
  const [users, assignableRoles, lookup] = await Promise.all([
    listManagedUsers(),
    getAssignableRolesForActor(),
    getPersonnelLookupOptions(),
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 shrink-0">
        <h2 className="text-lg font-semibold text-[var(--app-text)]">User Management</h2>
        <p className="text-sm text-[var(--app-text-muted)]">
          Manage login accounts — badge number + password.
        </p>
      </div>

      <UserManagement
        users={users}
        assignableRoles={assignableRoles}
        actorRole={session.user!.role}
        currentUserId={session.userId}
        lookup={lookup}
      />
    </div>
  );
}
