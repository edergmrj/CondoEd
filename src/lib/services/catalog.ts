import { q } from '../db';
import { UserError } from '../errors';

export interface UnitInput {
  identifier: string;
  block: string | null;
  ownerName: string;
  ownerEmail: string | null;
  ownerPhone: string | null;
  residentName: string | null;
  idealFraction: number | null;
  fixedFeeCents: number | null;
  notes: string | null;
}

function checkUnit(i: UnitInput) {
  if (!i.identifier) throw new UserError('Informe a identificação da unidade (ex.: 101 ou Casa 12).');
  if (!i.ownerName) throw new UserError('Informe o nome do proprietário.');
  if (i.idealFraction != null && (i.idealFraction < 0 || i.idealFraction > 100)) throw new UserError('A fração ideal deve ficar entre 0 e 100.');
  if (i.fixedFeeCents != null && i.fixedFeeCents < 0) throw new UserError('A taxa fixa não pode ser negativa.');
}

const unitCols = (i: UnitInput) => [i.identifier, i.block, i.ownerName, i.ownerEmail, i.ownerPhone, i.residentName, i.idealFraction ?? 0, i.fixedFeeCents, i.notes];

export async function createUnit(i: UnitInput) {
  checkUnit(i);
  const r = await q<{ id: number }>(
    `insert into units (identifier, block, owner_name, owner_email, owner_phone, resident_name, ideal_fraction, fixed_fee_cents, notes)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
    unitCols(i),
  );
  return r[0].id;
}

export async function updateUnit(id: number, i: UnitInput) {
  checkUnit(i);
  await q(
    `update units set identifier=$1, block=$2, owner_name=$3, owner_email=$4, owner_phone=$5, resident_name=$6,
       ideal_fraction=$7, fixed_fee_cents=$8, notes=$9 where id=$10`,
    [...unitCols(i), id],
  );
}

export const setUnitActive = (id: number, active: boolean) => q('update units set active = $2 where id = $1', [id, active]);

export async function createAccount(name: string, kind: string, openingCents: number | null) {
  if (!name) throw new UserError('Informe o nome da conta.');
  if (!['banco', 'caixa', 'fundo_reserva'].includes(kind)) throw new UserError('Tipo de conta inválido.');
  await q('insert into accounts (name, kind, opening_balance_cents) values ($1, $2, $3)', [name, kind, openingCents ?? 0]);
}

export const setAccountActive = (id: number, active: boolean) => q('update accounts set active = $2 where id = $1', [id, active]);

export async function createCategory(name: string, type: string) {
  if (!name) throw new UserError('Informe o nome da categoria.');
  if (type !== 'receita' && type !== 'despesa') throw new UserError('Escolha se a categoria é de receita ou despesa.');
  await q('insert into categories (name, type) values ($1, $2)', [name, type]);
}

export async function setCategoryActive(id: number, active: boolean) {
  const r = await q('update categories set active = $2 where id = $1 and (system_key is null or $2) returning id', [id, active]);
  if (!r.length) throw new UserError('Categorias padrão do sistema não podem ser desativadas.');
}

export async function createSupplier(name: string, document: string | null, phone: string | null, email: string | null) {
  if (!name) throw new UserError('Informe o nome do fornecedor.');
  await q('insert into suppliers (name, document, phone, email) values ($1, $2, $3, $4)', [name, document, phone, email]);
}

export const setSupplierActive = (id: number, active: boolean) => q('update suppliers set active = $2 where id = $1', [id, active]);
