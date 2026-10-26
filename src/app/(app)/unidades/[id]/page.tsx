import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm, SubmitButton } from '@/components/ActionForm';
import { UnitFields } from '@/components/UnitFields';
import { Panel, PageHeader, Section, UnitPlate, table, Badge } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { fmtDate, todayISO } from '@/lib/dates';
import { chargeSituation, SITUATION_LABEL } from '@/lib/finance';
import { fmtMoney } from '@/lib/money';
import { toId } from '@/lib/params';
import { getUnit, listCharges } from '@/lib/services/queries';
import { STAFF, canWrite } from '@/lib/types';
import { updateUnitAction } from '../../../actions/units';

export const metadata = { title: 'Editar unidade' };

export default async function EditUnitPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(STAFF);
  const id = toId((await params).id);
  const unit = id ? await getUnit(id) : null;
  if (!unit) notFound();
  const today = todayISO();
  const charges = (await listCharges({ today, unitId: unit.id })).slice(0, 12);

  return (
    <>
      <PageHeader title={`Unidade ${unit.identifier}`} subtitle={unit.owner_name}>
        <Link href="/unidades" className="text-sm font-semibold text-petroleo underline">Voltar para unidades</Link>
      </PageHeader>

      {canWrite(user.role) ? (
        <Panel>
          <ActionForm action={updateUnitAction} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={unit.id} />
            <UnitFields unit={unit} />
            <div className="sm:col-span-2">
              <SubmitButton>Salvar alterações</SubmitButton>
            </div>
          </ActionForm>
        </Panel>
      ) : (
        <Panel>
          <p>Seu perfil permite apenas consultar os dados desta unidade.</p>
        </Panel>
      )}

      <Section title="Últimas cobranças" action={<Link href={`/cobrancas?unidade=${unit.id}`} className="text-sm font-semibold text-petroleo underline">Ver todas</Link>}>
        <div className={table.wrap}>
          <table className={table.root}>
            <thead>
              <tr>
                <th className={table.th}>Cobrança</th>
                <th className={table.th}>Vencimento</th>
                <th className={table.th + ' text-right'}>Valor</th>
                <th className={table.th}>Situação</th>
              </tr>
            </thead>
            <tbody>
              {charges.map((c) => {
                const s = chargeSituation(c.status, c.due_date, today);
                return (
                  <tr key={c.id}>
                    <td className={table.td}><Link href={`/cobrancas/${c.id}`} className="font-medium hover:underline">{c.description}</Link></td>
                    <td className={table.td}>{fmtDate(c.due_date)}</td>
                    <td className={table.td + ' ' + table.num}>{fmtMoney(c.total_cents)}</td>
                    <td className={table.td}><Badge tone={s === 'paga' ? 'ok' : s === 'atrasada' ? 'bad' : s === 'aberta' ? 'info' : 'neutral'}>{SITUATION_LABEL[s]}</Badge></td>
                  </tr>
                );
              })}
              {!charges.length && (
                <tr><td colSpan={4} className={table.td + ' text-tinta-3'}>Nenhuma cobrança gerada para esta unidade.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
