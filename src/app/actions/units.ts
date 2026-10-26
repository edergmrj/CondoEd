'use server';

import { act, int, opt, str } from '@/lib/act';
import { audit } from '@/lib/audit';
import { UserError } from '@/lib/errors';
import { parseDecimal, parseMoney } from '@/lib/money';
import { createUnit, setUnitActive, updateUnit, type UnitInput } from '@/lib/services/catalog';
import { WRITERS, type FormState } from '@/lib/types';

function unitInput(fd: FormData): UnitInput {
  const fee = opt(fd, 'fixed_fee');
  const frac = opt(fd, 'ideal_fraction');
  const feeCents = fee ? parseMoney(fee) : null;
  const fraction = frac ? parseDecimal(frac) : null;
  if (fee && feeCents == null) throw new UserError('Taxa fixa inválida. Use o formato 450,00.');
  if (frac && fraction == null) throw new UserError('Fração ideal inválida. Use o formato 1,25.');
  return {
    identifier: str(fd, 'identifier'),
    block: opt(fd, 'block'),
    ownerName: str(fd, 'owner_name'),
    ownerEmail: opt(fd, 'owner_email'),
    ownerPhone: opt(fd, 'owner_phone'),
    residentName: opt(fd, 'resident_name'),
    idealFraction: fraction,
    fixedFeeCents: feeCents,
    notes: opt(fd, 'notes'),
  };
}

export async function createUnitAction(fd: FormData): Promise<FormState> {
  return act(WRITERS, async (user) => {
    const input = unitInput(fd);
    const id = await createUnit(input);
    await audit(user, 'unidade.criada', 'unit', id, input.identifier);
    return { ok: true, message: `Unidade ${input.identifier} cadastrada.` };
  });
}

export async function updateUnitAction(fd: FormData): Promise<FormState> {
  return act(WRITERS, async (user) => {
    const id = int(fd, 'id');
    if (!id) throw new UserError('Unidade não encontrada.');
    const input = unitInput(fd);
    await updateUnit(id, input);
    await audit(user, 'unidade.editada', 'unit', id, input.identifier);
    return { ok: true, redirect: '/unidades' };
  });
}

export async function toggleUnitAction(fd: FormData): Promise<FormState> {
  return act(WRITERS, async (user) => {
    const id = int(fd, 'id');
    if (!id) throw new UserError('Unidade não encontrada.');
    const active = str(fd, 'active') === '1';
    await setUnitActive(id, active);
    await audit(user, active ? 'unidade.ativada' : 'unidade.desativada', 'unit', id);
  });
}
