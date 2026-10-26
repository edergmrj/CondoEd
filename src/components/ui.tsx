import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');

export function btnCls(variant: 'primary' | 'ghost' | 'danger' = 'primary', size: 'md' | 'sm' = 'md') {
  return cx(
    'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
    size === 'md' ? 'min-h-10 px-4 py-2 text-sm' : 'min-h-8 px-3 py-1 text-[13px]',
    variant === 'primary' && 'bg-petroleo text-white hover:bg-petroleo-esc',
    variant === 'ghost' && 'border border-linha-forte bg-folha text-tinta hover:bg-petroleo-claro',
    variant === 'danger' && 'border border-atraso/40 bg-folha text-atraso-esc hover:bg-atraso-claro',
  );
}

const fieldCls =
  'block w-full min-h-10 rounded-md border border-linha-forte bg-white px-3 py-2 text-[15px] text-tinta placeholder:text-tinta-3 focus:border-petroleo disabled:bg-reboco disabled:text-tinta-3';

export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(fieldCls, p.className)} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx(fieldCls, p.className)} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea rows={3} {...p} className={cx(fieldCls, p.className)} />
);

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1 block text-sm font-medium text-tinta-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-tinta-3">{hint}</span>}
    </label>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3 print:mb-4">
      <div className="min-w-0">
        <h1 className="text-[1.65rem] font-bold leading-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-prose text-tinta-3">{subtitle}</p>}
      </div>
      {children && <div className="no-print flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

export function Section({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('mt-9', className)}>
      {(title || action) && (
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3 border-b border-linha-forte pb-2">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export const Panel = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cx('print-sheet rounded-md border border-linha bg-folha p-4 sm:p-5', className)}>{children}</div>
);

type Tone = 'ok' | 'bad' | 'warn' | 'info' | 'neutral';
const TONES: Record<Tone, string> = {
  ok: 'bg-ok-claro text-ok-esc',
  bad: 'bg-atraso-claro text-atraso-esc',
  warn: 'bg-aviso-claro text-aviso-esc',
  info: 'bg-petroleo-claro text-petroleo-esc',
  neutral: 'bg-reboco text-tinta-2 border border-linha',
};
export const Badge = ({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) => (
  <span className={cx('inline-flex items-center whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold', TONES[tone])}>{children}</span>
);

export function Notice({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div role={tone === 'bad' ? 'alert' : 'note'} className={cx('rounded-md px-4 py-3 text-sm', TONES[tone === 'neutral' ? 'info' : tone])}>
      {children}
    </div>
  );
}

/** Placa de porta: identifica a unidade onde quer que ela apareça. */
export const UnitPlate = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex min-w-9 justify-center rounded-[3px] border border-latao bg-latao-claro px-1.5 py-0.5 font-display text-[13px] font-bold leading-snug text-tinta">
    {children}
  </span>
);

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-linha-forte px-5 py-8 text-center">
      <p className="font-display text-base font-semibold">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-md text-sm text-tinta-3">{children}</div>}
    </div>
  );
}

export const table = {
  wrap: 'overflow-x-auto',
  root: 'w-full min-w-[34rem] text-left text-sm',
  th: 'border-b-2 border-petroleo px-3 py-2 text-xs font-semibold whitespace-nowrap text-tinta-2',
  td: 'border-b border-linha px-3 py-2.5 align-top',
  num: 'text-right tnum whitespace-nowrap',
};

export function FilterBar({ children, action }: { children: ReactNode; action?: string }) {
  return (
    <form method="get" action={action} className="no-print mb-5 flex flex-wrap items-end gap-3">
      {children}
      <button type="submit" className={btnCls('ghost')}>Filtrar</button>
    </form>
  );
}
