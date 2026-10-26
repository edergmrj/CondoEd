import Link from 'next/link';
import { ActionForm, SubmitButton } from '@/components/ActionForm';
import { Empty, Field, Input, Notice, PageHeader, Panel, Select, UnitPlate, btnCls, table } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { dueDateFor, fmtMonth, isValidDate, isValidMonth, todayISO } from '@/lib/dates';
import { UserError } from '@/lib/errors';
import { parseGen } from '@/lib/gen-params';
import { fmtMoney } from '@/lib/money';
import { readParams, type SearchParams } from '@/lib/params';
import { planCharges, type Plan } from '@/lib/services/charges';
import { getSettings } from '@/lib/services/queries';
import { WRITERS } from '@/lib/types';
import { generateChargesAction } from '../../../actions/charges';

export const metadata = { title: 'Gerar cobranças' };

export default async function GerarPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser(WRITERS);
  const p = await readParams(searchParams);
  const settings = await getSettings();
  const today = todayISO();
  const ym = isValidMonth(p.mes) ? p.mes : today.slice(0, 7);
  const v = {
    tipo: p.tipo === 'extra' ? 'extra' : 'ordinaria',
    mes: ym,
    vencimento: isValidDate(p.vencimento) ? p.vencimento : dueDateFor(ym, settings.default_due_day),
    modo: p.modo === 'fixo' || p.modo === 'unidade' ? p.modo : 'fracao',
    valor: p.valor ?? '',
    reserva: p.reserva ?? String(settings.reserve_percent).replace('.', ','),
    descricao: p.descricao ?? '',
  };

  let plan: Plan | null = null;
  let error: string | null = null;
  if (p.ver === '1') {
    try {
      plan = await planCharges(parseGen((k) => (p[k] ?? '').trim()));
    } catch (e) {
      if (e instanceof UserError) error = e.message;
      else throw e;
    }
  }

  return (
    <>
      <PageHeader title="Gerar cobranças" subtitle="Calcule o valor de cada unidade, confira a prévia e só então gere as cobranças.">
        <Link href="/cobrancas" className="text-sm font-semibold text-petroleo underline">Voltar para cobranças</Link>
      </PageHeader>

      <Panel>
        <form method="get" className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="ver" value="1" />
          <Field label="Tipo de cobrança">
            <Select name="tipo" defaultValue={v.tipo}>
              <option value="ordinaria">Taxa condominial mensal</option>
              <option value="extra">Rateio extra (obra, reforma, fundo especial)</option>
            </Select>
          </Field>
          <Field label="Mês de competência">
            <Input name="mes" type="month" required placeholder="AAAA-MM" defaultValue={v.mes} />
          </Field>
          <Field label="Descrição do rateio extra" hint="Só para rateio extra. Ex.: Reforma da fachada.">
            <Input name="descricao" defaultValue={v.descricao} maxLength={120} />
          </Field>
          <Field label="Vencimento" hint={`Padrão: dia ${settings.default_due_day} do mês.`}>
            <Input name="vencimento" type="date" required defaultValue={v.vencimento} />
          </Field>
          <Field label="Como calcular">
            <Select name="modo" defaultValue={v.modo}>
              <option value="fracao">Ratear o total pela fração ideal</option>
              <option value="fixo">Mesmo valor para todas as unidades</option>
              <option value="unidade">Usar a taxa fixa cadastrada em cada unidade</option>
            </Select>
          </Field>
          <Field label="Valor (R$)" hint="No rateio, é o total a dividir entre as unidades. No valor igual, é o valor de cada unidade. Ignorado na taxa fixa por unidade.">
            <Input name="valor" inputMode="decimal" placeholder="12.500,00" defaultValue={v.valor} />
          </Field>
          <Field label="Fundo de reserva (%)" hint="Somado à taxa mensal e enviado à conta de fundo de reserva. Use 0 para não cobrar.">
            <Input name="reserva" inputMode="decimal" placeholder="0" defaultValue={v.reserva} />
          </Field>
          <div className="flex items-end">
            <button type="submit" className={btnCls('primary')}>Calcular prévia</button>
          </div>
        </form>
      </Panel>

      {error && <div className="mt-6"><Notice tone="bad">{error}</Notice></div>}

      {plan && (
        <section className="mt-8" aria-live="polite">
          <h2 className="text-lg font-semibold">Prévia: {plan.description}</h2>
          <p className="mt-1 text-tinta-2">
            {plan.newCount} {plan.newCount === 1 ? 'cobrança nova' : 'cobranças novas'}, totalizando <strong className="tnum">{fmtMoney(plan.newTotal)}</strong>.
            {plan.existingCount > 0 && ` ${plan.existingCount} ${plan.existingCount === 1 ? 'unidade já tem' : 'unidades já têm'} esta cobrança e ${plan.existingCount === 1 ? 'será ignorada' : 'serão ignoradas'}.`}
          </p>
          {plan.warnings.map((w) => <div key={w} className="mt-3"><Notice tone="warn">{w}</Notice></div>)}

          <div className={table.wrap + ' mt-4'}>
            <table className={table.root}>
              <thead>
                <tr>
                  <th className={table.th}>Unidade</th>
                  <th className={table.th}>Composição</th>
                  <th className={table.th + ' text-right'}>Total</th>
                  <th className={table.th}>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {plan.rows.map((r) => (
                  <tr key={r.unitId} className={r.exists || r.total === 0 ? 'text-tinta-3' : ''}>
                    <td className={table.td}><UnitPlate>{r.identifier}</UnitPlate> <span className="ml-1 text-xs">{r.owner}</span></td>
                    <td className={table.td}>
                      {r.items.length ? r.items.map((i) => <div key={i.key}>{i.description}: <span className="tnum">{fmtMoney(i.cents)}</span></div>) : '—'}
                    </td>
                    <td className={table.td + ' ' + table.num}>{fmtMoney(r.total)}</td>
                    <td className={table.td}>{r.exists ? 'Já existe' : r.total === 0 ? 'Sem valor' : 'Será gerada'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {plan.newCount > 0 ? (
            <ActionForm
              action={generateChargesAction}
              confirm={`Gerar ${plan.newCount} cobranças de ${fmtMoney(plan.newTotal)} no total?`}
              className="mt-5"
            >
              {(['tipo', 'mes', 'vencimento', 'modo', 'valor', 'reserva', 'descricao'] as const).map((k) => (
                <input key={k} type="hidden" name={k} value={v[k]} />
              ))}
              <SubmitButton pendingLabel="Gerando...">Gerar {plan.newCount} {plan.newCount === 1 ? 'cobrança' : 'cobranças'}</SubmitButton>
            </ActionForm>
          ) : (
            <div className="mt-5"><Empty title="Não há cobranças novas para gerar" /></div>
          )}
          <p className="mt-3 text-sm text-tinta-3">Competência: {fmtMonth(v.mes)}. Depois de geradas, as cobranças podem ser canceladas uma a uma.</p>
        </section>
      )}
    </>
  );
}
