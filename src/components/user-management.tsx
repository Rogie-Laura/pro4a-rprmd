'use client';

import { useMemo, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  createManagedUser,
  resetManagedUserPassword,
  updateManagedUser,
  type ManagedUser,
  type UserActionResult,
} from '@/app/actions/users';
import { ROLE_LABELS, canManageTargetRole, type AppRole } from '@/lib/auth/roles';

type UserManagementProps = {
  users: ManagedUser[];
  assignableRoles: AppRole[];
  actorRole: AppRole;
  currentUserId: string;
};

const TABLE_COLUMN_WIDTHS = {
  index: 4,
  rank_name: 22,
  badge_number: 9,
  office: 16,
  unit: 14,
  role: 14,
  status: 9,
  actions: 12,
} as const;

const tableCellClass = 'px-2 py-1.5 text-[10px] leading-tight';
const tableHeadClass = 'px-2 py-1.5 text-[9px] font-semibold leading-tight whitespace-nowrap';
const tableTruncateClass = 'truncate';
const inputClass =
  'w-full rounded-md border border-[var(--app-border)] bg-[var(--app-surface-2)] px-2.5 py-1.5 text-xs text-[var(--app-text)] outline-none focus:border-amber-500/50';
const labelClass = 'mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--app-text-muted)]';

function cell(value: string | null | undefined) {
  return value && value.trim() !== '' ? value : '—';
}

function ActionMessage({ result }: { result: UserActionResult | null }) {
  if (!result) {
    return null;
  }

  return (
    <div
      className={`rounded-lg px-3 py-2 text-xs ${
        result.ok
          ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
          : 'border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
      }`}
    >
      {result.message}
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  const base = 'inline-block rounded-full px-1.5 py-px text-[9px] leading-tight';
  return active ? (
    <span className={`${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300`}>
      Active
    </span>
  ) : (
    <span className={`${base} bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400`}>
      Inactive
    </span>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-popover)] p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-[var(--app-text)]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs text-[var(--app-text-muted)] transition hover:bg-[var(--app-hover)] hover:text-[var(--app-text)]"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function UserManagement({ users, assignableRoles, actorRole, currentUserId }: UserManagementProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [resetUser, setResetUser] = useState<ManagedUser | null>(null);
  const [createResult, setCreateResult] = useState<UserActionResult | null>(null);
  const [actionResult, setActionResult] = useState<UserActionResult | null>(null);
  const [isCreating, startCreate] = useTransition();
  const [isUpdating, startUpdate] = useTransition();

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return users;
    }

    return users.filter((user) => {
      const haystack = [
        user.badge_number,
        user.full_name,
        user.rank_fullname,
        user.rank,
        user.office,
        user.unit,
        ROLE_LABELS[user.role],
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [users, search]);

  function refreshList() {
    router.refresh();
  }

  function handleCreate(formData: FormData) {
    startCreate(async () => {
      const result = await createManagedUser(formData);
      setCreateResult(result);
      if (result.ok) {
        setShowAddForm(false);
        (document.getElementById('create-user-form') as HTMLFormElement | null)?.reset();
        refreshList();
      }
    });
  }

  function handleUpdate(formData: FormData) {
    if (!editUser) {
      return;
    }

    formData.set('user_id', editUser.id);
    startUpdate(async () => {
      const result = await updateManagedUser(formData);
      setActionResult(result);
      if (result.ok) {
        setEditUser(null);
        refreshList();
      }
    });
  }

  function handleResetPassword(formData: FormData) {
    if (!resetUser) {
      return;
    }

    formData.set('user_id', resetUser.id);
    startUpdate(async () => {
      const result = await resetManagedUserPassword(formData);
      setActionResult(result);
      if (result.ok) {
        setResetUser(null);
      }
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[var(--app-text-muted)]">Search:</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Badge, name, role..."
            className="h-8 w-52 rounded-md border border-[var(--app-border)] bg-[var(--app-surface-2)] px-2.5 text-xs text-[var(--app-text)] outline-none focus:border-amber-500/50"
          />
        </div>

        <span className="text-xs text-[var(--app-text-muted)]">
          {filteredUsers.length} of {users.length} user(s)
        </span>

        <button
          type="button"
          onClick={() => {
            setShowAddForm((value) => !value);
            setCreateResult(null);
          }}
          className="ml-auto inline-flex h-8 shrink-0 items-center rounded-md bg-amber-500 px-3 text-xs font-semibold text-slate-950 transition hover:bg-amber-400"
        >
          {showAddForm ? 'Cancel' : 'Add User'}
        </button>
      </div>

      {showAddForm ? (
        <div className="mb-3 shrink-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
          <h3 className="mb-3 text-sm font-semibold text-[var(--app-text)]">New User Account</h3>
          <form id="create-user-form" action={handleCreate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="rank" className={labelClass}>Rank</label>
              <input id="rank" name="rank" className={inputClass} placeholder="PSSg" />
            </div>
            <div>
              <label htmlFor="full_name" className={labelClass}>Full Name</label>
              <input id="full_name" name="full_name" required className={inputClass} placeholder="Juan Dela Cruz" />
            </div>
            <div>
              <label htmlFor="badge_number" className={labelClass}>Badge Number</label>
              <input id="badge_number" name="badge_number" required className={inputClass} placeholder="226609" />
            </div>
            <div>
              <label htmlFor="office" className={labelClass}>Office</label>
              <input id="office" name="office" className={inputClass} placeholder="PRO4A" />
            </div>
            <div>
              <label htmlFor="unit" className={labelClass}>Unit</label>
              <input id="unit" name="unit" className={inputClass} placeholder="RPRMD" />
            </div>
            <div>
              <label htmlFor="password" className={labelClass}>Password</label>
              <input id="password" name="password" type="password" required minLength={6} className={inputClass} placeholder="Min. 6 characters" />
            </div>
            <div>
              <label htmlFor="role" className={labelClass}>Role</label>
              <select id="role" name="role" required defaultValue={assignableRoles[assignableRoles.length - 1]} className={inputClass}>
                {assignableRoles.map((role) => (
                  <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end sm:col-span-2 lg:col-span-3">
              <button
                type="submit"
                disabled={isCreating}
                className="inline-flex h-8 items-center rounded-md bg-amber-500 px-4 text-xs font-semibold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
          <div className="mt-3">
            <ActionMessage result={createResult} />
          </div>
        </div>
      ) : null}

      {actionResult ? (
        <div className="mb-3 shrink-0">
          <ActionMessage result={actionResult} />
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-2)]">
        <table className="w-full table-fixed border-collapse text-left">
          <colgroup>
            {Object.entries(TABLE_COLUMN_WIDTHS).map(([key, width]) => (
              <col key={key} style={{ width: `${width}%` }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10 bg-[var(--app-table-header)]">
            <tr className="border-b border-[var(--app-border)] uppercase tracking-wide text-[var(--app-text-muted)]">
              <th className={tableHeadClass}>#</th>
              <th className={tableHeadClass}>Rank/Name</th>
              <th className={tableHeadClass}>Badge #</th>
              <th className={tableHeadClass}>Office</th>
              <th className={tableHeadClass}>Unit</th>
              <th className={tableHeadClass}>Role</th>
              <th className={tableHeadClass}>Status</th>
              <th className={tableHeadClass}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-2 py-8 text-center text-[10px] text-[var(--app-text-muted)]">
                  No matching users found.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user, index) => {
                const canEdit = canManageTargetRole(actorRole, user.role);
                const isSelf = user.id === currentUserId;

                return (
                  <tr
                    key={user.id}
                    className="border-b border-[var(--app-border)]/80 transition hover:bg-[var(--app-hover)]"
                  >
                    <td className={`${tableCellClass} text-[var(--app-text-muted)]`}>{index + 1}</td>
                    <td
                      className={`${tableCellClass} ${tableTruncateClass} font-medium text-amber-700 dark:text-amber-100`}
                      title={user.rank_fullname ?? user.full_name}
                    >
                      {cell(user.rank_fullname ?? user.full_name)}
                    </td>
                    <td className={`${tableCellClass} ${tableTruncateClass} text-[var(--app-text)]`} title={user.badge_number}>
                      {cell(user.badge_number)}
                    </td>
                    <td className={`${tableCellClass} ${tableTruncateClass} text-[var(--app-text)]`} title={user.office ?? undefined}>
                      {cell(user.office)}
                    </td>
                    <td className={`${tableCellClass} ${tableTruncateClass} text-[var(--app-text)]`} title={user.unit ?? undefined}>
                      {cell(user.unit)}
                    </td>
                    <td className={`${tableCellClass} ${tableTruncateClass} text-[var(--app-text)]`}>
                      {ROLE_LABELS[user.role]}
                    </td>
                    <td className={tableCellClass}>
                      <StatusBadge active={user.is_active} />
                    </td>
                    <td className={tableCellClass}>
                      {canEdit ? (
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditUser(user);
                              setActionResult(null);
                            }}
                            className="rounded border border-[var(--app-border)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--app-text)] transition hover:bg-[var(--app-hover)]"
                          >
                            Edit
                          </button>
                          {!isSelf ? (
                            <button
                              type="button"
                              onClick={() => {
                                setResetUser(user);
                                setActionResult(null);
                              }}
                              className="rounded border border-[var(--app-border)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--app-text-muted)] transition hover:bg-[var(--app-hover)]"
                            >
                              Reset PW
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-[9px] text-[var(--app-text-muted)]">View only</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {editUser ? (
        <Modal title="Edit User" onClose={() => setEditUser(null)}>
          <form action={handleUpdate} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Badge Number</label>
                <p className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface-2)] px-2.5 py-1.5 text-xs text-[var(--app-text-muted)]">
                  {editUser.badge_number}
                </p>
              </div>
              <div>
                <label htmlFor="edit-rank" className={labelClass}>Rank</label>
                <input id="edit-rank" name="rank" defaultValue={editUser.rank ?? ''} className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="edit-full_name" className={labelClass}>Full Name</label>
                <input id="edit-full_name" name="full_name" defaultValue={editUser.full_name} required className={inputClass} />
              </div>
              <div>
                <label htmlFor="edit-office" className={labelClass}>Office</label>
                <input id="edit-office" name="office" defaultValue={editUser.office ?? ''} className={inputClass} />
              </div>
              <div>
                <label htmlFor="edit-unit" className={labelClass}>Unit</label>
                <input id="edit-unit" name="unit" defaultValue={editUser.unit ?? ''} className={inputClass} />
              </div>
              <div>
                <label htmlFor="edit-role" className={labelClass}>Role</label>
                <select
                  id="edit-role"
                  name="role"
                  defaultValue={editUser.role}
                  disabled={editUser.id === currentUserId}
                  className={inputClass}
                >
                  {(editUser.id === currentUserId ? [editUser.role] : assignableRoles).map((role) => (
                    <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="edit-is_active" className={labelClass}>Status</label>
                <select
                  id="edit-is_active"
                  name="is_active"
                  defaultValue={editUser.is_active ? 'true' : 'false'}
                  disabled={editUser.id === currentUserId}
                  className={inputClass}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={isUpdating}
              className="inline-flex h-8 items-center rounded-md bg-amber-500 px-4 text-xs font-semibold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </Modal>
      ) : null}

      {resetUser ? (
        <Modal title={`Reset Password — ${resetUser.badge_number}`} onClose={() => setResetUser(null)}>
          <form action={handleResetPassword} className="space-y-3">
            <div>
              <label htmlFor="reset-password" className={labelClass}>New Password</label>
              <input
                id="reset-password"
                name="password"
                type="password"
                required
                minLength={6}
                className={inputClass}
                placeholder="Minimum 6 characters"
              />
            </div>
            <button
              type="submit"
              disabled={isUpdating}
              className="inline-flex h-8 items-center rounded-md bg-amber-500 px-4 text-xs font-semibold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
            >
              {isUpdating ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
