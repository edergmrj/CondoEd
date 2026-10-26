'use server';

import { act, int, opt, str } from '@/lib/act';
import { audit } from '@/lib/audit';
import { UserError } from '@/lib/errors';
import { parseDecimal } from '@/lib/money';
import { createUser, setUserActive, updateSettings, updateUser } from '@/lib/services/admin';
import type { FormState } from '@/lib/types';

const ADMIN = ['admin'] as const;

export async function createUserAction(fd: FormData): Promise<FormState> {
  return act([...ADMIN], async (user) => {
    const id = await createUser({
      name: str(fd, 'name'),
      email: str(fd, 'email'),
      role: str(fd, 'role'),
      unitId: int(fd, 'unit_id'),
      password: String(fd.get('password') ?? ''),
    });
    await audit(user, 'usuario.criado', 'user', id, `${str(fd, 'email')} (${str(fd, 'role')})`);
    return { ok: true, message: 'Usuário criado. Informe a senha inicial a ele e peça que a troque em "Minha conta".' };
  });
}

export async function updateUserAction(fd: FormData): Promise<FormState> {
  return act([...ADMIN], async (user) => {
    const id = int(fd, 'id');
    if (!id) throw new UserError('Usuário não encontrado.');
    await updateUser(user.id, id, { role: str(fd, 'role'), unitId: int(fd, 'unit_id'), password: String(fd.get('password') ?? '') || null });
    await audit(user, 'usuario.editado', 'user', id, str(fd, 'role'));
    return { ok: true, message: 'Usuário atualizado.' };
  });
}

export async function toggleUserAction(fd: FormData): Promise<FormState> {
  return act([...ADMIN], async (user) => {
    const id = int(fd, 'id');
    if (!id) throw new UserError('Usuário não encontrado.');
    const active = str(fd, 'active') === '1';
    await setUserActive(user.id, id, active);
    await audit(user, active ? 'usuario.ativado' : 'usuario.desativado', 'user', id);
  });
}

export async function saveSettingsAction(fd: FormData): Promise<FormState> {
  return act([...ADMIN], async (user) => {
    const pct = (k: string, label: string) => {
      const n = parseDecimal(str(fd, k));
      if (n == null) throw new UserError(`${label}: informe um número (ex.: 2 ou 2,5).`);
      return n;
    };
    await updateSettings({
      name: str(fd, 'name'),
      cnpj: opt(fd, 'cnpj'),
      address: opt(fd, 'address'),
      finePercent: pct('fine', 'Multa'),
      interestPercent: pct('interest', 'Juros'),
      dueDay: int(fd, 'due_day'),
      reservePercent: pct('reserve', 'Fundo de reserva'),
    });
    await audit(user, 'configuracoes.salvas', 'condominio', 1);
    return { ok: true, message: 'Configurações salvas.' };
  });
}
