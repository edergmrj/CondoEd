export function ConfigNotice({ message }: { message: string }) {
  return (
    <main className="mx-auto max-w-xl px-5 py-16">
      <h1 className="text-2xl font-bold">Falta concluir a configuração</h1>
      <p className="mt-3 rounded-md bg-aviso-claro px-4 py-3 text-aviso-esc">{message}</p>
      <ol className="mt-5 list-decimal space-y-2 pl-5 text-tinta-2">
        <li>
          Na Vercel, abra o projeto, vá em <strong>Storage</strong> e conecte um banco PostgreSQL (Neon). A variável{' '}
          <code className="rounded bg-white px-1">DATABASE_URL</code> é criada automaticamente. Pode ser também a string de conexão do Supabase.
        </li>
        <li>
          Em <strong>Settings → Environment Variables</strong>, crie <code className="rounded bg-white px-1">AUTH_SECRET</code> com um texto longo e
          aleatório (por exemplo, o resultado de <code className="rounded bg-white px-1">openssl rand -base64 32</code>).
        </li>
        <li>Faça um novo deploy (Deployments → Redeploy) e abra o site de novo.</li>
      </ol>
    </main>
  );
}
