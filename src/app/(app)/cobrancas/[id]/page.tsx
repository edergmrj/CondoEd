import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm, SubmitButton } from '@/components/ActionForm';
import { PrintButton } from '@/components/PrintButton';
import { Badge, Field, Input, Notice, PageHeader, Panel, Section, Select, UnitPlate, table } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { fmtDate, fmtMonth, todayISO } from '@/lib/dates';
import { chargeSituation, lateFees, SITUATION_LABEL } from '@/lib/finance';
import { fmtMoney } from '@/lib/money';
import { toId } from '@/lib/params';
import { getChargeDetail, getSettings, listAccounts } from '@/lib/services/queries';
import { canWrite } from '@/lib/types';
import { cancelChargeAction, payChargeAction, reopenChargeAction } from '../../../actions/charges';

export const metadata = { title: 'Cobrança' };

export default async function ChargePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const id = toId((await params).id);
  const c = id ? await getChargeDetail(id) : null;
  if (!c) notFound();
  if (user.role === 'morador' && c.unit_id !== user.unitId) notFound();

  const today = todayISO();
  const settings = await getSettings();
  const writer = canWrite(user.role);
  const sit = chargeSituation(c.status, c.due_date, today);
  const fees = lateFees(c.total_cents, c.due_date, today, settings.fine_percent, settings.interest_percent);
  const accounts = writer && c.status === 'aberta' ? (await listAccounts()).filter((a) => a.active) : [];
  const tone = sit === 'paga' ? 'ok' : sit === 'atrasada' ? 'bad' : sit === 'aberta' ? 'info' : 'neutral';

  return (
    <>
      <PageHeader title={c.description} subtitle={`Competência de ${fmtMonth(c.competence)}.`}>
        <PrintButton />
        <Link href={user.role === 'morador' ? '/minhas-cobrancas' : '/cobrancas'} className="text-sm font-semibold text-petroleo underline">Voltar</Link>
      </PageHeader>

      <Panel>
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-sm text-tinta-3">Unidade</dt><dd className="mt-1"><UnitPlate>{c.identifier}</UnitPlate> <span className="ml-1">{c.block}</span></dd></div>
          <div><dt className="text-sm text-tinta-3">Proprietário</dt><dd className="font-medium">{c.owner_name}</dd></div>
          <div><dt className="text-sm text-tinta-3">Vencimento</dt><dd className="font-medium">{fmtDate(c.due_date)}</dd></div>
          <div><dt className="text-sm text-tinta-3">Situação</dt><dd className="mt-1"><Badge tone={tone}>{SITUATION_LABEL[sit]}</Badge></dd></div>
        </dl>

        <div className={table.wrap + ' mt-6'}>
          <table className={table.root + ' min-w-0'}>
            <thead>
              <tr><th className={table.th}>Item</th><th className={table.th + ' text-right'}>Valor</th></tr>
            </thead>
            <tbody>
              {c.items.map((i) => (
                <tr key={i.id}><td className={table.td}>{i.description}</td><td className={table.td + ' ' + table.num}>{fmtMoney(i.amount_cents)}</td></tr>
              ))}
              <tr><td className={table.td + ' font-semibold'}>Valor da cobrança</td><td className={table.td + ' ' + table.num + ' font-semibold'}>{fmtMoney(c.total_cents)}</td></tr>
              {c.status === 'paga' && (c.fine_cents + c.interest_cents > 0) && (
                <>
                  <tr><td className={table.td}>Multa por atraso</td><td className={table.td + ' ' + table.num}>{fmtMoney(c.fine_cents)}</td></tr>
                  <tr><td className={table.td}>Juros de mora</td><td className={table.td + ' ' + table.num}>{fmtMoney(c.interest_cents)}</td></tr>
                </>
              )}
              {c.status === 'paga' && (
                <tr><td className={table.td + ' font-semibold'}>Total pago em {fmtDate(c.paid_at)}{c.account_name ? ` (${c.account_name})` : ''}</td><td className={table.td + ' ' + table.num + ' font-semibold text-ok-esc'}>{fmtMoney(c.paid_cents)}</td></tr>
              )}
              {sit === 'atrasada' && (
                <>
                  <tr><td className={table.td}>Multa de {settings.fine_percent.toLocaleString('pt-BR')}% ({fees.days} {fees.days === 1 ? 'dia' : 'dias'} de atraso)</td><td className={table.td + ' ' + table.num}>{fmtMoney(fees.fine)}</td></tr>
                  <tr><td className={table.td}>Juros de {settings.interest_percent.toLocaleString('pt-BR')}% ao mês, proporcional aos dias</td><td className={table.td + ' ' + table.num}>{fmtMoney(fees.interest)}</td></tr>
                  <tr><td className={table.td + ' font-semibold'}>Total para pagar hoje</td><td className={table.td + ' ' + table.num + ' font-semibold text-atraso-esc'}>{fmtMoney(c.total_cents + fees.total)}</td></tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {c.status === 'paga' && (
        <Section title="Recibo">
          <Panel>
            <p className="max-w-prose leading-relaxed">
              Recebemos de <strong>{c.owner_name}</strong>, unidade <strong>{c.identifier}</strong>, a quantia de <strong>{fmtMoney(c.paid_cents)}</strong>,
              referente a <strong>{c.description}</strong>, com pagamento em <strong>{fmtDate(c.paid_at)}</strong>.
            </p>
            <p className="mt-6 text-sm text-tinta-3">{settings.name}{settings.cnpj ? `, CNPJ ${settings.cnpj}` : ''}</p>
          </Panel>
        </Section>
      )}

      {writer && c.status === 'aberta' && (
        <Section title="Registrar pagamento" className="no-print">
          <Panel>
            <ActionForm action={payChargeAction} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={c.id} />
              <Field label="Data do pagamento">
                <Input name="paid_at" type="date" required defaultValue={today} />
              </Field>
              <Field label="Conta que recebeu">
                <Select name="account_id" required defaultValue="">
                  <option value="" disabled>Selecione...</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </Select>
              </Field>
              <Field label="Multa (R$)" hint={sit === 'atrasada' ? `Em branco = calculada pela data do pagamento (hoje: ${fmtMoney(fees.fine)}).` : 'Em branco = calculada pela data do pagamento.'}>
                <Input name="fine" inputMode="decimal" placeholder="Automático" />
              </Field>
              <Field label="Juros (R$)" hint={sit === 'atrasada' ? `Em branco = calculados pela data do pagamento (hoje: ${fmtMoney(fees.interest)}).` : 'Em branco = calculados pela data do pagamento.'}>
                <Input name="interest" inputMode="decimal" placeholder="Automático" />
              </Field>
              <div className="sm:col-span-2">
                <SubmitButton pendingLabel="Registrando...">Registrar pagamento</SubmitButton>
              </div>
            </ActionForm>
            <p className="mt-3 text-sm text-tinta-3">Informe 0 para dispensar multa ou juros. O valor entra no caixa como receita, na conta escolhida (a parte do fundo de reserva vai para a conta de reserva).</p>
          </Panel>
          <div className="mt-4">
            <ActionForm action={cancelChargeAction} confirm="Cancelar esta cobrança? Ela deixará de contar como valor a receber.">
              <input type="hidden" name="id" value={c.id} />
              <SubmitButton variant="danger" size="sm" pendingLabel="Cancelando...">Cancelar cobrança</SubmitButton>
            </ActionForm>
          </div>
        </Section>
      )}

      {writer && c.status === 'paga' && (
        <Section className="no-print">
          <ActionForm action={reopenChargeAction} confirm="Estornar o pagamento? As receitas lançadas no caixa serão removidas e a cobrança voltará a ficar em aberto.">
            <input type="hidden" name="id" value={c.id} />
            <SubmitButton variant="danger" size="sm" pendingLabel="Estornando...">Estornar pagamento</SubmitButton>
          </ActionForm>
        </Section>
      )}

      {c.status === 'cancelada' && <div className="mt-6"><Notice tone="warn">Esta cobrança foi cancelada e não conta como valor a receber.</Notice></div>}
    </>
  );
}
