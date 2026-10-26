import { centsToInput } from '@/lib/money';
import type { AccountBalance, Category, Supplier, TxRow, UnitRow } from '@/lib/services/queries';
import type { FormState } from '@/lib/types';
import { ActionForm, SubmitButton } from './ActionForm';
import { Field, Input, Select, Textarea } from './ui';

export interface TxDefaults extends Partial<Omit<TxRow, 'amount_cents'>> {
  amount_cents?: number;
}

/** Formulário de receita/despesa (criação e edição). */
export function TransactionForm({
  action,
  defaults,
  today,
  categories,
  accounts,
  suppliers,
  units,
  submitLabel,
}: {
  action: (fd: FormData) => Promise<FormState>;
  defaults: TxDefaults;
  today: string;
  categories: Category[];
  accounts: AccountBalance[];
  suppliers: Supplier[];
  units: UnitRow[];
  submitLabel: string;
}) {
  const d = defaults;
  const paid = !!d.paid_at;
  return (
    <ActionForm action={action} className="grid gap-4 sm:grid-cols-2">
      {d.id && <input type="hidden" name="id" value={d.id} />}
      <Field label="Tipo">
        <Select name="type" defaultValue={d.type ?? 'despesa'} required>
          <option value="despesa">Despesa (saída)</option>
          <option value="receita">Receita (entrada)</option>
        </Select>
      </Field>
      <Field label="Valor (R$)">
        <Input name="amount" inputMode="decimal" required placeholder="0,00" defaultValue={centsToInput(d.amount_cents)} />
      </Field>
      <Field label="Descrição" className="sm:col-span-2">
        <Input name="description" required maxLength={160} defaultValue={d.description} placeholder="Ex.: Conta de energia das áreas comuns" />
      </Field>
      <Field label="Categoria" hint="Escolha uma categoria do mesmo tipo do lançamento.">
        <Select name="category_id" required defaultValue={d.category_id ?? ''}>
          <option value="" disabled>Selecione...</option>
          <optgroup label="Despesas">
            {categories.filter((c) => c.type === 'despesa').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </optgroup>
          <optgroup label="Receitas">
            {categories.filter((c) => c.type === 'receita').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </optgroup>
        </Select>
      </Field>
      <Field label="Fornecedor (opcional)">
        <Select name="supplier_id" defaultValue={d.supplier_id ?? ''}>
          <option value="">Nenhum</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </Field>
      <Field label="Vencimento ou data da operação">
        <Input name="due_date" type="date" required defaultValue={d.due_date ?? today} />
      </Field>
      <Field label="Mês de competência" hint="Deixe em branco para usar o mês da data ao lado.">
        <Input name="competence" type="month" placeholder="AAAA-MM" defaultValue={d.competence ? d.competence.slice(0, 7) : ''} />
      </Field>
      <Field label="Unidade (opcional)" hint="Para receitas de uma unidade específica, como aluguel do salão.">
        <Select name="unit_id" defaultValue={d.unit_id ?? ''}>
          <option value="">Nenhuma</option>
          {units.map((u) => <option key={u.id} value={u.id}>{u.identifier}{u.block ? ` (${u.block})` : ''}</option>)}
        </Select>
      </Field>
      <Field label="Nº do documento (opcional)" hint="Nota fiscal, recibo ou boleto.">
        <Input name="document_ref" defaultValue={d.document_ref ?? ''} maxLength={60} />
      </Field>

      <fieldset className="rounded-md border border-linha p-4 sm:col-span-2">
        <legend className="px-1 text-sm font-semibold text-tinta-2">Pagamento</legend>
        <label className="mb-3 flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="paid" defaultChecked={paid} className="h-4 w-4 accent-petroleo" />
          Já foi pago ou recebido
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Data do pagamento" hint="Se marcado e em branco, vale a data acima.">
            <Input name="paid_at" type="date" defaultValue={d.paid_at ?? ''} />
          </Field>
          <Field label="Conta" hint="Obrigatória quando já foi pago.">
            <Select name="account_id" defaultValue={d.account_id ?? ''}>
              <option value="">Selecione...</option>
              {accounts.filter((a) => a.active).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
        </div>
      </fieldset>

      <Field label="Observações" className="sm:col-span-2">
        <Textarea name="notes" defaultValue={d.notes ?? ''} />
      </Field>
      <div className="sm:col-span-2">
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
