import { ActionForm, SubmitButton } from '@/components/ActionForm';
import { Field, Input, PageHeader, Panel } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { getSettings } from '@/lib/services/queries';
import { saveSettingsAction } from '../../actions/admin';

export const metadata = { title: 'Configurações' };

const pct = (n: number) => String(n).replace('.', ',');

export default async function ConfiguracoesPage() {
  await requireUser(['admin']);
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Configurações" subtitle="Dados do condomínio e regras de cobrança." />
      <Panel>
        <ActionForm action={saveSettingsAction} className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome do condomínio" className="sm:col-span-2"><Input name="name" required defaultValue={s.name} maxLength={120} /></Field>
          <Field label="CNPJ"><Input name="cnpj" defaultValue={s.cnpj ?? ''} inputMode="numeric" /></Field>
          <Field label="Endereço"><Input name="address" defaultValue={s.address ?? ''} /></Field>
          <Field label="Multa por atraso (%)" hint="Cobrada uma vez sobre o valor. O Código Civil prevê até 2%, salvo outra regra na convenção."><Input name="fine" required inputMode="decimal" defaultValue={pct(s.fine_percent)} /></Field>
          <Field label="Juros de mora (% ao mês)" hint="Calculados proporcionalmente aos dias de atraso. O padrão legal é 1% ao mês, salvo previsão diferente na convenção."><Input name="interest" required inputMode="decimal" defaultValue={pct(s.interest_percent)} /></Field>
          <Field label="Dia de vencimento padrão" hint="Entre 1 e 28."><Input name="due_day" type="number" min={1} max={28} required defaultValue={s.default_due_day} /></Field>
          <Field label="Fundo de reserva padrão (%)" hint="Sugerido ao gerar a taxa mensal."><Input name="reserve" required inputMode="decimal" defaultValue={pct(s.reserve_percent)} /></Field>
          <div className="sm:col-span-2"><SubmitButton>Salvar configurações</SubmitButton></div>
        </ActionForm>
      </Panel>
      <p className="mt-4 max-w-prose text-sm text-tinta-3">Confira a convenção do seu condomínio antes de alterar multa e juros. Esta ferramenta não substitui a orientação de um advogado ou contador.</p>
    </>
  );
}
