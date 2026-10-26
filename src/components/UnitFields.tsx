import { centsToInput } from '@/lib/money';
import type { UnitRow } from '@/lib/services/queries';
import { Field, Input, Textarea } from './ui';

/** Campos do cadastro de unidade (usado ao criar e ao editar). */
export function UnitFields({ unit }: { unit?: UnitRow | null }) {
  return (
    <>
      <Field label="Unidade" hint="Como aparece na porta: 101, Casa 12, Sala 3.">
        <Input name="identifier" required defaultValue={unit?.identifier} maxLength={40} />
      </Field>
      <Field label="Bloco ou torre (opcional)">
        <Input name="block" defaultValue={unit?.block ?? ''} maxLength={40} />
      </Field>
      <Field label="Proprietário" className="sm:col-span-2">
        <Input name="owner_name" required defaultValue={unit?.owner_name} maxLength={120} />
      </Field>
      <Field label="E-mail do proprietário">
        <Input name="owner_email" type="email" defaultValue={unit?.owner_email ?? ''} />
      </Field>
      <Field label="Telefone ou WhatsApp">
        <Input name="owner_phone" type="tel" defaultValue={unit?.owner_phone ?? ''} />
      </Field>
      <Field label="Morador (se for diferente)" className="sm:col-span-2">
        <Input name="resident_name" defaultValue={unit?.resident_name ?? ''} maxLength={120} />
      </Field>
      <Field label="Fração ideal (%)" hint="Usada para ratear a taxa. A soma de todas as unidades deve dar 100%.">
        <Input name="ideal_fraction" inputMode="decimal" placeholder="1,25" defaultValue={unit ? String(unit.ideal_fraction).replace('.', ',') : ''} />
      </Field>
      <Field label="Taxa fixa (R$, opcional)" hint="Só se esta unidade paga um valor próprio, sem rateio.">
        <Input name="fixed_fee" inputMode="decimal" placeholder="450,00" defaultValue={centsToInput(unit?.fixed_fee_cents)} />
      </Field>
      <Field label="Observações" className="sm:col-span-2">
        <Textarea name="notes" defaultValue={unit?.notes ?? ''} />
      </Field>
    </>
  );
}
