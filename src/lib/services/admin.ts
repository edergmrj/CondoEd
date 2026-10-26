import { q, one, tx, type Tx } from '../db';
import { UserError } from '../errors';
import { hashPassword, validatePassword, verifyPassword } from '../credentials';
import type { Role } from '../types';

const RECEITAS: [string, string | null][] = [
  ['Taxa condominial ordinária', 'taxa_ordinaria'],
  ['Fundo de reserva', 'fundo_reserva'],
  ['Rateio extra', 'rateio_extra'],
  ['Multas e juros de mora', 'multa_juros'],
  ['Aluguel de salão de festas', null],
  ['Rendimentos de aplicações', null],
  ['Outras receitas', null],
];
const DESPESAS = [
  'Folha de pagamento', 'Encargos trabalhistas (INSS/FGTS)', 'Água e esgoto', 'Energia elétrica', 'Gás',
  'Manutenção e reparos', 'Elevadores', 'Limpeza e conservação', 'Portaria e segurança', 'Seguro',
  'Honorários de administração', 'Jardinagem', 'Material de limpeza', 'Impostos e taxas',
  'Obras e melhorias', 'Despesas bancárias', 'Outras despesas',
];

export async function seedDefaults(c: Tx) {
  for (const [name, key] of RECEITAS) {
    await c.query("insert into categories (name, type, system_key) values ($1, 'receita', $2) on conflict do nothing", [name, key]);
  }
  for (const name of DESPESAS) {
    await c.query("insert into categories (name, type) values ($1, 'despesa') on conflict do nothing", [name]);
  }
  await c.query(
    `insert into accounts (name, kind) values ('Conta corrente', 'banco'), ('Caixa', 'caixa'), ('Fundo de reserva', 'fundo_reserva')
     on conflict do nothing`,
  );
}

export async function hasUsers(): Promise<boolean> {
  return !!(await one('select 1 from users limit 1'));
}

export interface SetupInput {
  condoName: string;
  cnpj: string | null;
  adminName: string;
  email: string;
  password: string;
}

/** Configuração inicial: dados do condomínio, categorias/contas padrão e o primeiro usuário (síndico). */
export async function setupCondo(i: SetupInput): Promise<number> {
  if (!i.condoName) throw new UserError('Informe o nome do condomínio.');
  if (!i.adminName) throw new UserError('Informe seu nome.');
  if (!/^\S+@\S+\.\S+$/.test(i.email)) throw new UserError('Informe um e-mail válido.');
  validatePassword(i.password);
  const hash = await hashPassword(i.password);
  return tx(async (c) => {
    await c.query('select pg_advisory_xact_lock(727201)');
    if ((await c.query('select 1 from users limit 1')).rows.length) throw new UserError('A instalação já foi concluída. Entre com seu e-mail e senha.');
    await c.query('update condo_settings set name = $1, cnpj = $2 where id = 1', [i.condoName, i.cnpj]);
    await seedDefaults(c);
    const r = await c.query("insert into users (name, email, password_hash, role) values ($1, $2, $3, 'admin') returning id", [i.adminName, i.email.toLowerCase(), hash]);
    return r.rows[0].id as number;
  });
}

export interface SettingsInput {
  name: string;
  cnpj: string | null;
  address: string | null;
  finePercent: number | null;
  interestPercent: number | null;
  dueDay: number | null;
  reservePercent: number | null;
}

export async function updateSettings(i: SettingsInput) {
  if (!i.name) throw new UserError('Informe o nome do condomínio.');
  const inRange = (v: number | null, max: number) => v != null && v >= 0 && v <= max;
  if (!inRange(i.finePercent, 20)) throw new UserError('A multa deve ficar entre 0% e 20%.');
  if (!inRange(i.interestPercent, 10)) throw new UserError('Os juros ao mês devem ficar entre 0% e 10%.');
  if (!inRange(i.reservePercent, 100)) throw new UserError('O fundo de reserva deve ficar entre 0% e 100%.');
  if (i.dueDay == null || i.dueDay < 1 || i.dueDay > 28) throw new UserError('O dia de vencimento padrão deve ficar entre 1 e 28.');
  await q(
    `update condo_settings set name=$1, cnpj=$2, address=$3, fine_percent=$4, interest_percent=$5, default_due_day=$6, reserve_percent=$7 where id=1`,
    [i.name, i.cnpj, i.address, i.finePercent, i.interestPercent, i.dueDay, i.reservePercent],
  );
}

const ROLES: Role[] = ['admin', 'financeiro', 'conselho', 'morador'];

export interface NewUserInput {
  name: string;
  email: string;
  role: string;
  unitId: number | null;
  password: string;
}

export async function createUser(i: NewUserInput): Promise<number> {
  if (!i.name) throw new UserError('Informe o nome.');
  if (!/^\S+@\S+\.\S+$/.test(i.email)) throw new UserError('Informe um e-mail válido.');
  if (!ROLES.includes(i.role as Role)) throw new UserError('Escolha o perfil de acesso.');
  if (i.role === 'morador' && !i.unitId) throw new UserError('Para o perfil Morador, escolha a unidade.');
  validatePassword(i.password);
  const hash = await hashPassword(i.password);
  const r = await q<{ id: number }>(
    'insert into users (name, email, password_hash, role, unit_id) values ($1, $2, $3, $4, $5) returning id',
    [i.name, i.email.toLowerCase(), hash, i.role, i.role === 'morador' ? i.unitId : null],
  );
  return r[0].id;
}

async function otherActiveAdmins(id: number) {
  const r = await one<{ n: number }>("select count(*) as n from users where role = 'admin' and active and id <> $1", [id]);
  return r?.n ?? 0;
}

export async function updateUser(actorId: number, id: number, i: { role: string; unitId: number | null; password: string | null }) {
  if (!ROLES.includes(i.role as Role)) throw new UserError('Escolha o perfil de acesso.');
  if (i.role === 'morador' && !i.unitId) throw new UserError('Para o perfil Morador, escolha a unidade.');
  const cur = await one<{ role: string }>('select role from users where id = $1', [id]);
  if (!cur) throw new UserError('Usuário não encontrado.');
  if (cur.role === 'admin' && i.role !== 'admin' && (await otherActiveAdmins(id)) === 0) {
    throw new UserError('É preciso manter pelo menos um síndico (administrador) ativo.');
  }
  let hash: string | null = null;
  if (i.password) {
    validatePassword(i.password);
    hash = await hashPassword(i.password);
  }
  await q(
    `update users set role = $2, unit_id = $3, password_hash = coalesce($4, password_hash),
       failed_attempts = 0, locked_until = null where id = $1`,
    [id, i.role, i.role === 'morador' ? i.unitId : null, hash],
  );
}

export async function setUserActive(actorId: number, id: number, active: boolean) {
  if (!active) {
    if (id === actorId) throw new UserError('Você não pode desativar o próprio acesso.');
    const cur = await one<{ role: string }>('select role from users where id = $1', [id]);
    if (cur?.role === 'admin' && (await otherActiveAdmins(id)) === 0) throw new UserError('É preciso manter pelo menos um síndico (administrador) ativo.');
  }
  await q('update users set active = $2 where id = $1', [id, active]);
}

export async function changeOwnPassword(userId: number, current: string, next: string) {
  const u = await one<{ password_hash: string }>('select password_hash from users where id = $1', [userId]);
  if (!u || !(await verifyPassword(current, u.password_hash))) throw new UserError('A senha atual está incorreta.');
  validatePassword(next);
  await q('update users set password_hash = $2 where id = $1', [userId, await hashPassword(next)]);
}
