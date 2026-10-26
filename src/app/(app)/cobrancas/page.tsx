import Link from 'next/link';
import { Badge, Empty, Field, FilterBar, Input, PageHeader, Select, UnitPlate, btnCls, table } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { fmtDate, fmtMonth, isValidMonth, todayISO } from '@/lib/dates';
import { chargeSituation, SITUATION_LABEL } from '@/lib/finance';
import { fmtMoney } from '@/lib/money';
import { readParams, toId, type SearchParams } from '@/lib/params';
import { listCharges, listUnits } from '@/lib/services/queries';
import { STAFF, canWrite } from '@/lib/types';

export const metadata = { title: 'Cobranças' };

export default async function CobrancasPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser(STAFF);
  const p = await readParams(searchParams);
  const today = todayISO();
  const unitId = toId(p.unidade);
  // Sem nenhum filtro na URL, mostra o mês atual; com filtro de situação/unidade, mostra todos os meses.
  const ym = p.mes === undefined ? (p.status || unitId ? '' : today.slice(0, 7)) : isValidMonth(p.mes) ? p.mes : '';
  const status = p.status ?? '';

  const [charges, units] = await Promise.all([listCharges({ ym, status, unitId, today }), listUnits(today, true)]);
  const sum = (f: (c: (typeof charges)[number]) => boolean) => charges.filter(f).reduce((a, c) => a + c.total_cents, 0);
  const late = sum((c) => c.status === 'aberta' && c.due_date < today);
  const upcoming = sum((c) => c.status === 'aberta' && c.due_date >= today);
  const paid = charges.filter((c) => c.status === 'paga').reduce((a, c) => a + (c.paid_cents ?? c.total_cents), 0);

  return (
    <>
      <PageHeader title="Cobranças" subtitle={ym ? `Competência de ${fmtMonth(ym)}.` : 'Todas as competências.'}>
        {canWrite(user.role) && <Link href="/cobrancas/gerar" className={btnCls('primary')}>Gerar cobranças</Link>}
      </PageHeader>

      <FilterBar>
        <Field label="Mês de competência">
          <Input name="mes" type="month" placeholder="AAAA-MM" defaultValue={ym} />
        </Field>
        <Field label="Situação">
          <Select name="status" defaultValue={status}>
            <option value="">Todas</option>
            <option value="atrasada">Em atraso</option>
            <option value="a_vencer">A vencer</option>
            <option value="paga">Pagas</option>
            <option value="cancelada">Canceladas</option>
          </Select>
        </Field>
        <Field label="Unidade">
          <Select name="unidade" defaultValue={unitId ?? ''}>
            <option value="">Todas</option>
            {units.map((u) => <option key={u.id} value={u.id}>{u.identifier}{u.block ? ` (${u.block})` : ''}</option>)}
          </Select>
        </Field>
      </FilterBar>

      {charges.length ? (
        <>
          <dl className="mb-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div><dt className="inline text-tinta-3">Em atraso: </dt><dd className="tnum inline font-semibold text-atraso-esc">{fmtMoney(late)}</dd></div>
            <div><dt className="inline text-tinta-3">A vencer: </dt><dd className="tnum inline font-semibold">{fmtMoney(upcoming)}</dd></div>
            <div><dt className="inline text-tinta-3">Recebido: </dt><dd className="tnum inline font-semibold text-ok-esc">{fmtMoney(paid)}</dd></div>
          </dl>
          <div className={table.wrap}>
            <table className={table.root}>
              <thead>
                <tr>
                  <th className={table.th}>Unidade</th>
                  <th className={table.th}>Cobrança</th>
                  <th className={table.th}>Vencimento</th>
                  <th className={table.th + ' text-right'}>Valor</th>
                  <th className={table.th}>Situação</th>
                  <th className={table.th}><span className="sr-only">Abrir</span></th>
                </tr>
              </thead>
              <tbody>
                {charges.map((c) => {
                  const s = chargeSituation(c.status, c.due_date, today);
                  return (
                    <tr key={c.id}>
                      <td className={table.td}>
                        <UnitPlate>{c.identifier}</UnitPlate>
                        <div className="mt-1 text-xs text-tinta-3">{c.owner_name}</div>
                      </td>
                      <td className={table.td}>{c.description}</td>
                      <td className={table.td + ' whitespace-nowrap'}>{fmtDate(c.due_date)}</td>
                      <td className={table.td + ' ' + table.num}>{fmtMoney(c.status === 'paga' ? (c.paid_cents ?? c.total_cents) : c.total_cents)}</td>
                      <td className={table.td}>
                        <Badge tone={s === 'paga' ? 'ok' : s === 'atrasada' ? 'bad' : s === 'aberta' ? 'info' : 'neutral'}>{SITUATION_LABEL[s]}</Badge>
                        {c.paid_at && <div className="mt-1 text-xs text-tinta-3">em {fmtDate(c.paid_at)}</div>}
                      </td>
                      <td className={table.td}><Link href={`/cobrancas/${c.id}`} className="text-sm font-semibold text-petroleo underline">Abrir</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {charges.length >= 400 && <p className="mt-3 text-sm text-tinta-3">Mostrando as 400 primeiras. Use os filtros para refinar.</p>}
        </>
      ) : (
        <Empty title="Nenhuma cobrança encontrada">
          {canWrite(user.role) ? (
            <>Ajuste os filtros ou <Link href="/cobrancas/gerar" className="font-semibold underline">gere as cobranças do mês</Link>.</>
          ) : (
            'Ajuste os filtros para ver outras cobranças.'
          )}
        </Empty>
      )}
    </>
  );
}
