'use client';

import { useState, useTransition } from 'react';
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

function ActionMessage({ result }: { result: UserActionResult | null }) {
  if (!result) {
    return null;
  }

  return (
    <div
      className={`rounded-xl border px-3 py-2 text-sm ${
        result.ok
          ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200'
          : 'border-red-500/40 bg-red-950/40 text-red-200'
      }`}
    >
      {result.message}
    </div>
  );
}

export function UserManagement({ users, assignableRoles, actorRole, currentUserId }: UserManagementProps) {
  const [createResult, setCreateResult] = useState<UserActionResult | null>(null);
  const [actionResult, setActionResult] = useState<UserActionResult | null>(null);
  const [isCreating, startCreate] = useTransition();
  const [isUpdating, startUpdate] = useTransition();
  const [resetUserId, setResetUserId] = useState<string | null>(null);

  function handleCreate(formData: FormData) {
    startCreate(async () => {
      const result = await createManagedUser(formData);
      setCreateResult(result);
      if (result.ok) {
        (document.getElementById('create-user-form') as HTMLFormElement | null)?.reset();
      }
    });
  }

  function handleUpdate(userId: string, formData: FormData) {
    formData.set('user_id', userId);
    startUpdate(async () => {
      const result = await updateManagedUser(formData);
      setActionResult(result);
    });
  }

  function handleResetPassword(userId: string, formData: FormData) {
    formData.set('user_id', userId);
    startUpdate(async () => {
      const result = await resetManagedUserPassword(formData);
      setActionResult(result);
      if (result.ok) {
        setResetUserId(null);
      }
    });
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-lg font-semibold">Add User</h2>
        <p className="mt-1 text-sm text-slate-400">
          Create accounts in the users table. Login uses badge number + password.
        </p>

        <form id="create-user-form" action={handleCreate} className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="rank" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Rank
            </label>
            <input
              id="rank"
              name="rank"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/30"
              placeholder="PSSg"
            />
          </div>

          <div>
            <label htmlFor="full_name" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Full Name
            </label>
            <input
              id="full_name"
              name="full_name"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/30"
              placeholder="Juan Dela Cruz"
            />
          </div>

          <div>
            <label htmlFor="badge_number" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Badge Number
            </label>
            <input
              id="badge_number"
              name="badge_number"
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm tracking-wide text-white outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/30"
              placeholder="226609"
            />
          </div>

          <div>
            <label htmlFor="office" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Office
            </label>
            <input
              id="office"
              name="office"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/30"
              placeholder="PRO4A"
            />
          </div>

          <div>
            <label htmlFor="unit" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Unit
            </label>
            <input
              id="unit"
              name="unit"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/30"
              placeholder="RPRMD"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/30"
              placeholder="Minimum 6 characters"
            />
          </div>

          <div>
            <label htmlFor="role" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Role
            </label>
            <select
              id="role"
              name="role"
              required
              defaultValue={assignableRoles[assignableRoles.length - 1]}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/30"
            >
              {assignableRoles.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 space-y-3">
            <ActionMessage result={createResult} />
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-60"
            >
              {isCreating ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Users</h2>
            <p className="mt-1 text-sm text-slate-400">{users.length} account(s)</p>
          </div>
        </div>

        <ActionMessage result={actionResult} />

        <div className="mt-5 space-y-4">
          {users.length === 0 ? (
            <p className="text-sm text-slate-400">No users yet.</p>
          ) : (
            users.map((user) => {
              const canEdit = canManageTargetRole(actorRole, user.role);
              const roleOptions = canEdit ? assignableRoles : [user.role];

              return (
                <div key={user.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <form action={(formData) => handleUpdate(user.id, formData)} className="grid gap-4 md:grid-cols-3">
                    <input type="hidden" name="user_id" value={user.id} />

                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Badge</p>
                      <p className="mt-1 font-semibold tracking-wide">{user.badge_number}</p>
                      <p className="mt-1 text-xs text-slate-500">{user.rank_fullname}</p>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Rank</label>
                      <input
                        name="rank"
                        defaultValue={user.rank ?? ''}
                        disabled={!canEdit}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/60 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Full Name</label>
                      <input
                        name="full_name"
                        defaultValue={user.full_name}
                        required
                        disabled={!canEdit}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/60 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Office</label>
                      <input
                        name="office"
                        defaultValue={user.office ?? ''}
                        disabled={!canEdit}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/60 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Unit</label>
                      <input
                        name="unit"
                        defaultValue={user.unit ?? ''}
                        disabled={!canEdit}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/60 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Role</label>
                      <select
                        name="role"
                        defaultValue={user.role}
                        disabled={user.id === currentUserId || !canEdit}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/60 disabled:opacity-60"
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">Status</label>
                      <select
                        name="is_active"
                        defaultValue={user.is_active ? 'true' : 'false'}
                        disabled={user.id === currentUserId || !canEdit}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/60 disabled:opacity-60"
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>

                    <div className="md:col-span-3 flex flex-wrap gap-2">
                      {canEdit ? (
                        <>
                          <button
                            type="submit"
                            disabled={isUpdating}
                            className="rounded-lg border border-amber-500/40 px-4 py-2 text-sm text-amber-200 hover:bg-amber-950/30 disabled:opacity-60"
                          >
                            Save Changes
                          </button>
                          <button
                            type="button"
                            onClick={() => setResetUserId(resetUserId === user.id ? null : user.id)}
                            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-900"
                          >
                            Reset Password
                          </button>
                        </>
                      ) : (
                        <span className="self-center text-xs text-slate-500">View only — higher role account</span>
                      )}
                      {user.id === currentUserId ? (
                        <span className="self-center text-xs text-slate-500">This is your account</span>
                      ) : null}
                    </div>
                  </form>

                  {resetUserId === user.id && canEdit ? (
                    <form
                      action={(formData) => handleResetPassword(user.id, formData)}
                      className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-800 pt-4"
                    >
                      <div className="min-w-[220px] flex-1">
                        <label className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
                          New Password
                        </label>
                        <input
                          name="password"
                          type="password"
                          required
                          minLength={6}
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/60"
                          placeholder="Minimum 6 characters"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isUpdating}
                        className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-900 disabled:opacity-60"
                      >
                        Update Password
                      </button>
                    </form>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
