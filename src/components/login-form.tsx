'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { loginWithBadge } from '@/app/actions/auth';
import { DIVISION } from '@/lib/auth/roles';

export function LoginForm() {
  const searchParams = useSearchParams();
  const accessError = searchParams.get('error') === 'access';

  const [badgeNumber, setBadgeNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(
    accessError ? 'Your account is not allowed to access RPRMD (division code R1).' : ''
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData();
    formData.set('badge_number', badgeNumber);
    formData.set('password', password);

    const result = await loginWithBadge(formData);

    if (!result.ok) {
      setError(result.message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-3 py-2.5 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div>
        <label
          htmlFor="badge-number"
          className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400"
        >
          Badge Number
        </label>
        <input
          id="badge-number"
          type="text"
          autoComplete="username"
          required
          value={badgeNumber}
          onChange={(event) => setBadgeNumber(event.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2.5 text-sm tracking-wide text-white outline-none ring-amber-400/30 placeholder:text-slate-500 focus:border-amber-400/60 focus:ring-2"
          placeholder="226609"
        />
        <p className="mt-1 text-xs text-slate-500">Use your official badge number.</p>
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2.5 text-sm text-white outline-none ring-amber-400/30 placeholder:text-slate-500 focus:border-amber-400/60 focus:ring-2"
          placeholder="Enter password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Signing in...' : `Sign In — ${DIVISION.directorate}`}
      </button>
    </form>
  );
}
