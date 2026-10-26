export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Lê os parâmetros da URL como texto simples (primeiro valor de cada chave). */
export async function readParams(p: SearchParams): Promise<Record<string, string | undefined>> {
  const raw = await p;
  const out: Record<string, string | undefined> = {};
  for (const k of Object.keys(raw)) {
    const v = raw[k];
    out[k] = Array.isArray(v) ? v[0] : v;
  }
  return out;
}

export const toId = (v: string | undefined | null): number | null => {
  const n = Number(v);
  return v && Number.isInteger(n) && n > 0 ? n : null;
};
