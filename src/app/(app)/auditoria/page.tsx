import { Empty, PageHeader, table } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { listAudit } from '@/lib/services/queries';

export const metadata = { title: 'Histórico de ações' };

const fmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });

export default async function AuditoriaPage() {
  await requireUser(['admin', 'conselho']);
  const rows = await listAudit(200);
  return (
    <>
      <PageHeader title="Histórico de ações" subtitle="As 200 ações mais recentes: quem fez o quê e quando." />
      {rows.length ? (
        <div className={table.wrap}>
          <table className={table.root + ' min-w-[38rem]'}>
            <thead>
              <tr>
                <th className={table.th}>Quando</th>
                <th className={table.th}>Quem</th>
                <th className={table.th}>Ação</th>
                <th className={table.th}>Detalhe</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className={table.td + ' whitespace-nowrap'}>{fmt.format(new Date(r.created_at))}</td>
                  <td className={table.td}>{r.user_name ?? '—'}</td>
                  <td className={table.td}>{r.action}</td>
                  <td className={table.td + ' text-tinta-2'}>{r.detail ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="Nenhuma ação registrada ainda" />
      )}
    </>
  );
}
