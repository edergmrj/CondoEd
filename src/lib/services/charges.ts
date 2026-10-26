import { q, tx } from '../db';
import { UserError } from '../errors';
import { allocate, fmtPct } from '../money';
import { fmtMonth, isValidDate, isValidMonth } from '../dates';
import { lateFees } from '../finance';
import { getSettings } from './queries';

export interface GenInput {
  kind: 'ordinaria' | 'extra';
  ym: string;
  dueDate: string;
  mode: 'fracao' | 'fixo' | 'unidade';
  amountCents: number;
  reservePercent: number;
  description: string;
}
export interface PlanItem {
  description: string;
  key: 'taxa_ordinaria' | 'fundo_reserva' | 'rateio_extra';
  cents: number;
}
export interface PlanRow {
  unitId: number;
  identifier: string;
  owner: string;
  items: PlanItem[];
  total: number;
  exists: boolean;
}
export interface Plan {
  rows: PlanRow[];
  ref: string;
  description: string;
  warnings: string[];
  newCount: number;
  existingCount: number;
  zeroCount: number;
  newTotal: number;
}

const slug = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

/** Calcula (sem gravar) quanto cada unidade pagaria. Usado na pré-visualização e na geração. */
export async function planCharges(inp: GenInput): Promise<Plan> {
  if (!isValidMonth(inp.ym)) throw new UserError('Informe o mês de competência.');
  if (!isValidDate(inp.dueDate)) throw new UserError('Informe a data de vencimento.');
  if (inp.kind === 'extra' && !inp.description.trim()) throw new UserError('Descreva o rateio extra (ex.: Reforma da fachada).');
  if (inp.kind === 'extra' && inp.mode === 'unidade') throw new UserError('No rateio extra, use rateio por fração ideal ou valor fixo.');
  if (inp.mode !== 'unidade' && !(inp.amountCents > 0)) throw new UserError('Informe um valor maior que zero.');
  if (inp.reservePercent < 0 || inp.reservePercent > 100) throw new UserError('O percentual do fundo de reserva deve ficar entre 0 e 100.');

  const units = await q<{ id: number; identifier: string; owner_name: string; ideal_fraction: number; fixed_fee_cents: number | null }>(
    `select id, identifier, owner_name, ideal_fraction, fixed_fee_cents from units where active
     order by coalesce(block, ''), length(identifier), identifier`,
  );
  if (!units.length) throw new UserError('Cadastre ao menos uma unidade ativa antes de gerar cobranças.');

  const warnings: string[] = [];
  let base: number[];
  if (inp.mode === 'fracao') {
    const sum = units.reduce((a, u) => a + u.ideal_fraction, 0);
    if (sum <= 0) throw new UserError('Nenhuma unidade tem fração ideal preenchida. Preencha em Unidades ou use valor fixo.');
    if (Math.abs(sum - 100) > 0.01) {
      warnings.push(`A soma das frações ideais é ${fmtPct(sum)} (o esperado é 100%). O valor foi rateado proporcionalmente.`);
    }
    base = allocate(inp.amountCents, units.map((u) => u.ideal_fraction));
  } else if (inp.mode === 'fixo') {
    base = units.map(() => inp.amountCents);
  } else {
    base = units.map((u) => u.fixed_fee_cents ?? 0);
  }

  const description = inp.kind === 'ordinaria' ? `Taxa condominial de ${fmtMonth(inp.ym)}` : inp.description.trim();
  const ref = inp.kind === 'ordinaria' ? `ord:${inp.ym}` : `ext:${inp.ym}:${slug(description)}`;
  const existing = new Set((await q<{ unit_id: number }>('select unit_id from charges where ref = $1', [ref])).map((r) => r.unit_id));

  const rows: PlanRow[] = units.map((u, i) => {
    const items: PlanItem[] = [];
    if (inp.kind === 'ordinaria') {
      if (base[i] > 0) items.push({ description: 'Taxa condominial ordinária', key: 'taxa_ordinaria', cents: base[i] });
      const reserve = Math.round((base[i] * inp.reservePercent) / 100);
      if (reserve > 0) items.push({ description: `Fundo de reserva (${fmtPct(inp.reservePercent)})`, key: 'fundo_reserva', cents: reserve });
    } else if (base[i] > 0) {
      items.push({ description, key: 'rateio_extra', cents: base[i] });
    }
    return { unitId: u.id, identifier: u.identifier, owner: u.owner_name, items, total: items.reduce((a, x) => a + x.cents, 0), exists: existing.has(u.id) };
  });

  const fresh = rows.filter((r) => !r.exists && r.total > 0);
  if (rows.some((r) => !r.exists && r.total === 0)) {
    warnings.push('Há unidades sem valor calculado (sem fração ideal ou sem taxa fixa). Elas não receberão cobrança.');
  }
  return {
    rows,
    ref,
    description,
    warnings,
    newCount: fresh.length,
    existingCount: rows.filter((r) => r.exists).length,
    zeroCount: rows.filter((r) => !r.exists && r.total === 0).length,
    newTotal: fresh.reduce((a, r) => a + r.total, 0),
  };
}

export async function generateCharges(inp: GenInput) {
  const plan = await planCharges(inp);
  const todo = plan.rows.filter((r) => !r.exists && r.total > 0);
  if (!todo.length) throw new UserError('Não há cobranças novas para gerar: todas as unidades já receberam esta cobrança.');
  const cats = await q<{ id: number; system_key: string }>('select id, system_key from categories where system_key is not null');
  const catId = (k: string) => cats.find((c) => c.system_key === k)?.id ?? null;
  const competence = `${inp.ym}-01`;

  const created = await tx(async (c) => {
    let n = 0;
    for (const r of todo) {
      const res = await c.query(
        `insert into charges (unit_id, ref, competence, due_date, description, total_cents)
         values ($1, $2, $3, $4, $5, $6) on conflict (unit_id, ref) do nothing returning id`,
        [r.unitId, plan.ref, competence, inp.dueDate, plan.description, r.total],
      );
      if (!res.rows[0]) continue;
      n++;
      for (const it of r.items) {
        await c.query('insert into charge_items (charge_id, description, category_id, amount_cents) values ($1, $2, $3, $4)', [
          res.rows[0].id, it.description, catId(it.key), it.cents,
        ]);
      }
    }
    return n;
  });
  return { created, skipped: plan.rows.length - created, total: plan.newTotal, description: plan.description };
}

export interface PayInput {
  paidAt: string;
  accountId: number;
  /** null = calcular automaticamente pela data do pagamento */
  fineCents: number | null;
  interestCents: number | null;
  userId: number | null;
}

export async function payCharge(id: number, inp: PayInput) {
  if (!isValidDate(inp.paidAt)) throw new UserError('Informe a data do pagamento.');
  const settings = await getSettings();
  return tx(async (c) => {
    const ch = (await c.query('select * from charges where id = $1 for update', [id])).rows[0];
    if (!ch) throw new UserError('Cobrança não encontrada.');
    if (ch.status !== 'aberta') throw new UserError('Esta cobrança não está em aberto.');
    const acc = (await c.query('select id from accounts where id = $1 and active', [inp.accountId])).rows[0];
    if (!acc) throw new UserError('Escolha a conta que recebeu o valor.');

    const auto = lateFees(ch.total_cents, ch.due_date, inp.paidAt, settings.fine_percent, settings.interest_percent);
    const fine = inp.fineCents ?? auto.fine;
    const interest = inp.interestCents ?? auto.interest;
    if (fine < 0 || interest < 0) throw new UserError('Multa e juros não podem ser negativos.');

    const unit = (await c.query('select identifier from units where id = $1', [ch.unit_id])).rows[0];
    const items = (await c.query('select * from charge_items where charge_id = $1 order by id', [id])).rows;
    const reserveAcc = (await c.query("select id from accounts where kind = 'fundo_reserva' and active order by id limit 1")).rows[0]?.id as number | undefined;
    const cats = (await c.query("select id, system_key from categories where system_key in ('taxa_ordinaria','fundo_reserva','multa_juros')")).rows as { id: number; system_key: string }[];
    const byKey = (k: string) => cats.find((x) => x.system_key === k)?.id;
    const insert = `insert into transactions
      (type, description, category_id, account_id, unit_id, charge_id, amount_cents, due_date, competence, paid_at, created_by)
      values ('receita', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`;

    for (const it of items) {
      const category = it.category_id ?? byKey('taxa_ordinaria');
      if (!category) throw new UserError('Categorias padrão não encontradas. Confira o cadastro de categorias.');
      const toReserve = category === byKey('fundo_reserva') && reserveAcc;
      await c.query(insert, [
        `${it.description} — unidade ${unit.identifier}`, category, toReserve ? reserveAcc : inp.accountId,
        ch.unit_id, id, it.amount_cents, ch.due_date, ch.competence, inp.paidAt, inp.userId,
      ]);
    }
    if (fine + interest > 0) {
      const cat = byKey('multa_juros');
      if (!cat) throw new UserError('Categoria "Multas e juros de mora" não encontrada.');
      await c.query(insert, [
        `Multa e juros de mora — unidade ${unit.identifier}`, cat, inp.accountId,
        ch.unit_id, id, fine + interest, ch.due_date, ch.competence, inp.paidAt, inp.userId,
      ]);
    }
    const paid = ch.total_cents + fine + interest;
    await c.query(
      `update charges set status = 'paga', paid_at = $2, paid_cents = $3, fine_cents = $4, interest_cents = $5, account_id = $6 where id = $1`,
      [id, inp.paidAt, paid, fine, interest, inp.accountId],
    );
    return { paid, fine, interest, identifier: unit.identifier as string };
  });
}

/** Desfaz o pagamento: remove as receitas geradas e reabre a cobrança. */
export async function reopenCharge(id: number) {
  return tx(async (c) => {
    const ch = (await c.query('select status from charges where id = $1 for update', [id])).rows[0];
    if (!ch) throw new UserError('Cobrança não encontrada.');
    if (ch.status !== 'paga') throw new UserError('Só é possível estornar cobranças pagas.');
    await c.query('delete from transactions where charge_id = $1', [id]);
    await c.query(
      `update charges set status = 'aberta', paid_at = null, paid_cents = null, fine_cents = 0, interest_cents = 0, account_id = null where id = $1`,
      [id],
    );
  });
}

export async function cancelCharge(id: number) {
  const res = await q(`update charges set status = 'cancelada' where id = $1 and status = 'aberta' returning id`, [id]);
  if (!res.length) throw new UserError('Só é possível cancelar cobranças em aberto.');
}
