'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createManagedUser,
  resetManagedUserPassword,
  updateManagedUser,
  type ManagedUser,
  type UserActionResult,
} from '@/app/actions/users';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal } from '@/components/ui/modal';
import { ACCESS_PAGE_LABELS, type AccessPage } from '@/lib/auth/access-page';
import {
  MANAGED_ROLE_LABELS,
  canManageTargetRole,
  rolesForAccessPage,
  type AppRole,
  type ManagedRole,
} from '@/lib/auth/roles';
import {
  unitsForOffice,
  withCurrentOption,
  type PersonnelLookupOptions,
} from '@/lib/personnel/lookup-options';

type UserManagementProps = {
  users: ManagedUser[];
  assignableAccessPages: AccessPage[];
  actorRole: AppRole;
  currentUserId: string;
  lookup: PersonnelLookupOptions;
};

const TABLE_COLUMN_WIDTHS = {
  index: 3,
  rank_name: 18,
  badge_number: 8,
  office: 13,
  unit: 11,
  access: 10,
  role: 12,
  status: 8,
  actions: 11,
} as const;

function canEditUser(actorRole: AppRole, user: ManagedUser): boolean {
  if (actorRole === 'RPRMD_admin' && user.access_page !== 'RPRMD') {
    return false;
  }

  return canManageTargetRole(actorRole, user.role as AppRole);
}

function roleLabel(role: ManagedRole): string {
  return MANAGED_ROLE_LABELS[role] ?? role;
}

const tableCellClass = 'px-2 py-1.5 text-[10px] leading-tight';
const tableHeadClass = 'px-2 py-1.5 text-[9px] font-semibold leading-tight whitespace-nowrap';
const tableTruncateClass = 'truncate';
const inputClass =
  'w-full rounded-md border border-[var(--app-border)] bg-[var(--app-surface-2)] px-2.5 py-1.5 text-xs text-[var(--app-text)] outline-none focus:border-amber-500/50';
const labelClass = 'mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--app-text-muted)]';
const btnSecondary =
  'inline-flex h-8 items-center rounded-md border border-[var(--app-border)] bg-[var(--app-surface-2)] px-4 text-xs font-medium text-[var(--app-text)] transition hover:bg-[var(--app-hover)] disabled:opacity-50';
const btnPrimary =
  'inline-flex h-8 items-center rounded-md bg-amber-500 px-4 text-xs font-semibold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50';

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

function RankOfficeUnitFields({
  idPrefix,
  lookup,
  rank,
  office,
  unit,
  onRankChange,
  onOfficeChange,
  onUnitChange,
}: {
  idPrefix: string;
  lookup: PersonnelLookupOptions;
  rank: string;
  office: string;
  unit: string;
  onRankChange: (value: string) => void;
  onOfficeChange: (value: string) => void;
  onUnitChange: (value: string) => void;
}) {
  const rankOptions = useMemo(
    () => withCurrentOption(lookup.ranks, rank),
    [lookup.ranks, rank]
  );
  const officeOptions = useMemo(
    () => withCurrentOption(lookup.offices, office),
    [lookup.offices, office]
  );
  const unitOptions = useMemo(
    () => unitsForOffice(lookup, office, unit),
    [lookup, office, unit]
  );

  return (
    <>
      <div>
        <label htmlFor={`${idPrefix}-rank`} className={labelClass}>Rank</label>
        <select
          id={`${idPrefix}-rank`}
          name="rank"
          required
          value={rank}
          onChange={(event) => onRankChange(event.target.value)}
          className={inputClass}
        >
          <option value="">Select rank...</option>
          {rankOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-office`} className={labelClass}>Office</label>
        <select
          id={`${idPrefix}-office`}
          name="office"
          required
          value={office}
          onChange={(event) => onOfficeChange(event.target.value)}
          className={inputClass}
        >
          <option value="">Select office...</option>
          {officeOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-unit`} className={labelClass}>Unit</label>
        <select
          id={`${idPrefix}-unit`}
          name="unit"
          required
          value={unit}
          disabled={!office}
          onChange={(event) => onUnitChange(event.target.value)}
          className={`${inputClass} disabled:opacity-50`}
        >
          <option value="">{office ? 'Select unit...' : 'Select office first'}</option>
          {unitOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
    </>
  );
}

export function UserManagement({
  users,
  assignableAccessPages,
  actorRole,
  currentUserId,
  lookup,
}: UserManagementProps) {
  const router = useRouter();
  const createFormRef = useRef<HTMLFormElement>(null);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [createConfirmSummary, setCreateConfirmSummary] = useState<{
    name: string;
    badge: string;
    role: string;
    accessPage: string;
  } | null>(null);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [resetUser, setResetUser] = useState<ManagedUser | null>(null);
  const [createResult, setCreateResult] = useState<UserActionResult | null>(null);
  const [actionResult, setActionResult] = useState<UserActionResult | null>(null);
  const [isCreating, startCreate] = useTransition();
  const [isUpdating, startUpdate] = useTransition();

  const [addRank, setAddRank] = useState('');
  const [addOffice, setAddOffice] = useState('');
  const [addUnit, setAddUnit] = useState('');
  const [addAccessPage, setAddAccessPage] = useState<AccessPage>(assignableAccessPages[0] ?? 'RPRMD');
  const [addRole, setAddRole] = useState<ManagedRole>('stn_admin');
  const [editRank, setEditRank] = useState('');
  const [editOffice, setEditOffice] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editAccessPage, setEditAccessPage] = useState<AccessPage>('RPRMD');
  const [editRole, setEditRole] = useState<ManagedRole>('stn_admin');

  const addRoleOptions = useMemo(
    () => rolesForAccessPage(addAccessPage),
    [addAccessPage]
  );
  const editRoleOptions = useMemo(
    () => rolesForAccessPage(editAccessPage),
    [editAccessPage]
  );

  useEffect(() => {
    if (!addRoleOptions.includes(addRole)) {
      setAddRole(addRoleOptions[0] ?? 'stn_admin');
    }
  }, [addRole, addRoleOptions]);

  useEffect(() => {
    if (!editRoleOptions.includes(editRole)) {
      setEditRole(editRoleOptions[0] ?? 'stn_admin');
    }
  }, [editRole, editRoleOptions]);

  useEffect(() => {
    if (!editUser) {
      return;
    }

    setEditRank(editUser.rank ?? '');
    setEditOffice(editUser.office ?? '');
    setEditUnit(editUser.unit ?? '');
    setEditAccessPage(editUser.access_page);
    setEditRole(editUser.role);
  }, [editUser]);

  function handleAddOfficeChange(value: string) {
    setAddOffice(value);
    setAddUnit('');
  }

  function handleEditOfficeChange(value: string) {
    setEditOffice(value);
    setEditUnit('');
  }

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
        ACCESS_PAGE_LABELS[user.access_page],
        roleLabel(user.role),
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

  function closeAddModal() {
    setShowAddModal(false);
    setShowCreateConfirm(false);
    setCreateConfirmSummary(null);
    setCreateResult(null);
    setAddRank('');
    setAddOffice('');
    setAddUnit('');
    setAddAccessPage(assignableAccessPages[0] ?? 'RPRMD');
    setAddRole(rolesForAccessPage(assignableAccessPages[0] ?? 'RPRMD')[0] ?? 'stn_admin');
    createFormRef.current?.reset();
  }

  function openAddModal() {
    setCreateResult(null);
    setAddRank('');
    setAddOffice('');
    setAddUnit('');
    setAddAccessPage(assignableAccessPages[0] ?? 'RPRMD');
    setAddRole(rolesForAccessPage(assignableAccessPages[0] ?? 'RPRMD')[0] ?? 'stn_admin');
    setShowAddModal(true);
  }

  function handleAddAccessPageChange(value: AccessPage) {
    setAddAccessPage(value);
    setAddRole(rolesForAccessPage(value)[0] ?? 'stn_admin');
  }

  function handleEditAccessPageChange(value: AccessPage) {
    setEditAccessPage(value);
    setEditRole(rolesForAccessPage(value)[0] ?? 'stn_admin');
  }

  function requestCreateConfirm() {
    const form = createFormRef.current;
    if (!form?.checkValidity()) {
      form?.reportValidity();
      return;
    }

    const formData = new FormData(form);
    const roleValue = String(formData.get('role') ?? '');
    const accessPageValue = String(formData.get('access_page') ?? 'RPRMD');
    setCreateConfirmSummary({
      name: String(formData.get('full_name') ?? ''),
      badge: String(formData.get('badge_number') ?? ''),
      role: roleLabel(roleValue as ManagedRole),
      accessPage: ACCESS_PAGE_LABELS[accessPageValue as AccessPage] ?? accessPageValue,
    });
    setShowCreateConfirm(true);
  }

  function submitCreateUser() {
    const form = createFormRef.current;
    if (!form) {
      return;
    }

    const formData = new FormData(form);
    startCreate(async () => {
      const result = await createManagedUser(formData);
      setCreateResult(result);
      if (result.ok) {
        setShowCreateConfirm(false);
        closeAddModal();
        refreshList();
      } else {
        setShowCreateConfirm(false);
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

  const createPreview = showCreateConfirm ? createConfirmSummary : null;

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
          onClick={openAddModal}
          className="ml-auto inline-flex h-8 shrink-0 items-center rounded-md bg-amber-500 px-3 text-xs font-semibold text-slate-950 transition hover:bg-amber-400"
        >
          Add User
        </button>
      </div>

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
              <th className={tableHeadClass}>Access</th>
              <th className={tableHeadClass}>Role</th>
              <th className={tableHeadClass}>Status</th>
              <th className={tableHeadClass}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-2 py-8 text-center text-[10px] text-[var(--app-text-muted)]">
                  No matching users found.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user, index) => {
                const canEdit = canEditUser(actorRole, user);
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
                    <td className={`${tableCellClass} ${tableTruncateClass} text-[var(--app-text)]`} title={ACCESS_PAGE_LABELS[user.access_page]}>
                      {ACCESS_PAGE_LABELS[user.access_page]}
                    </td>
                    <td className={`${tableCellClass} ${tableTruncateClass} text-[var(--app-text)]`}>
                      {roleLabel(user.role)}
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

      {showAddModal ? (
        <Modal
          title="Add New User"
          onClose={closeAddModal}
          maxWidth="lg"
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeAddModal} disabled={isCreating} className={btnSecondary}>
                Cancel
              </button>
              <button type="button" onClick={requestCreateConfirm} disabled={isCreating} className={btnPrimary}>
                Add User
              </button>
            </div>
          }
        >
          <form ref={createFormRef} id="create-user-form" className="grid gap-3 sm:grid-cols-2">
            <RankOfficeUnitFields
              idPrefix="add"
              lookup={lookup}
              rank={addRank}
              office={addOffice}
              unit={addUnit}
              onRankChange={setAddRank}
              onOfficeChange={handleAddOfficeChange}
              onUnitChange={setAddUnit}
            />
            <div>
              <label htmlFor="full_name" className={labelClass}>Full Name</label>
              <input id="full_name" name="full_name" required className={inputClass} placeholder="Juan Dela Cruz" />
            </div>
            <div>
              <label htmlFor="badge_number" className={labelClass}>Badge Number</label>
              <input id="badge_number" name="badge_number" required className={inputClass} placeholder="226609" />
            </div>
            <div>
              <label htmlFor="password" className={labelClass}>Password</label>
              <input id="password" name="password" type="password" required minLength={6} className={inputClass} placeholder="Min. 6 characters" />
            </div>
            <div>
              <label htmlFor="access_page" className={labelClass}>Access Page</label>
              <select
                id="access_page"
                name="access_page"
                required
                value={addAccessPage}
                onChange={(event) => handleAddAccessPageChange(event.target.value as AccessPage)}
                className={inputClass}
              >
                {assignableAccessPages.map((page) => (
                  <option key={page} value={page}>{ACCESS_PAGE_LABELS[page]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="role" className={labelClass}>Role</label>
              <select id="role" name="role" required value={addRole} onChange={(event) => setAddRole(event.target.value as ManagedRole)} className={inputClass}>
                {addRoleOptions.map((role) => (
                  <option key={role} value={role}>{roleLabel(role)}</option>
                ))}
              </select>
            </div>
          </form>
          {lookup.offices.length === 0 ? (
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-200">
              Office and unit lists are empty. Import personnel data first, or run{' '}
              <code className="font-mono">sql/015_personnel_lookup_options.sql</code> in Supabase.
            </p>
          ) : null}
          {createResult && !createResult.ok ? (
            <div className="mt-3">
              <ActionMessage result={createResult} />
            </div>
          ) : null}
        </Modal>
      ) : null}

      {showCreateConfirm ? (
        <ConfirmDialog
          title="Create User Account?"
          message={`Are you sure you want to create an account for ${createPreview?.name || 'this user'} (Badge ${createPreview?.badge || '—'}) with access ${createPreview?.accessPage || '—'} and role ${createPreview?.role || '—'}?`}
          confirmLabel="Yes, Add User"
          cancelLabel="Cancel"
          onConfirm={submitCreateUser}
          onCancel={() => setShowCreateConfirm(false)}
          isPending={isCreating}
        />
      ) : null}

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
              <RankOfficeUnitFields
                idPrefix="edit"
                lookup={lookup}
                rank={editRank}
                office={editOffice}
                unit={editUnit}
                onRankChange={setEditRank}
                onOfficeChange={handleEditOfficeChange}
                onUnitChange={setEditUnit}
              />
              <div className="sm:col-span-2">
                <label htmlFor="edit-full_name" className={labelClass}>Full Name</label>
                <input id="edit-full_name" name="full_name" defaultValue={editUser.full_name} required className={inputClass} />
              </div>
              <div>
                <label htmlFor="edit-access_page" className={labelClass}>Access Page</label>
                <select
                  id="edit-access_page"
                  name="access_page"
                  value={editAccessPage}
                  disabled={editUser.id === currentUserId}
                  onChange={(event) => handleEditAccessPageChange(event.target.value as AccessPage)}
                  className={inputClass}
                >
                  {assignableAccessPages.map((page) => (
                    <option key={page} value={page}>{ACCESS_PAGE_LABELS[page]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="edit-role" className={labelClass}>Role</label>
                <select
                  id="edit-role"
                  name="role"
                  value={editRole}
                  disabled={editUser.id === currentUserId}
                  onChange={(event) => setEditRole(event.target.value as ManagedRole)}
                  className={inputClass}
                >
                  {(editUser.id === currentUserId ? [editUser.role] : editRoleOptions).map((role) => (
                    <option key={role} value={role}>{roleLabel(role)}</option>
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
            <button type="submit" disabled={isUpdating} className={btnPrimary}>
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
            <button type="submit" disabled={isUpdating} className={btnPrimary}>
              {isUpdating ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
