'use client';

import { btnCls } from '@/components/ui';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-lg px-5 py-20">
      <h1 className="text-2xl font-bold">Não foi possível carregar esta tela</h1>
      <p className="mt-2 text-tinta-3">
        Pode ser uma falha momentânea de conexão com o banco de dados. Tente de novo; se continuar, confira a variável DATABASE_URL na Vercel.
      </p>
      <button type="button" onClick={reset} className={btnCls('primary') + ' mt-5'}>
        Tentar novamente
      </button>
    </main>
  );
}
