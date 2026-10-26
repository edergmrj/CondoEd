import Link from 'next/link';
import { ActionForm, SubmitButton } from '@/components/ActionForm';
import { Badge, Empty, Field, FilterBar, Input, PageHeader, Select, btnCls, table } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { fmtDate, fmtMonth, isValidMonth, todayISO } from '@/lib/dates';
import { fmtMoney } from '@/lib/money';
import { readParams, toId, type SearchParams } from '@/lib/params';
import { listAccounts, listCategories, listTransactions } from '@/lib/services/queries';
import { STAFF, canWrite } from '@/lib/types';
import { payTransactionAction } from '../../actions/ledger';

export const metadata = { title: 'Receitas e despesas' };

export default async function LancamentosPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser(STAFF);
  const writer = canWrite(user.role);
  const p = await readParams(searchParams);
  const today = todayISO();
  const categoryId = toId(p.categoria);
  const accountId = toId(p.conta);
  const filtered = !!(p.status || p.tipo || categoryId || accountId);
  const ym = p.mes === undefined ? (filtered ? '' : today.slice(0, 7)) : isValidMonth(p.mes) ? p.mes : '';

  const [rows, categories, accounts] = await Promise.all([
    listTransactions({ ym, type: p.tipo, status: p.status, categoryId, accountId, today }),
    listCategories(false),
    listAccounts(),
  ]);
  const total = (type: string, paid: boolean) => rows.filter((t) => t.type === type && (t.paid_at != null) === paid).reduce((a, t) => a + t.amount_cents, 0);

  return (
    <>
      <PageHeader title="Receitas e despesas" subtitle={ym ? `Movimentação de ${fmtMonth(ym)}.` : 'Todos os períodos.'}>
        {writer && (
          <>
            <Link href="/lancamentos/novo?tipo=despesa" className={btnCls('primary')}>Nova despesa</Link>
            <Link href="/lancamentos/novo?tipo=receita" className={btnCls('ghost')}>Nova receita</Link>
          </>
        )}
      </PageHeader>

      <FilterBar>
        <Field label="Mês">
          <Input name="mes" type="month" placeholder="AAAA-MM" defaultValue={ym} />
        </Field>
        <Field label="Tipo">
          <Select name="tipo" defaultValue={p.tipo ?? ''}>
            <option value="">Todos</option>
            <option value="receita">Receitas</option>
            <option value="despesa">Despesas</option>
          </Select>
        </Field>
        <Field label="Situação">
          <Select name="status" defaultValue={p.status ?? ''}>
            <option value="">Todas</option>
            <option value="pago">Pagas ou recebidas</option>
            <option value="pendente">A vencer</option>
            <option value="atrasado">Vencidas</option>
          </Select>
        </Field>
        <Field label="Categoria">
          <Select name="categoria" defaultValue={categoryId ?? ''}>
            <option value="">Todas</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Conta">
          <Select name="conta" defaultValue={accountId ?? ''}>
            <option value="">Todas</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </Field>
      </FilterBar>

      {rows.length ? (
        <>
          <dl className="mb-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div><dt className="inline text-tinta-3">Recebido: </dt><dd className="tnum inline font-semibold text-ok-esc">{fmtMoney(total('receita', true))}</dd></div>
            <div><dt className="inline text-tinta-3">Pago: </dt><dd className="tnum inline font-semibold">{fmtMoney(total('despesa', true))}</dd></div>
            <div><dt className="inline text-tinta-3">A receber: </dt><dd className="tnum inline font-semibold">{fmtMoney(total('receita', false))}</dd></div>
            <div><dt className="inline text-tinta-3">A pagar: </dt><dd className="tnum inline font-semibold text-atraso-esc">{fmtMoney(total('despesa', false))}</dd></div>
          </dl>
          <div className={table.wrap}>
            <table className={table.root + ' min-w-[40rem]'}>
              <thead>
                <tr>
                  <th className={table.th}>Data</th>
                  <th className={table.th}>Descrição</th>
                  <th className={table.th}>Categoria</th>
                  <th className={table.th}>Conta</th>
                  <th className={table.th + ' text-right'}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const paid = t.paid_at != null;
                  const overdue = !paid && t.due_date < today;
                  return (
                    <tr key={t.id}>
                      <td className={table.td + ' whitespace-nowrap'}>
                        {fmtDate(t.paid_at ?? t.due_date)}
                        <div className="mt-1">
                          {paid ? <Badge tone="ok">{t.type === 'receita' ? 'Recebida' : 'Paga'}</Badge> : overdue ? <Badge tone="bad">Vencida</Badge> : <Badge tone="info">A vencer</Badge>}
                        </div>
                      </td>
                      <td className={table.td}>
                        <Link href={`/lancamentos/${t.id}`} className="font-medium hover:underline">{t.description}</Link>
                        <div className="text-xs text-tinta-3">
                          {[t.supplier, t.unit ? `unidade ${t.unit}` : null, t.document_ref].filter(Boolean).join('  ')}
                        </div>
                        {writer && !paid && !t.charge_id && (
                          <details className="mt-1">
                            <summary className="text-sm font-semibold text-petroleo underline">Dar baixa</summary>
                            <ActionForm action={payTransactionAction} className="mt-2 flex flex-wrap items-end gap-2">
                              <input type="hidden" name="id" value={t.id} />
                              <Field label="Data"><Input name="paid_at" type="date" required defaultValue={today} /></Field>
                              <Field label="Conta">
                                <Select name="account_id" required defaultValue="">
                                  <option value="" disabled>Selecione...</option>
                                  {accounts.filter((a) => a.active).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </Select>
                              </Field>
                              <SubmitButton size="sm" pendingLabel="...">Confirmar</SubmitButton>
                            </ActionForm>
                          </details>
                        )}
                      </td>
                      <td className={table.td}>{t.category}</td>
                      <td className={table.td}>{t.account ?? '—'}</td>
                      <td className={table.td + ' ' + table.num + (t.type === 'receita' ? ' text-ok-esc' : '')}>
                        {t.type === 'despesa' ? '−' : '+'} {fmtMoney(t.amount_cents)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rows.length >= 400 && <p className="mt-3 text-sm text-tinta-3">Mostrando os 400 primeiros. Use os filtros para refinar.</p>}
        </>
      ) : (
        <Empty title="Nenhum lançamento neste filtro">
          {writer ? <>Registre uma <Link href="/lancamentos/novo?tipo=despesa" className="font-semibold underline">despesa</Link> ou uma <Link href="/lancamentos/novo?tipo=receita" className="font-semibold underline">receita</Link>.</> : 'Ajuste os filtros para ver outros períodos.'}
        </Empty>
      )}
    </>
  );
}
