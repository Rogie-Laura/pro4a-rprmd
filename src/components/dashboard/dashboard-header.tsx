import Image from 'next/image';
import { AccountCard } from '@/components/dashboard/account-card';
import { DIVISION } from '@/lib/auth/roles';
import type { AppUser } from '@/lib/auth/session';

type DashboardHeaderProps = {
  user: AppUser;
};

export function DashboardHeader({ user }: DashboardHeaderProps) {
  return (
    <header className="w-full border-b border-[var(--app-border)] bg-[var(--app-surface)] px-5 py-2.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex shrink-0 items-center gap-2">
            <Image
              src="/PRO4A.png"
              alt="PRO4A Logo"
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
              priority
            />
            <Image
              src="/RPRMD.png"
              alt="RPRMD Logo"
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
              priority
            />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold tracking-tight text-[var(--app-text)] sm:text-base">
              Police Regional Office 4A
            </h1>
            <p className="truncate text-[10px] text-[var(--app-text-muted)] sm:text-[11px]">
              {DIVISION.label}
            </p>
          </div>
        </div>

        <div className="w-48 shrink-0 sm:w-52">
          <AccountCard
            fullName={user.full_name}
            rankFullname={user.rank_fullname}
            badgeNumber={user.badge_number}
            office={user.office}
            unit={user.unit}
          />
        </div>
      </div>
    </header>
  );
}
