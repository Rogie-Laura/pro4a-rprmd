'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { logoutUser } from '@/app/actions/auth';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useTheme, type Theme } from '@/components/theme-provider';

type AccountCardProps = {
  fullName: string;
  rankFullname: string | null;
  badgeNumber: string;
  office: string | null;
  unit: string | null;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function AccountAvatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-10 w-10 text-sm' : 'h-8 w-8 text-xs';

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 font-bold text-slate-950 ring-2 ring-amber-500/20 ${sizeClass}`}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  );
}

function ThemeOption({
  label,
  value,
  active,
  onSelect,
}: {
  label: string;
  value: Theme;
  active: boolean;
  onSelect: (value: Theme) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`w-full px-3 py-2 text-left text-xs transition ${
        active
          ? 'bg-amber-500/15 font-medium text-amber-600 dark:text-amber-200'
          : 'text-[var(--app-text-muted)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text)]'
      }`}
    >
      {label}
    </button>
  );
}

export function AccountCard({
  fullName,
  rankFullname,
  badgeNumber,
  office,
  unit,
}: AccountCardProps) {
  const [open, setOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, startLogout] = useTransition();
  const cardRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();

  function handleLogoutConfirm() {
    startLogout(async () => {
      await logoutUser();
    });
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={cardRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-2)] px-2.5 py-2 text-left transition hover:border-amber-500/40"
      >
        <AccountAvatar name={fullName} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-[var(--app-text)]">
            {rankFullname ?? fullName}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-[var(--app-text-muted)]">
            Badge {badgeNumber}
          </p>
        </div>
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-52 overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-popover)] shadow-xl shadow-black/20">
          <div className="flex items-center gap-2.5 border-b border-[var(--app-border)] px-3 py-2.5">
            <AccountAvatar name={fullName} size="lg" />
            <div className="min-w-0 text-[10px] text-[var(--app-text-muted)]">
              <p className="truncate font-medium text-[var(--app-text)]">{fullName}</p>
              <p className="truncate">Badge {badgeNumber}</p>
              <p className="truncate">{office ?? '—'} • {unit ?? '—'}</p>
            </div>
          </div>

          <div className="border-b border-[var(--app-border)] py-1">
            <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--app-text-muted)]">
              Theme
            </p>
            <ThemeOption
              label="Default (Dark mode)"
              value="dark"
              active={theme === 'dark'}
              onSelect={setTheme}
            />
            <ThemeOption
              label="Light mode"
              value="light"
              active={theme === 'light'}
              onSelect={setTheme}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setShowLogoutConfirm(true);
            }}
            className="w-full px-3 py-2 text-left text-xs text-red-500 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
          >
            Logout
          </button>
        </div>
      ) : null}

      {showLogoutConfirm ? (
        <ConfirmDialog
          title="Sign Out?"
          message="Are you sure you want to log out of your account?"
          confirmLabel="Yes, Logout"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={handleLogoutConfirm}
          onCancel={() => setShowLogoutConfirm(false)}
          isPending={isLoggingOut}
        />
      ) : null}
    </div>
  );
}
