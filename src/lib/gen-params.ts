import { UserError } from './errors';
import { parseDecimal, parseMoney } from './money';
import type { GenInput } from './services/charges';

/** Lê os parâmetros do formulário de geração (usado na pré-visualização via GET e na ação via POST). */
export function parseGen(get: (k: string) => string): GenInput {
  const kind = get('tipo') === 'extra' ? 'extra' : 'ordinaria';
  const rawMode = get('modo');
  const mode = rawMode === 'fixo' || rawMode === 'unidade' ? rawMode : 'fracao';
  const amount = mode === 'unidade' ? 0 : parseMoney(get('valor'));
  if (amount == null) throw new UserError('Informe o valor em reais (ex.: 12500,00).');
  const reserve = kind === 'ordinaria' ? parseDecimal(get('reserva') || '0') : 0;
  if (reserve == null) throw new UserError('Percentual do fundo de reserva inválido.');
  return { kind, ym: get('mes'), dueDate: get('vencimento'), mode, amountCents: amount, reservePercent: reserve, description: get('descricao') };
}
