import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/public-sans';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Financeiro do Condomínio', template: '%s | Financeiro do Condomínio' },
  description: 'Controle de taxas, despesas, caixa e prestação de contas do condomínio.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#083f4c' };

// Todas as telas dependem de login e do banco: nada é gerado estaticamente no build.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
