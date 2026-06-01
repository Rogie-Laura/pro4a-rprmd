import { redirect } from 'next/navigation';
import { canSignInToRprmd } from '@/lib/auth/access-page';
import { canAccessRprmd } from '@/lib/auth/roles';
import { getSessionUser } from '@/lib/auth/session';

export default async function HomePage() {
  const session = await getSessionUser();

  if (session.userId && session.user && canSignInToRprmd(session.user.access_page) && canAccessRprmd(session.user)) {
    redirect('/dashboard');
  }

  redirect('/login');
}
