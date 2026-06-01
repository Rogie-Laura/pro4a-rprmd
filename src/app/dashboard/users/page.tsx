import { UserManagement } from '@/components/user-management';
import { getAssignableRolesForActor, listManagedUsers } from '@/app/actions/users';
import { requireUserManagementAccess } from '@/lib/auth/session';

export default async function UsersPage() {
  const session = await requireUserManagementAccess();
  const [users, assignableRoles] = await Promise.all([
    listManagedUsers(),
    getAssignableRolesForActor(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">User Management</h2>
        <p className="text-sm text-slate-400">Manage login accounts in the users table.</p>
      </div>

      <UserManagement
        users={users}
        assignableRoles={assignableRoles}
        actorRole={session.user!.role}
        currentUserId={session.userId}
      />
    </div>
  );
}
