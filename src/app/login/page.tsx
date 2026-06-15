import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import LoginPageClient from './login-client';

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect('/admin/dashboard');
  }

  return <LoginPageClient />;
}
