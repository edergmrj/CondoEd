import { redirect } from 'next/navigation';
import { ConfigNotice } from '@/components/ConfigNotice';
import { getCurrentUser } from '@/lib/auth';
import { configProblem } from '@/lib/config';
import { hasUsers } from '@/lib/services/admin';
import { homeFor } from '@/lib/types';

export default async function Home() {
  const problem = configProblem();
  if (problem) return <ConfigNotice message={problem} />;
  if (!(await hasUsers())) redirect('/setup');
  const user = await getCurrentUser();
  redirect(user ? homeFor(user.role) : '/login');
}
