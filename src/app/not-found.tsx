import Link from 'next/link';
import { btnCls } from '@/components/ui';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-5 py-20">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="mt-2 text-tinta-3">O endereço não existe ou você não tem acesso a ele.</p>
      <Link href="/" className={btnCls('primary') + ' mt-5'}>Ir para o início</Link>
    </main>
  );
}
