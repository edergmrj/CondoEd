import { redirect } from 'next/navigation';
import { ActionForm, SubmitButton } from '@/components/ActionForm';
import { AuthFrame } from '@/components/AuthFrame';
import { ConfigNotice } from '@/components/ConfigNotice';
import { Field, Input } from '@/components/ui';
import { configProblem } from '@/lib/config';
import { hasUsers } from '@/lib/services/admin';
import { setupAction } from '../actions/auth';

export const metadata = { title: 'Configuração inicial' };

export default async function SetupPage() {
  const problem = configProblem();
  if (problem) return <ConfigNotice message={problem} />;
  if (await hasUsers()) redirect('/login');
  const needsKey = !!process.env.SETUP_KEY;
  return (
    <AuthFrame title="Configuração inicial" subtitle="Cadastre o condomínio e a conta do síndico. Isso é feito uma única vez.">
      <ActionForm action={setupAction} className="space-y-4">
        <Field label="Nome do condomínio">
          <Input name="condo_name" required maxLength={120} placeholder="Residencial Jardim das Acácias" />
        </Field>
        <Field label="CNPJ (opcional)">
          <Input name="cnpj" inputMode="numeric" placeholder="00.000.000/0000-00" />
        </Field>
        <Field label="Seu nome">
          <Input name="name" required autoComplete="name" />
        </Field>
        <Field label="Seu e-mail">
          <Input name="email" type="email" required autoComplete="username" />
        </Field>
        <Field label="Senha" hint="Mínimo de 8 caracteres.">
          <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
        <Field label="Repita a senha">
          <Input name="password2" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
        {needsKey && (
          <Field label="Chave de instalação" hint="É o valor da variável SETUP_KEY configurada na Vercel.">
            <Input name="setup_key" type="password" required />
          </Field>
        )}
        <SubmitButton pendingLabel="Criando...">Criar condomínio</SubmitButton>
      </ActionForm>
    </AuthFrame>
  );
}
