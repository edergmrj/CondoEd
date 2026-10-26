import Link from 'next/link';
import { Badge, Empty, PageHeader, UnitPlate, table } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { fmtDate, todayISO } from '@/lib/dates';
import { chargeSituation, lateFees, SITUATION_LABEL } from '@/lib/finance';
import { fmtMoney } from '@/lib/money';
import { getSettings, getUnit, listCharges } from '@/lib/services/queries';

export const metadata = { title: 'Minhas cobranças' };

export default async function MinhasCobrancasPage() {
  const user = await requireUser(['morador']);
  const today = todayISO();
  if (!user.unitId) {
    return (
      <>
        <PageHeader title="Minhas cobranças" />
        <Empty title="Seu acesso ainda não está ligado a uma unidade">Peça ao síndico para vincular o seu usuário à sua unidade.</Empty>
      </>
    );
  }
  const [unit, charges, settings] = await Promise.all([getUnit(user.unitId), listCharges({ today, unitId: user.unitId }), getSettings()]);
  const visible = charges.filter((c) => c.status !== 'cancelada');
  const open = visible.filter((c) => c.status === 'aberta');
  const owed = open.reduce((a, c) => a + c.total_cents + lateFees(c.total_cents, c.due_date, today, settings.fine_percent, settings.interest_percent).total, 0);

  return (
    <>
      <PageHeader title="Minhas cobranças" subtitle={unit ? <>Unidade <UnitPlate>{unit.identifier}</UnitPlate> {unit.block}</> : undefined} />
      <p className="mb-5 text-lg">
        {open.length ? <>Em aberto hoje, com encargos: <strong className="tnum font-display text-2xl">{fmtMoney(owed)}</strong></> : 'Você não tem cobranças em aberto.'}
      </p>
      {visible.length ? (
        <div className={table.wrap}>
          <table className={table.root}>
            <thead>
              <tr>
                <th className={table.th}>Cobrança</th>
                <th className={table.th}>Vencimento</th>
                <th className={table.th + ' text-right'}>Valor</th>
                <th className={table.th}>Situação</th>
                <th className={table.th}><span className="sr-only">Abrir</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => {
                const s = chargeSituation(c.status, c.due_date, today);
                return (
                  <tr key={c.id}>
                    <td className={table.td}>{c.description}</td>
                    <td className={table.td + ' whitespace-nowrap'}>{fmtDate(c.due_date)}</td>
                    <td className={table.td + ' ' + table.num}>{fmtMoney(c.status === 'paga' ? (c.paid_cents ?? c.total_cents) : c.total_cents)}</td>
                    <td className={table.td}>
                      <Badge tone={s === 'paga' ? 'ok' : s === 'atrasada' ? 'bad' : 'info'}>{SITUATION_LABEL[s]}</Badge>
                      {c.paid_at && <div className="mt-1 text-xs text-tinta-3">em {fmtDate(c.paid_at)}</div>}
                    </td>
                    <td className={table.td}><Link href={`/cobrancas/${c.id}`} className="text-sm font-semibold text-petroleo underline">Detalhes</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="Nenhuma cobrança gerada para a sua unidade" />
      )}
      <p className="mt-6 text-sm text-tinta-3">Para pagar, siga a forma de pagamento informada pela administração do condomínio. Dúvidas sobre valores: fale com o síndico.</p>
    </>
  );
}
