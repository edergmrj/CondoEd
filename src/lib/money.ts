const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formata centavos como "R$ 1.234,56". */
export const fmtMoney = (cents: number | null | undefined) => BRL.format((cents ?? 0) / 100);

/** Formata centavos como número compacto para eixos de gráfico. */
export const fmtCompact = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(cents / 100);

export const fmtPct = (n: number, digits = 2) =>
  `${n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: digits })}%`;

/** Centavos -> texto para campos de formulário ("1234,56"). */
export const centsToInput = (cents: number | null | undefined) =>
  cents == null ? '' : (cents / 100).toFixed(2).replace('.', ',');

/**
 * Converte texto digitado em centavos, sem usar ponto flutuante.
 * Aceita "1.234,56", "1234,56", "1234.56", "R$ 10", "0,5". Retorna null se inválido.
 */
export function parseMoney(input: string | null | undefined): number | null {
  if (input == null) return null;
  let s = String(input).replace(/R\$|\s/g, '');
  if (!s) return null;
  let neg = false;
  if (s.startsWith('-')) {
    neg = true;
    s = s.slice(1);
  }
  if (!/^[\d.,]+$/.test(s)) return null;
  const sep = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'));
  let intPart = s;
  let decPart = '';
  if (sep >= 0) {
    const after = s.slice(sep + 1);
    // vírgula sempre é decimal; ponto só é decimal se tiver até 2 dígitos depois
    if (s[sep] === ',' || after.length <= 2) {
      intPart = s.slice(0, sep);
      decPart = after;
    }
  }
  intPart = intPart.replace(/[.,]/g, '');
  if (!/^\d*$/.test(intPart) || !/^\d*$/.test(decPart) || decPart.length > 2) return null;
  if (intPart === '' && decPart === '') return null;
  const cents = Number(intPart || '0') * 100 + Number((decPart + '00').slice(0, 2));
  return neg ? -cents : cents;
}

/** Número decimal em formato brasileiro ("1,25") ou internacional ("1.25"). */
export function parseDecimal(input: string | null | undefined): number | null {
  if (input == null) return null;
  let s = String(input).replace(/\s|%/g, '');
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Rateia `totalCents` proporcionalmente aos pesos, sem perder nem sobrar centavos
 * (método do maior resto). Se todos os pesos forem zero, divide igualmente.
 */
export function allocate(totalCents: number, weights: number[]): number[] {
  if (weights.length === 0) return [];
  let w = weights.map((x) => (x > 0 ? x : 0));
  let sum = w.reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    w = weights.map(() => 1);
    sum = w.length;
  }
  const raw = w.map((x) => (totalCents * x) / sum);
  const out = raw.map((r) => Math.floor(r));
  let rest = totalCents - out.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; rest > 0; k = (k + 1) % order.length, rest--) out[order[k].i]++;
  for (let k = 0; rest < 0; k = (k + 1) % order.length) {
    const i = order[order.length - 1 - k].i;
    if (out[i] > 0) {
      out[i]--;
      rest++;
    }
  }
  return out;
}
