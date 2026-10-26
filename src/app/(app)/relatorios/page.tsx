import Link from 'next/link';
import { PrintButton } from '@/components/PrintButton';
import { Badge, Empty, Field, FilterBar, Input, PageHeader, Section, table, btnCls } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { fmtDate, fmtMonth, isValidMonth, todayISO } from '@/lib/dates';
import { fmtMoney, fmtPct } from '@/lib/money';
import { readParams, type SearchParams } from '@/lib/params';
import { getSettings, monthlyReport } from '@/lib/services/queries';

export const metadata = { title: 'Prestação de contas' };

type Cat = { id: number; name: string; total: number; n: number };

function CategoryTable({ title, items, total }: { title: string; items: Cat[]; total: number }) {
  return (
    <div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <table className={table.root + ' min-w-0'}>
        <thead>
          <tr>
            <th className={table.th}>Categoria</th>
            <th className={table.th + ' text-right'}>Valor</th>
            <th className={table.th + ' text-right'}>%</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id}>
              <td className={table.td}>{c.name}</td>
              <td className={table.td + ' ' + table.num}>{fmtMoney(c.total)}</td>
              <td className={table.td + ' ' + table.num + ' text-tinta-3'}>{total ? fmtPct((100 * c.total) / total, 1) : '—'}</td>
            </tr>
          ))}
          {!items.length && <tr><td colSpan={3} className={table.td + ' text-tinta-3'}>Nenhum lançamento no mês.</td></tr>}
          <tr>
            <td className={table.td + ' font-semibold'}>Total</td>
            <td className={table.td + ' ' + table.num + ' font-semibold'}>{fmtMoney(total)}</td>
            <td className={table.td} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default async function RelatorioPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const staff = user.role !== 'morador';
  const p = await readParams(searchParams);
  const ym = isValidMonth(p.mes) ? p.mes : todayISO().slice(0, 7);
  const [r, settings] = await Promise.all([monthlyReport(ym), getSettings()]);
  // Moradores veem as despesas em detalhe, mas não quem pagou cada taxa.
  const lines = staff ? r.lines : r.lines.filter((l) => l.type === 'despesa');

  return (
    <>
      <p className="mb-1 hidden text-sm print:block">{settings.name}{settings.cnpj ? `, CNPJ ${settings.cnpj}` : ''}</p>
      <PageHeader title="Prestação de contas" subtitle={`Movimentação de ${fmtMonth(ym)} (regime de caixa: valores efetivamente recebidos e pagos).`}>
        <PrintButton />
        {staff && <a href={`/api/export?tipo=prestacao&mes=${ym}`} className={btnCls('ghost')}>Baixar planilha (CSV)</a>}
      </PageHeader>

      <FilterBar>
        <Field label="Mês"><Input name="mes" type="month" placeholder="AAAA-MM" defaultValue={ym} /></Field>
      </FilterBar>

      <div className={table.wrap}>
        <table className={table.root + ' min-w-0 max-w-xl'}>
          <tbody>
            <tr><td className={table.td}>Saldo no início do mês</td><td className={table.td + ' ' + table.num}>{fmtMoney(r.previous)}</td></tr>
            <tr><td className={table.td}>(+) Receitas recebidas</td><td className={table.td + ' ' + table.num + ' text-ok-esc'}>{fmtMoney(r.totalIn)}</td></tr>
            <tr><td className={table.td}>(−) Despesas pagas</td><td className={table.td + ' ' + table.num}>{fmtMoney(r.totalOut)}</td></tr>
            <tr><td className={table.td + ' border-b-2 border-petroleo font-semibold'}>(=) Saldo no fim do mês</td><td className={table.td + ' ' + table.num + ' border-b-2 border-petroleo text-lg font-bold'}>{fmtMoney(r.closing)}</td></tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-sm text-tinta-3">Resultado do mês: {r.result < 0 ? '−' : ''}{fmtMoney(Math.abs(r.result))}.</p>

      <Section title="Receitas e despesas por categoria">
        <div className="grid gap-x-10 gap-y-8 lg:grid-cols-2">
          <CategoryTable title="Receitas" items={r.income} total={r.totalIn} />
          <CategoryTable title="Despesas" items={r.expense} total={r.totalOut} />
        </div>
      </Section>

      <Section title="Saldo de cada conta no fim do mês">
        <div className={table.wrap}>
          <table className={table.root + ' min-w-0 max-w-xl'}>
            <tbody>
              {r.accounts.filter((a) => a.active || a.balance_cents !== 0).map((a) => (
                <tr key={a.id}><td className={table.td}>{a.name}</td><td className={table.td + ' ' + table.num}>{fmtMoney(a.balance_cents)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Movimentação detalhada">
        {lines.length ? (
          <div className={table.wrap}>
            <table className={table.root + ' min-w-[40rem]'}>
              <thead>
                <tr>
                  <th className={table.th}>Data</th>
                  <th className={table.th}>Descrição</th>
                  <th className={table.th}>Categoria</th>
                  <th className={table.th + ' text-right'}>Entrada</th>
                  <th className={table.th + ' text-right'}>Saída</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((t) => (
                  <tr key={t.id}>
                    <td className={table.td + ' whitespace-nowrap'}>{fmtDate(t.paid_at)}</td>
                    <td className={table.td}>
                      {t.description}
                      <div className="text-xs text-tinta-3">{[t.supplier, t.document_ref].filter(Boolean).join('  ')}</div>
                    </td>
                    <td className={table.td}>{t.category}</td>
                    <td className={table.td + ' ' + table.num}>{t.type === 'receita' ? fmtMoney(t.amount_cents) : ''}</td>
                    <td className={table.td + ' ' + table.num}>{t.type === 'despesa' ? fmtMoney(t.amount_cents) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Sem movimentação neste mês" />
        )}
        {!staff && <p className="mt-2 text-sm text-tinta-3">Para preservar a privacidade, as receitas de cada unidade aparecem apenas somadas por categoria.</p>}
      </Section>

      {r.payables.length > 0 && (
        <Section title="Despesas em aberto até o fim do mês">
          <div className={table.wrap}>
            <table className={table.root + ' min-w-0'}>
              <thead>
                <tr>
                  <th className={table.th}>Vencimento</th>
                  <th className={table.th}>Descrição</th>
                  <th className={table.th + ' text-right'}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {r.payables.map((x) => (
                  <tr key={x.id}>
                    <td className={table.td + ' whitespace-nowrap'}>{fmtDate(x.due_date)}</td>
                    <td className={table.td}>{x.description} {x.supplier && <span className="text-xs text-tinta-3">{x.supplier}</span>}</td>
                    <td className={table.td + ' ' + table.num}>{fmtMoney(x.amount_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {staff && (
        <p className="no-print mt-8 text-sm text-tinta-3">
          Veja também a <Link href="/relatorios/inadimplencia" className="font-semibold text-petroleo underline">inadimplência</Link>. <Badge tone="info">Dica</Badge> Use o botão Imprimir e escolha “Salvar como PDF” para anexar à ata da assembleia.
        </p>
      )}
    </>
  );
}
