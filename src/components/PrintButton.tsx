'use client';

import { Printer } from 'lucide-react';
import { btnCls } from './ui';

export function PrintButton({ label = 'Imprimir' }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={btnCls('ghost')}>
      <Printer size={16} aria-hidden /> {label}
    </button>
  );
}
