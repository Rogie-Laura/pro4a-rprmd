import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar';
import { canAccessSystemSettings } from '@/lib/auth/roles';
import { requireRprmdAccess } from '@/lib/auth/session';

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireRprmdAccess();

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[var(--app-bg)] text-[var(--app-text)]">
      <div className="shrink-0">
        <DashboardHeader user={session.user!} />
      </div>

      <div className="flex min-h-0 w-full flex-1 overflow-hidden">
        <DashboardSidebar showSystemSettings={canAccessSystemSettings(session.user?.role)} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-3 sm:p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
