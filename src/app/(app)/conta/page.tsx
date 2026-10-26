import { ActionForm, SubmitButton } from '@/components/ActionForm';
import { Field, Input, PageHeader, Panel } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { ROLE_LABEL } from '@/lib/types';
import { changePasswordAction } from '../../actions/auth';

export const metadata = { title: 'Minha conta' };

export default async function ContaPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="Minha conta" subtitle={`${user.name}, ${user.email}. Perfil: ${ROLE_LABEL[user.role]}.`} />
      <Panel className="max-w-lg">
        <ActionForm action={changePasswordAction} resetOnSuccess className="grid gap-4">
          <Field label="Senha atual"><Input name="current" type="password" required autoComplete="current-password" /></Field>
          <Field label="Nova senha" hint="Mínimo de 8 caracteres."><Input name="new" type="password" required minLength={8} autoComplete="new-password" /></Field>
          <Field label="Repita a nova senha"><Input name="confirm" type="password" required minLength={8} autoComplete="new-password" /></Field>
          <div><SubmitButton>Alterar senha</SubmitButton></div>
        </ActionForm>
      </Panel>
    </>
  );
}
