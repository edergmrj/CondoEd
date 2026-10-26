import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm, SubmitButton } from '@/components/ActionForm';
import { TransactionForm } from '@/components/TransactionForm';
import { Notice, PageHeader, Panel, Section } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { fmtDate, todayISO } from '@/lib/dates';
import { fmtMoney } from '@/lib/money';
import { toId } from '@/lib/params';
import { getTransaction, listAccounts, listCategories, listSuppliers, listUnits } from '@/lib/services/queries';
import { STAFF, canWrite } from '@/lib/types';
import { deleteTransactionAction, unpayTransactionAction, updateTransactionAction } from '../../../actions/ledger';

export const metadata = { title: 'Lançamento' };

export default async function LancamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(STAFF);
  const id = toId((await params).id);
  const t = id ? await getTransaction(id) : null;
  if (!t) notFound();
  const today = todayISO();
  const writer = canWrite(user.role);
  const fromCharge = t.charge_id != null;

  const [categories, accounts, suppliers, units] = writer && !fromCharge
    ? await Promise.all([listCategories(), listAccounts(), listSuppliers(), listUnits(today, true)])
    : [[], [], [], []];

  return (
    <>
      <PageHeader title={t.description} subtitle={`${t.type === 'receita' ? 'Receita' : 'Despesa'} de ${fmtMoney(t.amount_cents)}`}>
        <Link href="/lancamentos" className="text-sm font-semibold text-petroleo underline">Voltar</Link>
      </PageHeader>

      {fromCharge ? (
        <Notice tone="info">
          Esta receita foi gerada pelo pagamento de uma cobrança. Para corrigi-la, <Link href={`/cobrancas/${t.charge_id}`} className="font-semibold underline">abra a cobrança</Link> e estorne o pagamento.
        </Notice>
      ) : writer ? (
        <>
          <Panel>
            <TransactionForm
              action={updateTransactionAction}
              defaults={t}
              today={today}
              categories={categories}
              accounts={accounts}
              suppliers={suppliers}
              units={units}
              submitLabel="Salvar alterações"
            />
          </Panel>
          <Section>
            <div className="flex flex-wrap gap-3">
              {t.paid_at && (
                <ActionForm action={unpayTransactionAction} confirm="Desfazer a baixa? O lançamento volta a ficar pendente e sai do saldo da conta.">
                  <input type="hidden" name="id" value={t.id} />
                  <SubmitButton variant="ghost" pendingLabel="Desfazendo...">Desfazer baixa</SubmitButton>
                </ActionForm>
              )}
              <ActionForm action={deleteTransactionAction} confirm="Excluir este lançamento? Esta ação não pode ser desfeita.">
                <input type="hidden" name="id" value={t.id} />
                <SubmitButton variant="danger" pendingLabel="Excluindo...">Excluir lançamento</SubmitButton>
              </ActionForm>
            </div>
          </Section>
        </>
      ) : null}

      {(fromCharge || !writer) && (
        <Section title="Detalhes">
          <Panel>
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <div><dt className="text-sm text-tinta-3">Categoria</dt><dd className="font-medium">{t.category}</dd></div>
              <div><dt className="text-sm text-tinta-3">Conta</dt><dd className="font-medium">{t.account ?? '—'}</dd></div>
              <div><dt className="text-sm text-tinta-3">Vencimento ou data</dt><dd className="font-medium">{fmtDate(t.due_date)}</dd></div>
              <div><dt className="text-sm text-tinta-3">Pagamento</dt><dd className="font-medium">{t.paid_at ? fmtDate(t.paid_at) : 'Pendente'}</dd></div>
              <div><dt className="text-sm text-tinta-3">Fornecedor</dt><dd className="font-medium">{t.supplier ?? '—'}</dd></div>
              <div><dt className="text-sm text-tinta-3">Documento</dt><dd className="font-medium">{t.document_ref ?? '—'}</dd></div>
            </dl>
            {t.notes && <p className="mt-4 text-tinta-2">{t.notes}</p>}
          </Panel>
        </Section>
      )}
    </>
  );
}
