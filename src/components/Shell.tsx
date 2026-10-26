'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeftRight, Building2, FileText, KeyRound, Landmark, LayoutDashboard, LogOut, Menu, Receipt, ScrollText, Settings, Tags, TriangleAlert, Users, X } from 'lucide-react';

const ICONS = {
  painel: LayoutDashboard,
  cobrancas: Receipt,
  lancamentos: ArrowLeftRight,
  unidades: Building2,
  contas: Landmark,
  cadastros: Tags,
  relatorios: FileText,
  inadimplencia: TriangleAlert,
  usuarios: Users,
  configuracoes: Settings,
  auditoria: ScrollText,
} as const;

export type IconKey = keyof typeof ICONS;
export interface NavItem {
  href: string;
  label: string;
  icon: IconKey;
}

function NavLinks({ items, active, onNavigate }: { items: NavItem[]; active?: string; onNavigate?: () => void }) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const isActive = item.href === active;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? 'page' : undefined}
              className={
                'flex items-center gap-3 rounded-md border-l-4 px-3 py-2 text-sm font-medium transition-colors ' +
                (isActive ? 'border-latao bg-white/15 text-white' : 'border-transparent text-white/85 hover:bg-white/10 hover:text-white')
              }
            >
              <Icon size={18} aria-hidden strokeWidth={1.75} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function Shell({
  condoName,
  userName,
  roleLabel,
  items,
  logout,
  children,
}: {
  condoName: string;
  userName: string;
  roleLabel: string;
  items: NavItem[];
  logout: () => Promise<void>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const active = items
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const account = (
    <div className="text-sm">
      <p className="truncate font-semibold text-white">{userName}</p>
      <p className="truncate text-white/70">{roleLabel}</p>
      <div className="mt-3 flex items-center gap-4">
        <Link href="/conta" className="inline-flex items-center gap-1.5 text-white/85 hover:text-white">
          <KeyRound size={15} aria-hidden /> Minha conta
        </Link>
        <form action={logout}>
          <button type="submit" className="inline-flex items-center gap-1.5 text-white/85 hover:text-white">
            <LogOut size={15} aria-hidden /> Sair
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-petroleo-esc text-white lg:flex">
        <div className="px-5 pb-4 pt-6">
          <p className="font-display text-xl font-bold leading-tight">{condoName}</p>
          <p className="mt-0.5 text-sm text-white/70">Financeiro do condomínio</p>
        </div>
        <nav aria-label="Principal" className="flex-1 overflow-y-auto px-3 py-2">
          <NavLinks items={items} active={active} />
        </nav>
        <div className="border-t border-white/15 p-5">{account}</div>
      </aside>

      <header className="no-print sticky top-0 z-30 bg-petroleo-esc text-white lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="truncate font-display text-base font-bold">{condoName}</p>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            className="rounded-md p-1.5 hover:bg-white/10"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {open && (
          <div className="max-h-[calc(100dvh-3.25rem)] overflow-y-auto border-t border-white/15 px-3 pb-4 pt-3">
            <nav aria-label="Principal">
              <NavLinks items={items} active={active} onNavigate={() => setOpen(false)} />
            </nav>
            <div className="mt-4 border-t border-white/15 px-3 pt-4">{account}</div>
          </div>
        )}
      </header>

      <main className="lg:pl-60">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-9">{children}</div>
      </main>
    </>
  );
}
