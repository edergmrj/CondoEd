'use server';

import { act, flag, int, opt, str } from '@/lib/act';
import { audit } from '@/lib/audit';
import { UserError } from '@/lib/errors';
import { fmtMoney, parseMoney } from '@/lib/money';
import { createTransaction, createTransfer, deleteTransaction, payTransaction, unpayTransaction, updateTransaction, type TxInput } from '@/lib/services/ledger';
import { WRITERS, type FormState } from '@/lib/types';

function txInput(fd: FormData): TxInput {
  const amount = parseMoney(str(fd, 'amount'));
  if (amount == null) throw new UserError('Valor inválido. Use o formato 1.234,56.');
  const due = str(fd, 'due_date');
  const paidAt = flag(fd, 'paid') ? str(fd, 'paid_at') || due : null;
  return {
    type: str(fd, 'type') as TxInput['type'],
    description: str(fd, 'description'),
    categoryId: int(fd, 'category_id'),
    accountId: int(fd, 'account_id'),
    supplierId: int(fd, 'supplier_id'),
    unitId: int(fd, 'unit_id'),
    amountCents: amount,
    dueDate: due,
    competence: str(fd, 'competence') || due.slice(0, 7),
    paidAt,
    documentRef: opt(fd, 'document_ref'),
    notes: opt(fd, 'notes'),
  };
}

export async function createTransactionAction(fd: FormData): Promise<FormState> {
  return act(WRITERS, async (user) => {
    const input = txInput(fd);
    const id = await createTransaction(input, user.id);
    await audit(user, `${input.type}.criada`, 'transaction', id, `${input.description} — ${fmtMoney(input.amountCents)}`);
    return { ok: true, redirect: '/lancamentos' };
  });
}

export async function updateTransactionAction(fd: FormData): Promise<FormState> {
  return act(WRITERS, async (user) => {
    const id = int(fd, 'id');
    if (!id) throw new UserError('Lançamento não encontrado.');
    const input = txInput(fd);
    await updateTransaction(id, input);
    await audit(user, `${input.type}.editada`, 'transaction', id, `${input.description} — ${fmtMoney(input.amountCents)}`);
    return { ok: true, redirect: '/lancamentos' };
  });
}

export async function deleteTransactionAction(fd: FormData): Promise<FormState> {
  return act(WRITERS, async (user) => {
    const id = int(fd, 'id');
    if (!id) throw new UserError('Lançamento não encontrado.');
    await deleteTransaction(id);
    await audit(user, 'lancamento.excluido', 'transaction', id);
    return { ok: true, redirect: '/lancamentos' };
  });
}

export async function payTransactionAction(fd: FormData): Promise<FormState> {
  return act(WRITERS, async (user) => {
    const id = int(fd, 'id');
    if (!id) throw new UserError('Lançamento não encontrado.');
    await payTransaction(id, str(fd, 'paid_at'), int(fd, 'account_id'));
    await audit(user, 'lancamento.baixa', 'transaction', id);
    return { ok: true };
  });
}

export async function unpayTransactionAction(fd: FormData): Promise<FormState> {
  return act(WRITERS, async (user) => {
    const id = int(fd, 'id');
    if (!id) throw new UserError('Lançamento não encontrado.');
    await unpayTransaction(id);
    await audit(user, 'lancamento.estorno', 'transaction', id);
    return { ok: true };
  });
}

export async function createTransferAction(fd: FormData): Promise<FormState> {
  return act(WRITERS, async (user) => {
    const amount = parseMoney(str(fd, 'amount'));
    if (amount == null) throw new UserError('Valor inválido. Use o formato 1.234,56.');
    await createTransfer({ fromId: int(fd, 'from_id'), toId: int(fd, 'to_id'), amountCents: amount, date: str(fd, 'date'), description: opt(fd, 'description') }, user.id);
    await audit(user, 'transferencia.criada', 'transfer', undefined, fmtMoney(amount));
    return { ok: true, message: 'Transferência registrada.' };
  });
}
