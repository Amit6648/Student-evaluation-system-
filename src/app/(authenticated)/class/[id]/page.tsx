import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ClassroomDetailPageClient from './classroom-detail-client';

export default async function ClassroomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const resolvedParams = await params;
  return <ClassroomDetailPageClient currentUser={user} classId={resolvedParams.id} />;
}
