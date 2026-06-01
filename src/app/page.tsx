import { redirect } from 'next/navigation';
import { canAccessRprmd } from '@/lib/auth/roles';
import { getSessionUser } from '@/lib/auth/session';

export default async function HomePage() {
  const session = await getSessionUser();

  if (session.userId && canAccessRprmd(session.user?.role)) {
    redirect('/dashboard');
  }

  redirect('/login');
}
