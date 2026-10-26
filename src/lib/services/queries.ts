import { q, one } from '../db';
import { addMonths, nextMonthStart } from '../dates';
import { lateFees } from '../finance';

// ---------- tipos ----------
export interface Settings {
  name: string;
  cnpj: string | null;
  address: string | null;
  fine_percent: number;
  interest_percent: number;
  default_due_day: number;
  reserve_percent: number;
}
export interface AccountBalance {
  id: number;
  name: string;
  kind: 'banco' | 'caixa' | 'fundo_reserva';
  active: boolean;
  opening_balance_cents: number;
  balance_cents: number;
}
export interface Category {
  id: number;
  name: string;
  type: 'receita' | 'despesa';
  system_key: string | null;
  active: boolean;
}
export interface Supplier {
  id: number;
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  active: boolean;
}
export interface UnitRow {
  id: number;
  identifier: string;
  block: string | null;
  owner_name: string;
  owner_email: string | null;
  owner_phone: string | null;
  resident_name: string | null;
  ideal_fraction: number;
  fixed_fee_cents: number | null;
  active: boolean;
  notes: string | null;
  overdue_count: number;
}
export interface ChargeRow {
  id: number;
  unit_id: number;
  ref: string;
  competence: string;
  due_date: string;
  description: string;
  total_cents: number;
  status: 'aberta' | 'paga' | 'cancelada';
  paid_at: string | null;
  paid_cents: number | null;
  fine_cents: number;
  interest_cents: number;
  account_id: number | null;
  identifier: string;
  block: string | null;
  owner_name: string;
}
export interface TxRow {
  id: number;
  type: 'receita' | 'despesa';
  description: string;
  category_id: number;
  account_id: number | null;
  supplier_id: number | null;
  unit_id: number | null;
  charge_id: number | null;
  amount_cents: number;
  due_date: string;
  competence: string;
  paid_at: string | null;
  document_ref: string | null;
  notes: string | null;
  category: string;
  account: string | null;
  supplier: string | null;
  unit: string | null;
}

const UNIT_ORDER = `coalesce(u.block, ''), length(u.identifier), u.identifier`;

// ---------- cadastros ----------
export const getSettings = async () => (await one<Settings>('select * from condo_settings where id = 1'))!;

/** Saldos por conta. `asOfExclusive` (YYYY-MM-DD) considera apenas movimentos anteriores a essa data. */
export function listAccounts(asOfExclusive?: string) {
  return q<AccountBalance>(
    `select a.id, a.name, a.kind, a.active, a.opening_balance_cents,
       a.opening_balance_cents
       + coalesce((select sum(case when t.type = 'receita' then t.amount_cents else -t.amount_cents end)
                   from transactions t
                   where t.account_id = a.id and t.paid_at is not null
                     and ($1::date is null or t.paid_at < $1::date)), 0)
       - coalesce((select sum(x.amount_cents) from transfers x
                   where x.from_account_id = a.id and ($1::date is null or x.date < $1::date)), 0)
       + coalesce((select sum(x.amount_cents) from transfers x
                   where x.to_account_id = a.id and ($1::date is null or x.date < $1::date)), 0) as balance_cents
     from accounts a
     order by a.active desc, a.id`,
    [asOfExclusive ?? null],
  );
}

export const listCategories = (onlyActive = true) =>
  q<Category>(`select id, name, type, system_key, active from categories ${onlyActive ? 'where active' : ''} order by type, name`);

export const listSuppliers = (onlyActive = true) =>
  q<Supplier>(`select * from suppliers ${onlyActive ? 'where active' : ''} order by name`);

export const listUnits = (today: string, onlyActive = false) =>
  q<UnitRow>(
    `select u.*,
       (select count(*) from charges c where c.unit_id = u.id and c.status = 'aberta' and c.due_date < $1::date) as overdue_count
     from units u ${onlyActive ? 'where u.active' : ''}
     order by ${UNIT_ORDER}`,
    [today],
  );

export const getUnit = (id: number) => one<UnitRow>('select u.*, 0 as overdue_count from units u where u.id = $1', [id]);

export const listUsers = () =>
  q<{ id: number; name: string; email: string; role: string; active: boolean; unit_id: number | null; unit: string | null; created_at: string }>(
    `select us.id, us.name, us.email, us.role, us.active, us.unit_id, u.identifier as unit,
            to_char(us.created_at at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') as created_at
     from users us left join units u on u.id = us.unit_id order by us.active desc, us.name`,
  );

export const listAudit = (limit = 200) =>
  q<{ id: number; user_name: string | null; action: string; entity: string | null; entity_id: string | null; detail: string | null; created_at: Date }>(
    'select * from audit_log order by id desc limit $1',
    [limit],
  );

export const listTransfers = (limit = 15) =>
  q<{ id: number; date: string; amount_cents: number; description: string | null; from_name: string; to_name: string }>(
    `select x.id, x.date, x.amount_cents, x.description, f.name as from_name, t.name as to_name
     from transfers x join accounts f on f.id = x.from_account_id join accounts t on t.id = x.to_account_id
     order by x.date desc, x.id desc limit $1`,
    [limit],
  );

// ---------- cobranças ----------
export interface ChargeFilter {
  ym?: string;
  status?: string;
  unitId?: number | null;
  today: string;
}

export function listCharges(f: ChargeFilter) {
  const where: string[] = [];
  const p: unknown[] = [];
  const add = (sql: string, v: unknown) => {
    p.push(v);
    where.push(sql.replace('?', `$${p.length}`));
  };
  if (f.ym) add('c.competence = ?::date', `${f.ym}-01`);
  if (f.unitId) add('c.unit_id = ?', f.unitId);
  if (f.status === 'atrasada') add("c.status = 'aberta' and c.due_date < ?::date", f.today);
  else if (f.status === 'a_vencer') add("c.status = 'aberta' and c.due_date >= ?::date", f.today);
  else if (f.status === 'paga' || f.status === 'cancelada') add('c.status = ?', f.status);
  return q<ChargeRow>(
    `select c.*, u.identifier, u.block, u.owner_name
     from charges c join units u on u.id = c.unit_id
     ${where.length ? 'where ' + where.join(' and ') : ''}
     order by c.competence desc, ${UNIT_ORDER}, c.id
     limit 400`,
    p,
  );
}

export async function getChargeDetail(id: number) {
  const c = await one<ChargeRow & { account_name: string | null }>(
    `select c.*, u.identifier, u.block, u.owner_name, a.name as account_name
     from charges c join units u on u.id = c.unit_id left join accounts a on a.id = c.account_id
     where c.id = $1`,
    [id],
  );
  if (!c) return null;
  const items = await q<{ id: number; description: string; amount_cents: number; category: string | null }>(
    `select i.id, i.description, i.amount_cents, cat.name as category
     from charge_items i left join categories cat on cat.id = i.category_id
     where i.charge_id = $1 order by i.id`,
    [id],
  );
  return { ...c, items };
}

// ---------- lançamentos ----------
export interface TxFilter {
  ym?: string;
  type?: string;
  status?: string;
  categoryId?: number | null;
  accountId?: number | null;
  today: string;
}

const TX_SELECT = `select t.*, c.name as category, a.name as account, s.name as supplier, u.identifier as unit
  from transactions t
  join categories c on c.id = t.category_id
  left join accounts a on a.id = t.account_id
  left join suppliers s on s.id = t.supplier_id
  left join units u on u.id = t.unit_id`;

export function listTransactions(f: TxFilter) {
  const where: string[] = [];
  const p: unknown[] = [];
  const add = (sql: string, ...vals: unknown[]) => {
    let s = sql;
    for (const v of vals) {
      p.push(v);
      s = s.replace('?', `$${p.length}`);
    }
    where.push(s);
  };
  if (f.ym) add('coalesce(t.paid_at, t.due_date) >= ?::date and coalesce(t.paid_at, t.due_date) < ?::date', `${f.ym}-01`, nextMonthStart(f.ym));
  if (f.type === 'receita' || f.type === 'despesa') add('t.type = ?', f.type);
  if (f.categoryId) add('t.category_id = ?', f.categoryId);
  if (f.accountId) add('t.account_id = ?', f.accountId);
  if (f.status === 'pago') where.push('t.paid_at is not null');
  else if (f.status === 'atrasado') add('t.paid_at is null and t.due_date < ?::date', f.today);
  else if (f.status === 'pendente') add('t.paid_at is null and t.due_date >= ?::date', f.today);
  return q<TxRow>(
    `${TX_SELECT} ${where.length ? 'where ' + where.join(' and ') : ''}
     order by coalesce(t.paid_at, t.due_date) desc, t.id desc limit 400`,
    p,
  );
}

export const getTransaction = (id: number) => one<TxRow>(`${TX_SELECT} where t.id = $1`, [id]);

// ---------- painel ----------
export type FacadeState = 'paga' | 'aberta' | 'atrasada' | 'sem';

export async function dashboardData(today: string) {
  const ym = today.slice(0, 7);
  const monthStart = `${ym}-01`;
  const nextStart = nextMonthStart(ym);
  const seriesStart = `${addMonths(ym, -11)}-01`;

  const [accounts, month, series, open, payables, topExpenses, facade] = await Promise.all([
    listAccounts(),
    one<{ rec: number; des: number }>(
      `select coalesce(sum(amount_cents) filter (where type = 'receita'), 0) as rec,
              coalesce(sum(amount_cents) filter (where type = 'despesa'), 0) as des
       from transactions where paid_at >= $1::date and paid_at < $2::date`,
      [monthStart, nextStart],
    ),
    q<{ ym: string; type: 'receita' | 'despesa'; total: number }>(
      `select to_char(paid_at, 'YYYY-MM') as ym, type, sum(amount_cents) as total
       from transactions where paid_at >= $1::date and paid_at < $2::date group by 1, 2`,
      [seriesStart, nextStart],
    ),
    one<{ overdue_cents: number; overdue_count: number; overdue_units: number; upcoming_cents: number; upcoming_count: number }>(
      `select coalesce(sum(total_cents) filter (where due_date < $1::date), 0) as overdue_cents,
              count(*) filter (where due_date < $1::date) as overdue_count,
              count(distinct unit_id) filter (where due_date < $1::date) as overdue_units,
              coalesce(sum(total_cents) filter (where due_date >= $1::date), 0) as upcoming_cents,
              count(*) filter (where due_date >= $1::date) as upcoming_count
       from charges where status = 'aberta'`,
      [today],
    ),
    q<{ id: number; description: string; due_date: string; amount_cents: number; supplier: string | null; category: string }>(
      `select t.id, t.description, t.due_date, t.amount_cents, s.name as supplier, c.name as category
       from transactions t join categories c on c.id = t.category_id left join suppliers s on s.id = t.supplier_id
       where t.type = 'despesa' and t.paid_at is null and t.due_date <= ($1::date + 30)
       order by t.due_date, t.id limit 8`,
      [today],
    ),
    q<{ name: string; total: number }>(
      `select c.name, sum(t.amount_cents) as total
       from transactions t join categories c on c.id = t.category_id
       where t.type = 'despesa' and t.paid_at >= $1::date and t.paid_at < $2::date
       group by c.name order by total desc limit 6`,
      [monthStart, nextStart],
    ),
    q<{ id: number; identifier: string; block: string | null; overdue: number; open: number; paid_now: number }>(
      `select u.id, u.identifier, u.block,
         count(c.id) filter (where c.status = 'aberta' and c.due_date < $1::date) as overdue,
         count(c.id) filter (where c.status = 'aberta' and c.due_date >= $1::date) as open,
         count(c.id) filter (where c.status = 'paga' and c.competence = $2::date) as paid_now
       from units u left join charges c on c.unit_id = u.id
       where u.active group by u.id order by ${UNIT_ORDER}`,
      [today, monthStart],
    ),
  ]);

  const months: { ym: string; rec: number; des: number }[] = [];
  for (let i = 11; i >= 0; i--) months.push({ ym: addMonths(ym, -i), rec: 0, des: 0 });
  for (const r of series) {
    const m = months.find((x) => x.ym === r.ym);
    if (m) r.type === 'receita' ? (m.rec = r.total) : (m.des = r.total);
  }

  const units = facade.map((u) => ({
    id: u.id,
    identifier: u.identifier,
    block: u.block,
    state: (u.overdue > 0 ? 'atrasada' : u.open > 0 ? 'aberta' : u.paid_now > 0 ? 'paga' : 'sem') as FacadeState,
  }));

  return {
    ym,
    accounts,
    totalBalance: accounts.reduce((a, x) => a + x.balance_cents, 0),
    monthIn: month?.rec ?? 0,
    monthOut: month?.des ?? 0,
    open: open!,
    payables,
    topExpenses,
    months,
    units,
  };
}

// ---------- inadimplência ----------
export interface DelinquentCharge {
  id: number;
  description: string;
  competence: string;
  due_date: string;
  total_cents: number;
  days: number;
  fine: number;
  interest: number;
}
export interface DelinquentUnit {
  unitId: number;
  identifier: string;
  block: string | null;
  owner_name: string;
  owner_phone: string | null;
  owner_email: string | null;
  charges: DelinquentCharge[];
  principal: number;
  fees: number;
  total: number;
  maxDays: number;
}

export async function delinquencyData(today: string, settings: Pick<Settings, 'fine_percent' | 'interest_percent'>) {
  const rows = await q<{
    id: number; unit_id: number; description: string; competence: string; due_date: string; total_cents: number;
    identifier: string; block: string | null; owner_name: string; owner_phone: string | null; owner_email: string | null;
  }>(
    `select c.id, c.unit_id, c.description, c.competence, c.due_date, c.total_cents,
            u.identifier, u.block, u.owner_name, u.owner_phone, u.owner_email
     from charges c join units u on u.id = c.unit_id
     where c.status = 'aberta' and c.due_date < $1::date
     order by ${UNIT_ORDER}, c.due_date`,
    [today],
  );
  const byUnit = new Map<number, DelinquentUnit>();
  const aging = { d30: 0, d60: 0, d90: 0, d90plus: 0 };
  for (const r of rows) {
    const f = lateFees(r.total_cents, r.due_date, today, settings.fine_percent, settings.interest_percent);
    let u = byUnit.get(r.unit_id);
    if (!u) {
      u = { unitId: r.unit_id, identifier: r.identifier, block: r.block, owner_name: r.owner_name, owner_phone: r.owner_phone, owner_email: r.owner_email, charges: [], principal: 0, fees: 0, total: 0, maxDays: 0 };
      byUnit.set(r.unit_id, u);
    }
    u.charges.push({ id: r.id, description: r.description, competence: r.competence, due_date: r.due_date, total_cents: r.total_cents, days: f.days, fine: f.fine, interest: f.interest });
    u.principal += r.total_cents;
    u.fees += f.total;
    u.total += r.total_cents + f.total;
    u.maxDays = Math.max(u.maxDays, f.days);
    if (f.days <= 30) aging.d30 += r.total_cents;
    else if (f.days <= 60) aging.d60 += r.total_cents;
    else if (f.days <= 90) aging.d90 += r.total_cents;
    else aging.d90plus += r.total_cents;
  }
  const units = [...byUnit.values()].sort((a, b) => b.total - a.total);
  return {
    units,
    aging,
    principal: units.reduce((a, u) => a + u.principal, 0),
    fees: units.reduce((a, u) => a + u.fees, 0),
    total: units.reduce((a, u) => a + u.total, 0),
    chargeCount: rows.length,
  };
}

// ---------- prestação de contas ----------
export async function monthlyReport(ym: string) {
  const start = `${ym}-01`;
  const next = nextMonthStart(ym);
  const [prev, byCategory, lines, accounts, payables] = await Promise.all([
    one<{ prev: number }>(
      `select (select coalesce(sum(opening_balance_cents), 0) from accounts)
            + (select coalesce(sum(case when type = 'receita' then amount_cents else -amount_cents end), 0)
               from transactions where paid_at is not null and paid_at < $1::date) as prev`,
      [start],
    ),
    q<{ id: number; name: string; type: 'receita' | 'despesa'; total: number; n: number }>(
      `select c.id, c.name, t.type, sum(t.amount_cents) as total, count(*) as n
       from transactions t join categories c on c.id = t.category_id
       where t.paid_at >= $1::date and t.paid_at < $2::date
       group by c.id, c.name, t.type order by t.type, total desc`,
      [start, next],
    ),
    q<TxRow>(`${TX_SELECT} where t.paid_at >= $1::date and t.paid_at < $2::date order by t.paid_at, t.id`, [start, next]),
    listAccounts(next),
    q<{ id: number; description: string; due_date: string; amount_cents: number; supplier: string | null }>(
      `select t.id, t.description, t.due_date, t.amount_cents, s.name as supplier
       from transactions t left join suppliers s on s.id = t.supplier_id
       where t.type = 'despesa' and t.paid_at is null and t.due_date < $1::date order by t.due_date`,
      [next],
    ),
  ]);
  const income = byCategory.filter((c) => c.type === 'receita');
  const expense = byCategory.filter((c) => c.type === 'despesa');
  const totalIn = income.reduce((a, c) => a + c.total, 0);
  const totalOut = expense.reduce((a, c) => a + c.total, 0);
  const previous = prev?.prev ?? 0;
  return { ym, previous, income, expense, totalIn, totalOut, result: totalIn - totalOut, closing: previous + totalIn - totalOut, lines, accounts, payables };
}
