import { ActionForm, SubmitButton } from '@/components/ActionForm';
import { Badge, Field, Input, PageHeader, Panel, Section, Select, table } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { fmtDate } from '@/lib/dates';
import { listUnits, listUsers } from '@/lib/services/queries';
import { ROLE_LABEL, type Role } from '@/lib/types';
import { todayISO } from '@/lib/dates';
import { createUserAction, toggleUserAction, updateUserAction } from '../../actions/admin';

export const metadata = { title: 'Usuários' };

const ROLES = Object.keys(ROLE_LABEL) as Role[];

export default async function UsuariosPage() {
  const me = await requireUser(['admin']);
  const [users, units] = await Promise.all([listUsers(), listUnits(todayISO(), true)]);
  const unitOptions = (
    <>
      <option value="">Nenhuma</option>
      {units.map((u) => <option key={u.id} value={u.id}>{u.identifier}{u.block ? ` (${u.block})` : ''}</option>)}
    </>
  );

  return (
    <>
      <PageHeader title="Usuários" subtitle="Quem pode entrar no sistema e o que cada pessoa pode fazer." />

      <div className={table.wrap}>
        <table className={table.root}>
          <thead>
            <tr>
              <th className={table.th}>Nome</th>
              <th className={table.th}>Perfil</th>
              <th className={table.th}>Unidade</th>
              <th className={table.th}>Situação</th>
              <th className={table.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={u.active ? '' : 'text-tinta-3'}>
                <td className={table.td}>
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-tinta-3">{u.email}, desde {fmtDate(u.created_at)}</div>
                </td>
                <td className={table.td}>{ROLE_LABEL[u.role as Role]}</td>
                <td className={table.td}>{u.unit ?? '—'}</td>
                <td className={table.td}>{u.active ? <Badge tone="ok">Ativo</Badge> : <Badge>Desativado</Badge>}</td>
                <td className={table.td}>
                  <details>
                    <summary className="text-sm font-semibold text-petroleo underline">Editar</summary>
                    <ActionForm action={updateUserAction} className="mt-3 grid min-w-64 gap-3">
                      <input type="hidden" name="id" value={u.id} />
                      <Field label="Perfil">
                        <Select name="role" defaultValue={u.role}>
                          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                        </Select>
                      </Field>
                      <Field label="Unidade (para moradores)">
                        <Select name="unit_id" defaultValue={u.unit_id ?? ''}>{unitOptions}</Select>
                      </Field>
                      <Field label="Nova senha (opcional)" hint="Deixe em branco para manter a atual.">
                        <Input name="password" type="password" minLength={8} autoComplete="new-password" />
                      </Field>
                      <div><SubmitButton size="sm">Salvar</SubmitButton></div>
                    </ActionForm>
                    {u.id !== me.id && (
                      <ActionForm action={toggleUserAction} className="mt-3">
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="active" value={u.active ? '0' : '1'} />
                        <SubmitButton variant={u.active ? 'danger' : 'ghost'} size="sm" pendingLabel="...">{u.active ? 'Desativar acesso' : 'Reativar acesso'}</SubmitButton>
                      </ActionForm>
                    )}
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Section title="Novo usuário">
        <Panel>
          <ActionForm action={createUserAction} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome"><Input name="name" required maxLength={120} /></Field>
            <Field label="E-mail"><Input name="email" type="email" required /></Field>
            <Field label="Perfil" hint="Conselho fiscal só consulta. Morador vê as cobranças da própria unidade e a prestação de contas.">
              <Select name="role" defaultValue="financeiro">
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </Select>
            </Field>
            <Field label="Unidade" hint="Obrigatória para o perfil Morador.">
              <Select name="unit_id" defaultValue="">{unitOptions}</Select>
            </Field>
            <Field label="Senha inicial" hint="Mínimo de 8 caracteres. A pessoa pode trocá-la em Minha conta.">
              <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
            </Field>
            <div className="flex items-end"><SubmitButton>Criar usuário</SubmitButton></div>
          </ActionForm>
        </Panel>
      </Section>
    </>
  );
}
