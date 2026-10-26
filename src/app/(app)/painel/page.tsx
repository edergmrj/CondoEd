import Link from 'next/link';
import type { ReactNode } from 'react';
import { BarChart } from '@/components/BarChart';
import { Facade } from '@/components/Facade';
import { Badge, Empty, PageHeader, Section, table } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { fmtDate, fmtMonth, shortMonth, todayISO } from '@/lib/dates';
import { fmtMoney } from '@/lib/money';
import { dashboardData } from '@/lib/services/queries';
import { STAFF } from '@/lib/types';

export const metadata = { title: 'Painel' };

function Metric({ label, value, note, bad }: { label: string; value: string; note?: ReactNode; bad?: boolean }) {
  return (
    <div className="border-b border-r border-linha-forte px-4 py-3.5">
      <dt className="text-sm text-tinta-3">{label}</dt>
      <dd className={`tnum mt-0.5 font-display text-2xl font-bold ${bad ? 'text-atraso-esc' : ''}`}>{value}</dd>
      {note && <dd className="mt-0.5 text-xs text-tinta-3">{note}</dd>}
    </div>
  );
}

export default async function Painel() {
  await requireUser(STAFF);
  const today = todayISO();
  const d = await dashboardData(today);
  const result = d.monthIn - d.monthOut;
  const pct = d.units.length ? Math.round((100 * d.open.overdue_units) / d.units.length) : 0;
  const maxExpense = Math.max(1, ...d.topExpenses.map((e) => e.total));

  return (
    <>
      <PageHeader title="Painel" subtitle={`Situação financeira de ${fmtMonth(d.ym)}.`} />

      <dl className="grid grid-cols-2 border-l border-t border-linha-forte bg-folha lg:grid-cols-4">
        <Metric label="Saldo em caixa e bancos" value={fmtMoney(d.totalBalance)} note={<Link href="/contas" className="underline">Ver contas</Link>} />
        <Metric label="Recebido no mês" value={fmtMoney(d.monthIn)} note={`A vencer em cobranças: ${fmtMoney(d.open.upcoming_cents)}`} />
        <Metric label="Pago no mês" value={fmtMoney(d.monthOut)} note={`Resultado do mês: ${result < 0 ? '−' : ''}${fmtMoney(Math.abs(result))}`} />
        <Metric
          label="Em atraso"
          value={fmtMoney(d.open.overdue_cents)}
          bad={d.open.overdue_cents > 0}
          note={d.open.overdue_units ? `${d.open.overdue_units} ${d.open.overdue_units === 1 ? 'unidade' : 'unidades'} (${pct}%)` : 'Nenhuma unidade em atraso'}
        />
      </dl>

      <Section
        title="Situação das unidades"
        action={d.open.overdue_units > 0 ? <Link href="/relatorios/inadimplencia" className="text-sm font-semibold text-petroleo underline">Ver inadimplência</Link> : undefined}
      >
        {d.units.length ? (
          <Facade units={d.units} />
        ) : (
          <Empty title="Nenhuma unidade cadastrada">
            Comece cadastrando as unidades em <Link href="/unidades" className="font-semibold underline">Unidades</Link>.
          </Empty>
        )}
      </Section>

      <Section title="Receitas e despesas nos últimos 12 meses">
        <BarChart
          aLabel="Recebido"
          bLabel="Pago"
          data={d.months.map((m) => ({ label: shortMonth(m.ym), a: m.rec, b: m.des }))}
        />
      </Section>

      <div className="grid gap-x-10 lg:grid-cols-2">
        <Section title="Contas a pagar" action={<Link href="/lancamentos?status=pendente&mes=" className="text-sm font-semibold text-petroleo underline">Ver todas</Link>}>
          {d.payables.length ? (
            <div className={table.wrap}>
              <table className={table.root + ' min-w-0'}>
                <thead>
                  <tr>
                    <th className={table.th}>Vence</th>
                    <th className={table.th}>Descrição</th>
                    <th className={table.th + ' text-right'}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {d.payables.map((p) => (
                    <tr key={p.id}>
                      <td className={table.td + ' whitespace-nowrap'}>
                        {fmtDate(p.due_date)}
                        {p.due_date < today && <div className="mt-0.5"><Badge tone="bad">Vencida</Badge></div>}
                      </td>
                      <td className={table.td}>
                        <Link href={`/lancamentos/${p.id}`} className="font-medium hover:underline">{p.description}</Link>
                        <div className="text-xs text-tinta-3">{p.supplier ?? p.category}</div>
                      </td>
                      <td className={table.td + ' ' + table.num}>{fmtMoney(p.amount_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="Nada a pagar nos próximos 30 dias" />
          )}
        </Section>

        <Section title="Maiores despesas do mês">
          {d.topExpenses.length ? (
            <ul className="space-y-3">
              {d.topExpenses.map((e) => (
                <li key={e.name}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span>{e.name}</span>
                    <span className="tnum font-semibold">{fmtMoney(e.total)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-sm bg-linha">
                    <div className="h-2 rounded-sm bg-latao" style={{ width: `${Math.max(3, (100 * e.total) / maxExpense)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="Ainda não há despesas pagas neste mês" />
          )}
        </Section>
      </div>

      <Section title="Saldos por conta">
        <div className={table.wrap}>
          <table className={table.root + ' min-w-0'}>
            <thead>
              <tr>
                <th className={table.th}>Conta</th>
                <th className={table.th + ' text-right'}>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {d.accounts.filter((a) => a.active || a.balance_cents !== 0).map((a) => (
                <tr key={a.id}>
                  <td className={table.td}>{a.name}{!a.active && <span className="ml-2 text-xs text-tinta-3">(inativa)</span>}</td>
                  <td className={table.td + ' ' + table.num}>{fmtMoney(a.balance_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
