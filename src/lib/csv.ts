export const csvMoney = (cents: number | null | undefined) => ((cents ?? 0) / 100).toFixed(2).replace('.', ',');

/** CSV com ponto e vírgula e BOM, que o Excel em português abre sem ajustes. */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined) => {
    let s = v == null ? '' : String(v);
    // evita que o Excel interprete texto como fórmula
    if (typeof v === 'string' && /^[=+@-]/.test(s) && !/^-?\d+(,\d+)?$/.test(s)) s = `'${s}`;
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '\uFEFF' + [headers, ...rows].map((r) => r.map(esc).join(';')).join('\r\n') + '\r\n';
}
