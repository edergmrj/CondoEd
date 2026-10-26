import { fmtCompact, fmtMoney } from '@/lib/money';

function niceMax(v: number) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

export interface BarDatum {
  label: string;
  a: number;
  b: number;
}

/** Gráfico de barras agrupadas em SVG (renderizado no servidor, sem JavaScript no navegador). */
export function BarChart({ data, aLabel, bLabel }: { data: BarDatum[]; aLabel: string; bLabel: string }) {
  const W = 640, H = 250, pl = 52, pr = 8, pt = 10, pb = 28;
  const top = niceMax(Math.max(100, ...data.flatMap((d) => [d.a, d.b])));
  const band = (W - pl - pr) / data.length;
  const bw = Math.min(15, (band - 8) / 2);
  const y = (v: number) => pt + (H - pt - pb) * (1 - v / top);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * top);

  return (
    <figure>
      <figcaption className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-tinta-2">
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-[2px] bg-petroleo" aria-hidden />{aLabel}</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-[2px] bg-latao" aria-hidden />{bLabel}</span>
      </figcaption>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${aLabel} e ${bLabel} por mês`} className="h-auto w-full min-w-[34rem]">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pl} x2={W - pr} y1={y(t)} y2={y(t)} className="stroke-linha" strokeWidth={1} />
              <text x={pl - 8} y={y(t) + 4} textAnchor="end" className="fill-tinta-3 tnum" fontSize={11}>{fmtCompact(t)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = pl + band * i + band / 2;
            return (
              <g key={d.label}>
                <rect x={cx - bw - 1} y={y(d.a)} width={bw} height={Math.max(0, y(0) - y(d.a))} rx={2} className="fill-petroleo">
                  <title>{`${d.label}: ${aLabel} ${fmtMoney(d.a)}`}</title>
                </rect>
                <rect x={cx + 1} y={y(d.b)} width={bw} height={Math.max(0, y(0) - y(d.b))} rx={2} className="fill-latao">
                  <title>{`${d.label}: ${bLabel} ${fmtMoney(d.b)}`}</title>
                </rect>
                <text x={cx} y={H - 9} textAnchor="middle" className="fill-tinta-3" fontSize={11}>{d.label}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </figure>
  );
}
