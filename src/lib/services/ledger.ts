import { q, one } from '../db';
import { UserError } from '../errors';
import { isValidDate, isValidMonth } from '../dates';

export interface TxInput {
  type: 'receita' | 'despesa';
  description: string;
  categoryId: number | null;
  accountId: number | null;
  supplierId: number | null;
  unitId: number | null;
  amountCents: number | null;
  dueDate: string;
  competence: string; // YYYY-MM
  paidAt: string | null;
  documentRef: string | null;
  notes: string | null;
}

async function validate(inp: TxInput) {
  if (inp.type !== 'receita' && inp.type !== 'despesa') throw new UserError('Escolha se é receita ou despesa.');
  if (!inp.description) throw new UserError('Descreva o lançamento.');
  if (!inp.amountCents || inp.amountCents <= 0) throw new UserError('Informe um valor maior que zero.');
  if (!isValidDate(inp.dueDate)) throw new UserError('Informe a data (vencimento ou da operação).');
  if (!isValidMonth(inp.competence)) throw new UserError('Informe o mês de competência.');
  if (!inp.categoryId) throw new UserError('Escolha uma categoria.');
  const cat = await one<{ type: string }>('select type from categories where id = $1', [inp.categoryId]);
  if (!cat) throw new UserError('Categoria não encontrada.');
  if (cat.type !== inp.type) throw new UserError(`A categoria escolhida é de ${cat.type}, mas o lançamento é de ${inp.type}.`);
  if (inp.paidAt) {
    if (!isValidDate(inp.paidAt)) throw new UserError('Data de pagamento inválida.');
    if (!inp.accountId) throw new UserError('Escolha a conta usada no pagamento.');
  }
  if (inp.accountId && !(await one('select 1 from accounts where id = $1', [inp.accountId]))) throw new UserError('Conta não encontrada.');
}

const cols = (i: TxInput) => [
  i.type, i.description, i.categoryId, i.accountId, i.supplierId, i.unitId, i.amountCents,
  i.dueDate, `${i.competence}-01`, i.paidAt, i.documentRef, i.notes,
];

export async function createTransaction(inp: TxInput, userId: number) {
  await validate(inp);
  const r = await q<{ id: number }>(
    `insert into transactions
       (type, description, category_id, account_id, supplier_id, unit_id, amount_cents, due_date, competence, paid_at, document_ref, notes, created_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning id`,
    [...cols(inp), userId],
  );
  return r[0].id;
}

async function ensureManual(id: number) {
  const t = await one<{ charge_id: number | null }>('select charge_id from transactions where id = $1', [id]);
  if (!t) throw new UserError('Lançamento não encontrado.');
  if (t.charge_id) throw new UserError('Esta receita veio de uma cobrança. Para alterá-la, estorne o pagamento na própria cobrança.');
}

export async function updateTransaction(id: number, inp: TxInput) {
  await ensureManual(id);
  await validate(inp);
  await q(
    `update transactions set type=$1, description=$2, category_id=$3, account_id=$4, supplier_id=$5, unit_id=$6,
       amount_cents=$7, due_date=$8, competence=$9, paid_at=$10, document_ref=$11, notes=$12 where id=$13`,
    [...cols(inp), id],
  );
}

export async function deleteTransaction(id: number) {
  await ensureManual(id);
  await q('delete from transactions where id = $1', [id]);
}

export async function payTransaction(id: number, paidAt: string, accountId: number | null) {
  await ensureManual(id);
  if (!isValidDate(paidAt)) throw new UserError('Informe a data do pagamento.');
  if (!accountId) throw new UserError('Escolha a conta usada no pagamento.');
  const r = await q('update transactions set paid_at = $2, account_id = $3 where id = $1 and paid_at is null returning id', [id, paidAt, accountId]);
  if (!r.length) throw new UserError('Este lançamento já foi baixado.');
}

export async function unpayTransaction(id: number) {
  await ensureManual(id);
  await q('update transactions set paid_at = null where id = $1', [id]);
}

export async function createTransfer(
  inp: { fromId: number | null; toId: number | null; amountCents: number | null; date: string; description: string | null },
  userId: number,
) {
  if (!inp.fromId || !inp.toId) throw new UserError('Escolha as contas de origem e destino.');
  if (inp.fromId === inp.toId) throw new UserError('Origem e destino precisam ser contas diferentes.');
  if (!inp.amountCents || inp.amountCents <= 0) throw new UserError('Informe um valor maior que zero.');
  if (!isValidDate(inp.date)) throw new UserError('Informe a data da transferência.');
  await q(
    'insert into transfers (from_account_id, to_account_id, amount_cents, date, description, created_by) values ($1,$2,$3,$4,$5,$6)',
    [inp.fromId, inp.toId, inp.amountCents, inp.date, inp.description, userId],
  );
}
