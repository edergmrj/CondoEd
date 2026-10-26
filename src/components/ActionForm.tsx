'use client';

import { createContext, useContext, useRef, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { FormState } from '@/lib/types';
import { btnCls } from './ui';

const PendingContext = createContext(false);

/**
 * Formulário que chama uma Server Action, mostra erro/sucesso e preserva o que foi digitado
 * quando há erro de validação.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  confirm,
}: {
  action: (formData: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  confirm?: string;
}) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<FormState>();
  const [pending, start] = useTransition();

  return (
    <PendingContext.Provider value={pending}>
      <form
        ref={ref}
        className={className}
        onSubmit={(e) => {
          e.preventDefault();
          if (confirm && !window.confirm(confirm)) return;
          const data = new FormData(e.currentTarget);
          start(async () => {
            const result = await action(data);
            setState(result);
            if (result?.ok && resetOnSuccess) ref.current?.reset();
            if (result?.redirect) router.push(result.redirect);
          });
        }}
      >
        {children}
        {state?.error && (
          <p role="alert" className="mt-3 rounded-md bg-atraso-claro px-3 py-2 text-sm font-medium text-atraso-esc">
            {state.error}
          </p>
        )}
        {state?.ok && state.message && (
          <p role="status" className="mt-3 rounded-md bg-ok-claro px-3 py-2 text-sm font-medium text-ok-esc">
            {state.message}
          </p>
        )}
      </form>
    </PendingContext.Provider>
  );
}

export function SubmitButton({
  children,
  variant = 'primary',
  size = 'md',
  pendingLabel = 'Salvando...',
}: {
  children: ReactNode;
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
  pendingLabel?: string;
}) {
  const pending = useContext(PendingContext);
  return (
    <button type="submit" disabled={pending} className={btnCls(variant, size)}>
      {pending ? pendingLabel : children}
    </button>
  );
}
