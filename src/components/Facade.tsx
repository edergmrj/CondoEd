import Link from 'next/link';
import type { FacadeState } from '@/lib/services/queries';

const TILE: Record<FacadeState, string> = {
  paga: 'bg-ok border-ok-esc text-white',
  aberta: 'bg-white border-linha-forte text-tinta ring-1 ring-inset ring-linha',
  atrasada: 'bg-atraso border-atraso-esc text-white',
  sem: 'bg-transparent border-linha text-tinta-3 ring-1 ring-inset ring-linha',
};
const LABEL: Record<FacadeState, string> = {
  paga: 'em dia, taxa do mês paga',
  aberta: 'cobrança a vencer',
  atrasada: 'com cobrança em atraso',
  sem: 'sem cobrança',
};
const LEGEND: { state: FacadeState; text: string }[] = [
  { state: 'paga', text: 'Em dia' },
  { state: 'aberta', text: 'A vencer' },
  { state: 'atrasada', text: 'Em atraso' },
  { state: 'sem', text: 'Sem cobrança' },
];

interface FacadeUnit {
  id: number;
  identifier: string;
  block: string | null;
  state: FacadeState;
}

/** A "fachada" do prédio: uma janela por unidade, colorida pela situação de pagamento. */
export function Facade({ units }: { units: FacadeUnit[] }) {
  const groups = new Map<string, FacadeUnit[]>();
  for (const u of units) {
    const key = u.block ?? '';
    groups.set(key, [...(groups.get(key) ?? []), u]);
  }
  const count = (s: FacadeState) => units.filter((u) => u.state === s).length;

  return (
    <div>
      <div className="space-y-5">
        {[...groups.entries()].map(([block, list]) => (
          <div key={block}>
            {block && <h3 className="mb-2 text-sm font-semibold text-tinta-2">{block}</h3>}
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(3.6rem,1fr))] gap-2">
              {list.map((u) => (
                <li key={u.id}>
                  <Link
                    href={`/cobrancas?unidade=${u.id}`}
                    title={`Unidade ${u.identifier}: ${LABEL[u.state]}`}
                    aria-label={`Unidade ${u.identifier}: ${LABEL[u.state]}`}
                    className={`relative flex h-14 items-center justify-center rounded-t-xl rounded-b-[2px] border-b-[5px] font-display text-[15px] font-bold transition-transform hover:-translate-y-0.5 ${TILE[u.state]}`}
                  >
                    {u.identifier}
                    {u.state === 'paga' && <span aria-hidden className="absolute right-1.5 top-0.5 text-[10px]">✓</span>}
                    {u.state === 'atrasada' && <span aria-hidden className="absolute right-1.5 top-0.5 text-[11px]">!</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-tinta-2">
        {LEGEND.map((l) => (
          <li key={l.state} className="inline-flex items-center gap-2">
            <span aria-hidden className={`h-4 w-4 rounded-t-md rounded-b-[1px] border-b-[3px] ${TILE[l.state]}`} />
            {l.text}
            <span className="tnum font-semibold text-tinta">{count(l.state)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
