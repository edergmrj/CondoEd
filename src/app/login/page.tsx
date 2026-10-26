import { redirect } from 'next/navigation';
import { ActionForm, SubmitButton } from '@/components/ActionForm';
import { AuthFrame } from '@/components/AuthFrame';
import { ConfigNotice } from '@/components/ConfigNotice';
import { Field, Input } from '@/components/ui';
import { getCurrentUser } from '@/lib/auth';
import { configProblem } from '@/lib/config';
import { hasUsers } from '@/lib/services/admin';
import { homeFor } from '@/lib/types';
import { loginAction } from '../actions/auth';

export const metadata = { title: 'Entrar' };

export default async function LoginPage() {
  const problem = configProblem();
  if (problem) return <ConfigNotice message={problem} />;
  if (!(await hasUsers())) redirect('/setup');
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  return (
    <AuthFrame title="Entrar" subtitle="Use o e-mail e a senha que o síndico cadastrou para você.">
      <ActionForm action={loginAction} className="space-y-4">
        <Field label="E-mail">
          <Input name="email" type="email" autoComplete="username" required autoFocus />
        </Field>
        <Field label="Senha">
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        <SubmitButton pendingLabel="Entrando...">Entrar</SubmitButton>
      </ActionForm>
    </AuthFrame>
  );
}
