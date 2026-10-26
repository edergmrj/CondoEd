'use server';

import { act, int, str } from '@/lib/act';
import { audit } from '@/lib/audit';
import { UserError } from '@/lib/errors';
import { parseGen } from '@/lib/gen-params';
import { fmtMoney, parseMoney } from '@/lib/money';
import { cancelCharge, generateCharges, payCharge, reopenCharge } from '@/lib/services/charges';
import { WRITERS, type FormState } from '@/lib/types';

export async function generateChargesAction(fd: FormData): Promise<FormState> {
  return act(WRITERS, async (user) => {
    const input = parseGen((k) => str(fd, k));
    const r = await generateCharges(input);
    await audit(user, 'cobranca.gerada', 'charge', r.description, `${r.created} cobranças, ${fmtMoney(r.total)}`);
    return { ok: true, message: `${r.created} cobranças geradas.`, redirect: `/cobrancas?mes=${input.ym}` };
  });
}

export async function payChargeAction(fd: FormData): Promise<FormState> {
  return act(WRITERS, async (user) => {
    const id = int(fd, 'id');
    if (!id) throw new UserError('Cobrança não encontrada.');
    const optionalMoney = (k: string) => {
      const v = str(fd, k);
      if (!v) return null;
      const n = parseMoney(v);
      if (n == null) throw new UserError('Valor de multa ou juros inválido.');
      return n;
    };
    const accountId = int(fd, 'account_id');
    if (!accountId) throw new UserError('Escolha a conta que recebeu o valor.');
    const r = await payCharge(id, {
      paidAt: str(fd, 'paid_at'),
      accountId,
      fineCents: optionalMoney('fine'),
      interestCents: optionalMoney('interest'),
      userId: user.id,
    });
    await audit(user, 'cobranca.baixa', 'charge', id, `unidade ${r.identifier}, ${fmtMoney(r.paid)}`);
    return { ok: true, message: `Pagamento de ${fmtMoney(r.paid)} registrado.` };
  });
}

export async function reopenChargeAction(fd: FormData): Promise<FormState> {
  return act(WRITERS, async (user) => {
    const id = int(fd, 'id');
    if (!id) throw new UserError('Cobrança não encontrada.');
    await reopenCharge(id);
    await audit(user, 'cobranca.estorno', 'charge', id);
    return { ok: true, message: 'Pagamento estornado. A cobrança voltou a ficar em aberto.' };
  });
}

export async function cancelChargeAction(fd: FormData): Promise<FormState> {
  return act(WRITERS, async (user) => {
    const id = int(fd, 'id');
    if (!id) throw new UserError('Cobrança não encontrada.');
    await cancelCharge(id);
    await audit(user, 'cobranca.cancelada', 'charge', id);
    return { ok: true, message: 'Cobrança cancelada.' };
  });
}
