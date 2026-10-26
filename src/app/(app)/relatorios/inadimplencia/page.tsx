import Link from 'next/link';
import { PrintButton } from '@/components/PrintButton';
import { Badge, Empty, PageHeader, Section, UnitPlate, btnCls, table } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { fmtDate, todayISO } from '@/lib/dates';
import { fmtMoney } from '@/lib/money';
import { delinquencyData, getSettings } from '@/lib/services/queries';
import { STAFF } from '@/lib/types';

export const metadata = { title: 'Inadimplência' };

export default async function InadimplenciaPage() {
  await requireUser(STAFF);
  const today = todayISO();
  const settings = await getSettings();
  const d = await delinquencyData(today, settings);

  const buckets = [
    { label: 'Até 30 dias', v: d.aging.d30 },
    { label: '31 a 60 dias', v: d.aging.d60 },
    { label: '61 a 90 dias', v: d.aging.d90 },
    { label: 'Mais de 90 dias', v: d.aging.d90plus },
  ];
  const max = Math.max(1, ...buckets.map((b) => b.v));

  return (
    <>
      <PageHeader title="Inadimplência" subtitle={`Posição em ${fmtDate(today)}. Multa de ${settings.fine_percent.toLocaleString('pt-BR')}% e juros de ${settings.interest_percent.toLocaleString('pt-BR')}% ao mês, proporcionais aos dias de atraso.`}>
        <PrintButton />
        <a href="/api/export?tipo=inadimplencia" className={btnCls('ghost')}>Baixar planilha (CSV)</a>
      </PageHeader>

      {d.units.length === 0 ? (
        <Empty title="Nenhuma unidade em atraso">Todas as cobranças vencidas já foram pagas ou canceladas.</Empty>
      ) : (
        <>
          <dl className="grid grid-cols-2 border-l border-t border-linha-forte bg-folha lg:grid-cols-4">
            {[
              ['Valor em atraso', fmtMoney(d.principal)],
              ['Multa e juros estimados', fmtMoney(d.fees)],
              ['Total atualizado', fmtMoney(d.total)],
              ['Unidades em atraso', String(d.units.length)],
            ].map(([k, v]) => (
              <div key={k} className="border-b border-r border-linha-forte px-4 py-3.5">
                <dt className="text-sm text-tinta-3">{k}</dt>
                <dd className="tnum mt-0.5 font-display text-2xl font-bold">{v}</dd>
              </div>
            ))}
          </dl>

          <Section title="Tempo de atraso">
            <ul className="space-y-3">
              {buckets.map((b) => (
                <li key={b.label}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span>{b.label}</span>
                    <span className="tnum font-semibold">{fmtMoney(b.v)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-sm bg-linha">
                    <div className="h-2 rounded-sm bg-atraso" style={{ width: `${b.v ? Math.max(3, (100 * b.v) / max) : 0}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Unidades em atraso">
            <div className={table.wrap}>
              <table className={table.root}>
                <thead>
                  <tr>
                    <th className={table.th}>Unidade</th>
                    <th className={table.th}>Contato</th>
                    <th className={table.th + ' text-right'}>Cobranças</th>
                    <th className={table.th + ' text-right'}>Maior atraso</th>
                    <th className={table.th + ' text-right'}>Valor</th>
                    <th className={table.th + ' text-right'}>Atualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {d.units.map((u) => (
                    <tr key={u.unitId}>
                      <td className={table.td}>
                        <UnitPlate>{u.identifier}</UnitPlate>
                        <div className="mt-1 text-xs text-tinta-3">{u.owner_name}</div>
                      </td>
                      <td className={table.td + ' text-xs'}>
                        {u.owner_phone ?? '—'}
                        {u.owner_email && <div>{u.owner_email}</div>}
                      </td>
                      <td className={table.td + ' ' + table.num}>
                        <details>
                          <summary className="text-right text-petroleo underline">{u.charges.length}</summary>
                          <ul className="mt-2 space-y-1 text-left text-xs">
                            {u.charges.map((c) => (
                              <li key={c.id}>
                                <Link href={`/cobrancas/${c.id}`} className="hover:underline">{c.description}</Link>
                                {' '}vence {fmtDate(c.due_date)}, {c.days} dias, {fmtMoney(c.total_cents)}
                              </li>
                            ))}
                          </ul>
                        </details>
                      </td>
                      <td className={table.td + ' ' + table.num}><Badge tone={u.maxDays > 90 ? 'bad' : 'warn'}>{u.maxDays} dias</Badge></td>
                      <td className={table.td + ' ' + table.num}>{fmtMoney(u.principal)}</td>
                      <td className={table.td + ' ' + table.num + ' font-semibold'}>{fmtMoney(u.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-tinta-3">Os encargos são estimativas até hoje. O valor definitivo é calculado na data do pagamento, e correção monetária ou honorários previstos na convenção não estão incluídos.</p>
          </Section>
        </>
      )}
    </>
  );
}
