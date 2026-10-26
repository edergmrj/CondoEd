import Link from 'next/link';
import { TransactionForm } from '@/components/TransactionForm';
import { PageHeader, Panel } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { todayISO } from '@/lib/dates';
import { readParams, type SearchParams } from '@/lib/params';
import { listAccounts, listCategories, listSuppliers, listUnits } from '@/lib/services/queries';
import { WRITERS } from '@/lib/types';
import { createTransactionAction } from '../../../actions/ledger';

export const metadata = { title: 'Novo lançamento' };

export default async function NovoLancamentoPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser(WRITERS);
  const p = await readParams(searchParams);
  const today = todayISO();
  const [categories, accounts, suppliers, units] = await Promise.all([listCategories(), listAccounts(), listSuppliers(), listUnits(today, true)]);
  const type = p.tipo === 'receita' ? 'receita' : 'despesa';
  return (
    <>
      <PageHeader title={type === 'receita' ? 'Nova receita' : 'Nova despesa'} subtitle="Taxas condominiais entram automaticamente quando você dá baixa em uma cobrança.">
        <Link href="/lancamentos" className="text-sm font-semibold text-petroleo underline">Voltar</Link>
      </PageHeader>
      <Panel>
        <TransactionForm
          action={createTransactionAction}
          defaults={{ type }}
          today={today}
          categories={categories}
          accounts={accounts}
          suppliers={suppliers}
          units={units}
          submitLabel="Salvar lançamento"
        />
      </Panel>
    </>
  );
}
