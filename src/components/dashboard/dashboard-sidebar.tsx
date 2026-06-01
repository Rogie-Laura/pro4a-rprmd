'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Personnel List', exact: true },
  { href: '/dashboard/awards', label: 'Issued Award/Medals' },
  { href: '/dashboard/commendations', label: 'Issued Letter of Commendations' },
] as const;

type DashboardSidebarProps = {
  showSystemSettings?: boolean;
};

function navLinkClass(isActive: boolean) {
  return `rounded-md px-2.5 py-2 text-xs leading-snug transition ${
    isActive
      ? 'bg-amber-500/15 font-semibold text-amber-600 ring-1 ring-amber-500/30 dark:text-amber-200'
      : 'text-[var(--app-text-muted)] hover:bg-[var(--app-hover)] hover:text-[var(--app-text)]'
  }`;
}

export function DashboardSidebar({ showSystemSettings = false }: DashboardSidebarProps) {
  const pathname = usePathname();
  const isSettingsActive =
    pathname === '/dashboard/settings' || pathname.startsWith('/dashboard/settings/');

  return (
    <aside className="flex h-full w-52 shrink-0 flex-col overflow-hidden border-r border-[var(--app-border)] bg-[var(--app-surface)]">
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            'exact' in item && item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link key={item.href} href={item.href} className={navLinkClass(isActive)}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {showSystemSettings ? (
        <div className="border-t border-[var(--app-border)] p-3">
          <Link href="/dashboard/settings" className={navLinkClass(isSettingsActive)}>
            System Settings
          </Link>
        </div>
      ) : null}
    </aside>
  );
}
