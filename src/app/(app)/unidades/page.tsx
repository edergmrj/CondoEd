import Link from 'next/link';
import { ActionForm, SubmitButton } from '@/components/ActionForm';
import { UnitFields } from '@/components/UnitFields';
import { Badge, Empty, Notice, PageHeader, UnitPlate, table } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { todayISO } from '@/lib/dates';
import { fmtMoney, fmtPct } from '@/lib/money';
import { listUnits } from '@/lib/services/queries';
import { STAFF, canWrite } from '@/lib/types';
import { createUnitAction, toggleUnitAction } from '../../actions/units';

export const metadata = { title: 'Unidades' };

export default async function UnidadesPage() {
  const user = await requireUser(STAFF);
  const writer = canWrite(user.role);
  const units = await listUnits(todayISO());
  const active = units.filter((u) => u.active);
  const sum = active.reduce((a, u) => a + u.ideal_fraction, 0);
  const sumOk = Math.abs(sum - 100) <= 0.01;

  return (
    <>
      <PageHeader title="Unidades" subtitle={`${active.length} ${active.length === 1 ? 'unidade ativa' : 'unidades ativas'}.`} />

      {writer && (
        <details className="mb-6 rounded-md border border-linha bg-folha">
          <summary className="px-4 py-3 font-semibold">Cadastrar unidade</summary>
          <div className="border-t border-linha p-4 sm:p-5">
            <ActionForm action={createUnitAction} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
              <UnitFields />
              <div className="sm:col-span-2">
                <SubmitButton>Cadastrar unidade</SubmitButton>
              </div>
            </ActionForm>
          </div>
        </details>
      )}

      {active.length > 0 && !sumOk && (
        <div className="mb-5">
          <Notice tone="warn">
            A soma das frações ideais das unidades ativas é <strong>{fmtPct(sum, 4)}</strong>. Para ratear a taxa corretamente, ela deve dar 100%.
          </Notice>
        </div>
      )}

      {units.length ? (
        <div className={table.wrap}>
          <table className={table.root}>
            <thead>
              <tr>
                <th className={table.th}>Unidade</th>
                <th className={table.th}>Proprietário</th>
                <th className={table.th}>Morador</th>
                <th className={table.th + ' text-right'}>Fração ideal</th>
                <th className={table.th + ' text-right'}>Taxa fixa</th>
                <th className={table.th}>Situação</th>
                <th className={table.th}><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.id} className={u.active ? '' : 'text-tinta-3'}>
                  <td className={table.td}>
                    <UnitPlate>{u.identifier}</UnitPlate>
                    {u.block && <div className="mt-1 text-xs text-tinta-3">{u.block}</div>}
                  </td>
                  <td className={table.td}>
                    <div className="font-medium">{u.owner_name}</div>
                    <div className="text-xs text-tinta-3">{[u.owner_phone, u.owner_email].filter(Boolean).join('  ')}</div>
                  </td>
                  <td className={table.td}>{u.resident_name ?? '—'}</td>
                  <td className={table.td + ' ' + table.num}>{u.ideal_fraction ? fmtPct(u.ideal_fraction, 4) : '—'}</td>
                  <td className={table.td + ' ' + table.num}>{u.fixed_fee_cents != null ? fmtMoney(u.fixed_fee_cents) : '—'}</td>
                  <td className={table.td}>
                    {!u.active ? <Badge>Inativa</Badge> : u.overdue_count > 0 ? <Badge tone="bad">Em atraso ({u.overdue_count})</Badge> : <Badge tone="ok">Em dia</Badge>}
                  </td>
                  <td className={table.td + ' whitespace-nowrap'}>
                    <div className="flex items-center gap-2">
                      <Link href={`/cobrancas?unidade=${u.id}`} className="text-sm font-semibold text-petroleo underline">Cobranças</Link>
                      {writer && (
                        <>
                          <Link href={`/unidades/${u.id}`} className="text-sm font-semibold text-petroleo underline">Editar</Link>
                          <ActionForm action={toggleUnitAction}>
                            <input type="hidden" name="id" value={u.id} />
                            <input type="hidden" name="active" value={u.active ? '0' : '1'} />
                            <SubmitButton variant="ghost" size="sm" pendingLabel="...">{u.active ? 'Desativar' : 'Reativar'}</SubmitButton>
                          </ActionForm>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="Nenhuma unidade cadastrada">Cadastre as unidades para poder gerar as taxas condominiais.</Empty>
      )}
    </>
  );
}
