import { ActionForm, SubmitButton } from '@/components/ActionForm';
import { Badge, Field, Input, PageHeader, Panel, Section, Select, table } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { listCategories, listSuppliers, type Category } from '@/lib/services/queries';
import { STAFF, canWrite } from '@/lib/types';
import { createCategoryAction, createSupplierAction, toggleCategoryAction, toggleSupplierAction } from '../../actions/catalog';

export const metadata = { title: 'Categorias e fornecedores' };

export default async function CadastrosPage() {
  const user = await requireUser(STAFF);
  const writer = canWrite(user.role);
  const [categories, suppliers] = await Promise.all([listCategories(false), listSuppliers(false)]);

  const list = (title: string, items: Category[]) => (
    <div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <ul className="divide-y divide-linha rounded-md border border-linha bg-folha">
        {items.map((c) => (
          <li key={c.id} className={'flex items-center justify-between gap-3 px-3 py-2 text-sm ' + (c.active ? '' : 'text-tinta-3')}>
            <span>{c.name} {c.system_key && <Badge tone="info">Padrão</Badge>} {!c.active && <Badge>Inativa</Badge>}</span>
            {writer && !c.system_key && (
              <ActionForm action={toggleCategoryAction}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="active" value={c.active ? '0' : '1'} />
                <SubmitButton variant="ghost" size="sm" pendingLabel="...">{c.active ? 'Desativar' : 'Reativar'}</SubmitButton>
              </ActionForm>
            )}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <>
      <PageHeader title="Categorias e fornecedores" subtitle="O plano de contas e os prestadores usados nos lançamentos." />

      <Section title="Categorias">
        <div className="grid gap-8 lg:grid-cols-2">
          {list('Despesas', categories.filter((c) => c.type === 'despesa'))}
          {list('Receitas', categories.filter((c) => c.type === 'receita'))}
        </div>
        {writer && (
          <Panel className="mt-6">
            <ActionForm action={createCategoryAction} resetOnSuccess className="flex flex-wrap items-end gap-3">
              <Field label="Nova categoria"><Input name="name" required maxLength={80} placeholder="Ex.: Dedetização" /></Field>
              <Field label="Tipo">
                <Select name="type" defaultValue="despesa">
                  <option value="despesa">Despesa</option>
                  <option value="receita">Receita</option>
                </Select>
              </Field>
              <SubmitButton>Adicionar</SubmitButton>
            </ActionForm>
          </Panel>
        )}
      </Section>

      <Section title="Fornecedores">
        {suppliers.length ? (
          <div className={table.wrap}>
            <table className={table.root}>
              <thead>
                <tr>
                  <th className={table.th}>Nome</th>
                  <th className={table.th}>CNPJ ou CPF</th>
                  <th className={table.th}>Contato</th>
                  {writer && <th className={table.th}><span className="sr-only">Ações</span></th>}
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id} className={s.active ? '' : 'text-tinta-3'}>
                    <td className={table.td + ' font-medium'}>{s.name} {!s.active && <Badge>Inativo</Badge>}</td>
                    <td className={table.td}>{s.document ?? '—'}</td>
                    <td className={table.td}>{[s.phone, s.email].filter(Boolean).join('  ') || '—'}</td>
                    {writer && (
                      <td className={table.td}>
                        <ActionForm action={toggleSupplierAction}>
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="active" value={s.active ? '0' : '1'} />
                          <SubmitButton variant="ghost" size="sm" pendingLabel="...">{s.active ? 'Desativar' : 'Reativar'}</SubmitButton>
                        </ActionForm>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-tinta-3">Nenhum fornecedor cadastrado ainda.</p>
        )}
        {writer && (
          <Panel className="mt-6">
            <ActionForm action={createSupplierAction} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome do fornecedor"><Input name="name" required maxLength={120} /></Field>
              <Field label="CNPJ ou CPF (opcional)"><Input name="document" inputMode="numeric" /></Field>
              <Field label="Telefone (opcional)"><Input name="phone" type="tel" /></Field>
              <Field label="E-mail (opcional)"><Input name="email" type="email" /></Field>
              <div className="sm:col-span-2"><SubmitButton>Cadastrar fornecedor</SubmitButton></div>
            </ActionForm>
          </Panel>
        )}
      </Section>
    </>
  );
}
