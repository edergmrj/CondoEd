import { getCurrentUser } from '@/lib/auth';
import { csvMoney, toCsv } from '@/lib/csv';
import { fmtDate, isValidMonth, todayISO } from '@/lib/dates';
import { toId } from '@/lib/params';
import { delinquencyData, getSettings, listCharges, listTransactions, monthlyReport } from '@/lib/services/queries';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role === 'morador') return new Response('Não autorizado', { status: 401 });

  const sp = new URL(req.url).searchParams;
  const tipo = sp.get('tipo');
  const today = todayISO();
  const mes = sp.get('mes');
  const ym = isValidMonth(mes) ? mes : '';
  let name = 'exportacao';
  let body = '';

  if (tipo === 'prestacao') {
    const month = ym || today.slice(0, 7);
    const r = await monthlyReport(month);
    name = `prestacao-de-contas-${month}`;
    body = toCsv(
      ['Data', 'Tipo', 'Descrição', 'Categoria', 'Conta', 'Unidade', 'Fornecedor', 'Documento', 'Entrada', 'Saída'],
      r.lines.map((t) => [fmtDate(t.paid_at), t.type, t.description, t.category, t.account, t.unit, t.supplier, t.document_ref, t.type === 'receita' ? csvMoney(t.amount_cents) : '', t.type === 'despesa' ? csvMoney(t.amount_cents) : '']),
    );
  } else if (tipo === 'lancamentos') {
    const rows = await listTransactions({ ym, type: sp.get('tipo_lanc') ?? undefined, status: sp.get('status') ?? undefined, categoryId: toId(sp.get('categoria')), accountId: toId(sp.get('conta')), today });
    name = `lancamentos${ym ? '-' + ym : ''}`;
    body = toCsv(
      ['Data', 'Situação', 'Tipo', 'Descrição', 'Categoria', 'Conta', 'Fornecedor', 'Unidade', 'Documento', 'Valor'],
      rows.map((t) => [fmtDate(t.paid_at ?? t.due_date), t.paid_at ? 'Pago' : t.due_date < today ? 'Vencido' : 'A vencer', t.type, t.description, t.category, t.account, t.supplier, t.unit, t.document_ref, csvMoney(t.type === 'despesa' ? -t.amount_cents : t.amount_cents)]),
    );
  } else if (tipo === 'cobrancas') {
    const rows = await listCharges({ ym, status: sp.get('status') ?? undefined, unitId: toId(sp.get('unidade')), today });
    name = `cobrancas${ym ? '-' + ym : ''}`;
    body = toCsv(
      ['Unidade', 'Bloco', 'Proprietário', 'Cobrança', 'Competência', 'Vencimento', 'Valor', 'Situação', 'Pago em', 'Total pago'],
      rows.map((c) => [c.identifier, c.block, c.owner_name, c.description, c.competence.slice(0, 7), fmtDate(c.due_date), csvMoney(c.total_cents), c.status === 'aberta' && c.due_date < today ? 'atrasada' : c.status, fmtDate(c.paid_at), c.paid_cents != null ? csvMoney(c.paid_cents) : '']),
    );
  } else if (tipo === 'inadimplencia') {
    const settings = await getSettings();
    const d = await delinquencyData(today, settings);
    name = `inadimplencia-${today}`;
    body = toCsv(
      ['Unidade', 'Bloco', 'Proprietário', 'Telefone', 'E-mail', 'Cobrança', 'Vencimento', 'Dias de atraso', 'Valor', 'Multa', 'Juros', 'Total atualizado'],
      d.units.flatMap((u) => u.charges.map((c) => [u.identifier, u.block, u.owner_name, u.owner_phone, u.owner_email, c.description, fmtDate(c.due_date), c.days, csvMoney(c.total_cents), csvMoney(c.fine), csvMoney(c.interest), csvMoney(c.total_cents + c.fine + c.interest)])),
    );
  } else {
    return new Response('Tipo de exportação inválido', { status: 400 });
  }

  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
