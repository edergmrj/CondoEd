import { ActionForm, SubmitButton } from '@/components/ActionForm';
import { Badge, Field, Input, PageHeader, Panel, Section, Select, table } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { fmtDate, todayISO } from '@/lib/dates';
import { fmtMoney } from '@/lib/money';
import { listAccounts, listTransfers } from '@/lib/services/queries';
import { STAFF, canWrite } from '@/lib/types';
import { createAccountAction, toggleAccountAction } from '../../actions/catalog';
import { createTransferAction } from '../../actions/ledger';

export const metadata = { title: 'Contas e caixa' };

const KIND: Record<string, string> = { banco: 'Conta bancária', caixa: 'Caixa', fundo_reserva: 'Fundo de reserva' };

export default async function ContasPage() {
  const user = await requireUser(STAFF);
  const writer = canWrite(user.role);
  const [accounts, transfers] = await Promise.all([listAccounts(), listTransfers()]);
  const total = accounts.reduce((a, x) => a + x.balance_cents, 0);
  const activeAccounts = accounts.filter((a) => a.active);

  return (
    <>
      <PageHeader title="Contas e caixa" subtitle={`Saldo total: ${fmtMoney(total)}.`} />

      <div className={table.wrap}>
        <table className={table.root}>
          <thead>
            <tr>
              <th className={table.th}>Conta</th>
              <th className={table.th}>Tipo</th>
              <th className={table.th + ' text-right'}>Saldo inicial</th>
              <th className={table.th + ' text-right'}>Saldo atual</th>
              {writer && <th className={table.th}><span className="sr-only">Ações</span></th>}
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className={a.active ? '' : 'text-tinta-3'}>
                <td className={table.td + ' font-medium'}>{a.name} {!a.active && <Badge>Inativa</Badge>}</td>
                <td className={table.td}>{KIND[a.kind]}</td>
                <td className={table.td + ' ' + table.num}>{fmtMoney(a.opening_balance_cents)}</td>
                <td className={table.td + ' ' + table.num + ' font-semibold'}>{fmtMoney(a.balance_cents)}</td>
                {writer && (
                  <td className={table.td}>
                    <ActionForm action={toggleAccountAction}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="active" value={a.active ? '0' : '1'} />
                      <SubmitButton variant="ghost" size="sm" pendingLabel="...">{a.active ? 'Desativar' : 'Reativar'}</SubmitButton>
                    </ActionForm>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {writer && (
        <div className="grid gap-x-10 lg:grid-cols-2">
          <Section title="Nova conta">
            <Panel>
              <ActionForm action={createAccountAction} resetOnSuccess className="grid gap-4">
                <Field label="Nome"><Input name="name" required maxLength={80} placeholder="Banco do Brasil, conta 12345-6" /></Field>
                <Field label="Tipo">
                  <Select name="kind" defaultValue="banco">
                    <option value="banco">Conta bancária</option>
                    <option value="caixa">Caixa (dinheiro)</option>
                    <option value="fundo_reserva">Fundo de reserva</option>
                  </Select>
                </Field>
                <Field label="Saldo inicial (R$)" hint="Quanto havia na conta quando você começou a usar o sistema."><Input name="opening" inputMode="decimal" placeholder="0,00" /></Field>
                <div><SubmitButton>Criar conta</SubmitButton></div>
              </ActionForm>
            </Panel>
          </Section>

          <Section title="Transferir entre contas">
            <Panel>
              <ActionForm action={createTransferAction} resetOnSuccess className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="De">
                    <Select name="from_id" required defaultValue="">
                      <option value="" disabled>Selecione...</option>
                      {activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </Select>
                  </Field>
                  <Field label="Para">
                    <Select name="to_id" required defaultValue="">
                      <option value="" disabled>Selecione...</option>
                      {activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </Select>
                  </Field>
                  <Field label="Valor (R$)"><Input name="amount" inputMode="decimal" required placeholder="0,00" /></Field>
                  <Field label="Data"><Input name="date" type="date" required defaultValue={todayISO()} /></Field>
                </div>
                <Field label="Descrição (opcional)"><Input name="description" maxLength={120} placeholder="Reforço do fundo de reserva" /></Field>
                <div><SubmitButton>Registrar transferência</SubmitButton></div>
              </ActionForm>
              <p className="mt-3 text-sm text-tinta-3">Transferências mudam o saldo de cada conta, mas não contam como receita nem despesa.</p>
            </Panel>
          </Section>
        </div>
      )}

      {transfers.length > 0 && (
        <Section title="Últimas transferências">
          <div className={table.wrap}>
            <table className={table.root}>
              <thead>
                <tr>
                  <th className={table.th}>Data</th>
                  <th className={table.th}>De</th>
                  <th className={table.th}>Para</th>
                  <th className={table.th}>Descrição</th>
                  <th className={table.th + ' text-right'}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t) => (
                  <tr key={t.id}>
                    <td className={table.td}>{fmtDate(t.date)}</td>
                    <td className={table.td}>{t.from_name}</td>
                    <td className={table.td}>{t.to_name}</td>
                    <td className={table.td}>{t.description ?? '—'}</td>
                    <td className={table.td + ' ' + table.num}>{fmtMoney(t.amount_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </>
  );
}
