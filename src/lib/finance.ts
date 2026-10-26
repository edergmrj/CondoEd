import { daysBetween } from './dates';

export interface LateFees {
  days: number;
  fine: number;
  interest: number;
  total: number;
}

/**
 * Encargos de mora sobre uma cobrança paga (ou calculada) em `onISO`.
 * - multa: percentual único sobre o valor, se houver atraso (padrão 2%)
 * - juros: percentual ao mês, proporcional aos dias de atraso (padrão 1% a.m., pro rata die)
 */
export function lateFees(
  principalCents: number,
  dueISO: string,
  onISO: string,
  finePct: number,
  interestPct: number,
): LateFees {
  const days = daysBetween(dueISO, onISO);
  if (days <= 0) return { days: 0, fine: 0, interest: 0, total: 0 };
  const fine = Math.round((principalCents * finePct) / 100);
  const interest = Math.round(((principalCents * interestPct) / 100) * (days / 30));
  return { days, fine, interest, total: fine + interest };
}

export type Situation = 'paga' | 'cancelada' | 'atrasada' | 'aberta';

export const chargeSituation = (status: string, dueISO: string, todayISO: string): Situation =>
  status === 'paga' ? 'paga' : status === 'cancelada' ? 'cancelada' : dueISO < todayISO ? 'atrasada' : 'aberta';

export const SITUATION_LABEL: Record<Situation, string> = {
  paga: 'Paga',
  cancelada: 'Cancelada',
  atrasada: 'Em atraso',
  aberta: 'A vencer',
};
