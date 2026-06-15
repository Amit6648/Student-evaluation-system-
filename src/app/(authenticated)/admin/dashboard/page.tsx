import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardPageClient from './dashboard-client';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return <DashboardPageClient currentUser={user} />;
}
