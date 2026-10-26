# Financeiro do Condomínio

Sistema web para controlar as finanças de um condomínio: taxas condominiais, receitas e despesas, caixa e contas bancárias, fundo de reserva, inadimplência e prestação de contas. Feito com Next.js, TypeScript, Tailwind CSS e PostgreSQL, pronto para rodar na Vercel.

## O que o sistema faz

- **Painel**: saldo, recebido e pago no mês, valor em atraso, gráfico de 12 meses e a "fachada" do prédio, com uma janela por unidade colorida pela situação (em dia, a vencer, em atraso).
- **Unidades**: cadastro com proprietário, contato, fração ideal e taxa fixa opcional.
- **Cobranças**: geração em lote da taxa mensal ou de rateio extra, com prévia antes de gravar. Baixa com multa e juros calculados pela data do pagamento, estorno, cancelamento e recibo para imprimir.
- **Receitas e despesas**: lançamentos com categoria, fornecedor, conta, vencimento e baixa. Contas a pagar em aberto aparecem no painel.
- **Contas e caixa**: contas bancárias, caixa e fundo de reserva, com saldo atual e transferências entre contas.
- **Prestação de contas**: relatório mensal com saldo anterior, receitas e despesas por categoria, saldo final e movimentação detalhada. Imprime ou salva em PDF pelo navegador e exporta CSV (abre direto no Excel).
- **Inadimplência**: unidades em atraso, tempo de atraso, encargos estimados e contato de cada proprietário.
- **Usuários e perfis**, **histórico de ações** (quem fez o quê e quando) e **configurações** de multa, juros e vencimento.

### Perfis de acesso

| Perfil | O que pode |
| --- | --- |
| Síndico | Tudo, inclusive usuários e configurações |
| Financeiro | Cadastros, cobranças, lançamentos, contas e relatórios |
| Conselho fiscal | Somente leitura de tudo, inclusive o histórico de ações |
| Morador | Vê as cobranças da própria unidade e a prestação de contas (sem os nomes de quem pagou) |

## Como publicar na Vercel

1. **Suba o projeto para o GitHub** (repositório privado de preferência):
   ```bash
   git init && git add . && git commit -m "Financeiro do condomínio"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
   git push -u origin main
   ```
2. Na Vercel, clique em **Add New → Project** e importe o repositório. O Next.js é detectado sozinho.
3. Crie o banco: no projeto, abra **Storage → Create Database → Neon (Postgres)** e conecte ao projeto. A variável `DATABASE_URL` é criada automaticamente. Escolha a região **São Paulo** se estiver disponível.
4. Em **Settings → Environment Variables**, crie:
   - `AUTH_SECRET`: um texto longo e aleatório (gere com `openssl rand -base64 32`).
   - `SETUP_KEY` (opcional, recomendado): uma chave só sua. Se existir, a tela de configuração inicial a exige, para que ninguém mais crie o primeiro usuário.
5. Em **Settings → Functions**, deixe a **Function Region** na mesma região do banco (São Paulo, `gru1`). Isso deixa as telas bem mais rápidas.
6. Faça o deploy (ou **Redeploy**) e abra o endereço do site. Na primeira visita você cai em `/setup`: informe o condomínio e crie a conta do síndico. As tabelas, as categorias e as contas padrão (conta corrente, caixa e fundo de reserva) são criadas automaticamente.

**Usando Supabase em vez de Neon:** coloque em `DATABASE_URL` a string de conexão do *Transaction pooler* (porta 6543). O sistema ajusta o SSL sozinho para hosts do Supabase. Para outros provedores com certificado próprio, defina `DATABASE_SSL=no-verify`.

## Rodar no computador

```bash
npm install
cp .env.example .env.local      # preencha DATABASE_URL e AUTH_SECRET
npm run dev                     # http://localhost:3000
npm test                        # testes de cálculo (dinheiro, datas, multa e juros)
```

Precisa de Node 20 ou superior e de um PostgreSQL acessível (pode ser um banco gratuito do Neon).

## Como os valores são calculados

- **Rateio por fração ideal**: o total informado é dividido proporcionalmente à fração ideal de cada unidade, pelo método do maior resto. A soma das cobranças fecha exatamente no total, sem sobrar nem faltar centavo. Se as frações não somarem 100%, o sistema avisa e rateia proporcionalmente.
- **Fundo de reserva**: percentual somado à taxa mensal, lançado como item separado. Na baixa, essa parte entra na conta do tipo "Fundo de reserva".
- **Multa e juros**: multa única de 2% e juros de 1% ao mês, proporcionais aos dias de atraso (pro rata die). São os valores usuais do Código Civil, mas a convenção do condomínio pode prever outros. Ajuste em **Configurações**. Na baixa, deixe os campos em branco para o cálculo automático pela data do pagamento, ou informe os valores (0 dispensa o encargo).
- **Prestação de contas** em regime de caixa: conta o que foi efetivamente recebido e pago no mês. O saldo anterior de um mês é sempre o saldo final do mês anterior.
- Datas usam o fuso de Brasília, mesmo com o servidor em UTC.

## Estrutura

```
src/app/            telas (App Router) e Server Actions em src/app/actions
src/lib/            regras de negócio, banco, login e cálculos
src/lib/services/   consultas e operações no banco (sem dependência do Next)
src/components/     componentes de interface
tests/              testes dos cálculos
```

O esquema do banco está em `src/lib/schema.ts` e é aplicado automaticamente, de forma idempotente, na primeira requisição de cada instância. Valores monetários ficam em centavos (`bigint`).

## Segurança

- Senhas com scrypt; sessão em cookie `HttpOnly` assinado, válida por 7 dias.
- Bloqueio de 15 minutos após 5 senhas erradas seguidas.
- Cada ação confere o perfil no servidor; desativar um usuário vale imediatamente.
- Os dados de moradores (nome, e-mail, telefone) são pessoais: dê acesso apenas a quem precisa e mantenha o repositório privado.
- Faça backup do banco. No Neon há restauração por histórico (conforme o plano); também dá para exportar com `pg_dump`.

## Ainda não inclui

Emissão de boleto ou PIX e baixa automática por extrato, pagamento parcial e acordos de parcelamento, conciliação bancária (OFX), orçamento anual previsto x realizado, anexo de comprovantes e envio de cobrança por e-mail ou WhatsApp. A estrutura já separa regras de negócio e telas, o que facilita acrescentar esses módulos.

Esta ferramenta ajuda na gestão, mas não substitui a orientação de um contador ou advogado.
