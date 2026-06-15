import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import AuthenticatedLayoutClient from './layout-client';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <AuthenticatedLayoutClient currentUser={user}>
      {children}
    </AuthenticatedLayoutClient>
  );
}
