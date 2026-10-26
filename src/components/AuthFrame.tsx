import type { ReactNode } from 'react';

const LIT = new Set([1, 4, 8, 9, 14, 17, 20, 22, 27, 30, 33, 38]);

export function AuthFrame({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside aria-hidden className="hidden flex-col justify-between bg-petroleo-esc p-12 lg:flex">
        <p className="font-display text-xl font-bold text-white">Financeiro do condomínio</p>
        <div className="grid max-w-md grid-cols-6 gap-2.5">
          {Array.from({ length: 42 }, (_, i) => (
            <span
              key={i}
              className={`h-12 rounded-t-lg rounded-b-[2px] border-b-4 ${LIT.has(i) ? 'border-latao bg-latao-claro' : 'border-white/20 bg-white/10'}`}
            />
          ))}
        </div>
        <p className="max-w-sm text-sm text-white/70">Taxas, despesas, caixa e prestação de contas num só lugar.</p>
      </aside>
      <main className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mb-7 mt-1.5 text-tinta-3">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
