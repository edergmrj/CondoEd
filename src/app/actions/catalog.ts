'use server';

import { act, int, opt, str } from '@/lib/act';
import { audit } from '@/lib/audit';
import { UserError } from '@/lib/errors';
import { parseMoney } from '@/lib/money';
import { createAccount, createCategory, createSupplier, setAccountActive, setCategoryActive, setSupplierActive } from '@/lib/services/catalog';
import { WRITERS, type FormState } from '@/lib/types';

const idOf = (fd: FormData) => {
  const id = int(fd, 'id');
  if (!id) throw new UserError('Registro não encontrado.');
  return id;
};

export async function createAccountAction(fd: FormData): Promise<FormState> {
  return act(WRITERS, async (user) => {
    const opening = opt(fd, 'opening');
    const cents = opening ? parseMoney(opening) : 0;
    if (cents == null) throw new UserError('Saldo inicial inválido. Use o formato 1.234,56.');
    await createAccount(str(fd, 'name'), str(fd, 'kind'), cents);
    await audit(user, 'conta.criada', 'account', undefined, str(fd, 'name'));
    return { ok: true, message: 'Conta criada.' };
  });
}

export async function toggleAccountAction(fd: FormData): Promise<FormState> {
  return act(WRITERS, async (user) => {
    const id = idOf(fd);
    await setAccountActive(id, str(fd, 'active') === '1');
    await audit(user, 'conta.alterada', 'account', id);
  });
}

export async function createCategoryAction(fd: FormData): Promise<FormState> {
  return act(WRITERS, async (user) => {
    await createCategory(str(fd, 'name'), str(fd, 'type'));
    await audit(user, 'categoria.criada', 'category', undefined, str(fd, 'name'));
    return { ok: true, message: 'Categoria criada.' };
  });
}

export async function toggleCategoryAction(fd: FormData): Promise<FormState> {
  return act(WRITERS, async (user) => {
    const id = idOf(fd);
    await setCategoryActive(id, str(fd, 'active') === '1');
    await audit(user, 'categoria.alterada', 'category', id);
  });
}

export async function createSupplierAction(fd: FormData): Promise<FormState> {
  return act(WRITERS, async (user) => {
    await createSupplier(str(fd, 'name'), opt(fd, 'document'), opt(fd, 'phone'), opt(fd, 'email'));
    await audit(user, 'fornecedor.criado', 'supplier', undefined, str(fd, 'name'));
    return { ok: true, message: 'Fornecedor cadastrado.' };
  });
}

export async function toggleSupplierAction(fd: FormData): Promise<FormState> {
  return act(WRITERS, async (user) => {
    const id = idOf(fd);
    await setSupplierActive(id, str(fd, 'active') === '1');
    await audit(user, 'fornecedor.alterado', 'supplier', id);
  });
}
