import { ConfigNotice } from '@/components/ConfigNotice';
import { Shell, type NavItem } from '@/components/Shell';
import { requireUser } from '@/lib/auth';
import { configProblem } from '@/lib/config';
import { getSettings } from '@/lib/services/queries';
import { ROLE_LABEL, type Role } from '@/lib/types';
import { logoutAction } from '../actions/auth';

function navFor(role: Role): NavItem[] {
  if (role === 'morador') {
    return [
      { href: '/minhas-cobrancas', label: 'Minhas cobranças', icon: 'cobrancas' },
      { href: '/relatorios', label: 'Prestação de contas', icon: 'relatorios' },
    ];
  }
  const items: NavItem[] = [
    { href: '/painel', label: 'Painel', icon: 'painel' },
    { href: '/cobrancas', label: 'Cobranças', icon: 'cobrancas' },
    { href: '/lancamentos', label: 'Receitas e despesas', icon: 'lancamentos' },
    { href: '/unidades', label: 'Unidades', icon: 'unidades' },
    { href: '/contas', label: 'Contas e caixa', icon: 'contas' },
    { href: '/cadastros', label: 'Categorias e fornecedores', icon: 'cadastros' },
    { href: '/relatorios', label: 'Prestação de contas', icon: 'relatorios' },
    { href: '/relatorios/inadimplencia', label: 'Inadimplência', icon: 'inadimplencia' },
  ];
  if (role === 'admin') items.push({ href: '/usuarios', label: 'Usuários', icon: 'usuarios' }, { href: '/configuracoes', label: 'Configurações', icon: 'configuracoes' });
  if (role === 'admin' || role === 'conselho') items.push({ href: '/auditoria', label: 'Histórico de ações', icon: 'auditoria' });
  return items;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const problem = configProblem();
  if (problem) return <ConfigNotice message={problem} />;
  const user = await requireUser();
  const settings = await getSettings();
  return (
    <Shell condoName={settings.name} userName={user.name} roleLabel={ROLE_LABEL[user.role]} items={navFor(user.role)} logout={logoutAction}>
      {children}
    </Shell>
  );
}
