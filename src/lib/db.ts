import { Pool, types, type PoolClient, type QueryResultRow } from 'pg';
import { SCHEMA_SQL } from './schema';

// bigint/numeric -> number (valores em centavos cabem com folga em 2^53); date -> "YYYY-MM-DD"
types.setTypeParser(20, (v) => parseInt(v, 10));
types.setTypeParser(1700, (v) => parseFloat(v));
types.setTypeParser(1082, (v) => v);

export const connectionString = () => process.env.DATABASE_URL || process.env.POSTGRES_URL || '';

/**
 * Supabase usa uma autoridade certificadora própria, que o Node não reconhece por padrão.
 * Para esses hosts (ou com DATABASE_SSL=no-verify) a conexão continua criptografada,
 * mas sem validar a cadeia do certificado. Neon e demais provedores seguem com validação completa.
 */
export function withSslMode(raw: string, env: Record<string, string | undefined> = process.env): string {
  const skip = env.DATABASE_SSL === 'no-verify' || /supabase\.(co|com)\b/.test(raw);
  if (!raw || !skip) return raw;
  try {
    const u = new URL(raw);
    u.searchParams.set('sslmode', 'no-verify');
    return u.toString();
  } catch {
    return raw;
  }
}

const g = globalThis as unknown as { __cfPool?: Pool; __cfSchema?: Promise<void> };

function getPool(): Pool {
  if (!g.__cfPool) {
    const cs = connectionString();
    if (!cs) throw new Error('DATABASE_URL não configurada');
    g.__cfPool = new Pool({ connectionString: withSslMode(cs), max: 4, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 15_000 });
    g.__cfPool.on('error', (e) => console.error('[pg] erro no pool', e));
  }
  return g.__cfPool;
}

/** Cria as tabelas na primeira chamada de cada instância (idempotente, com trava para evitar corrida). */
export function ensureSchema(): Promise<void> {
  if (!g.__cfSchema) {
    g.__cfSchema = (async () => {
      const client = await getPool().connect();
      try {
        await client.query('select pg_advisory_lock(727200)');
        try {
          await client.query(SCHEMA_SQL);
        } finally {
          await client.query('select pg_advisory_unlock(727200)');
        }
      } finally {
        client.release();
      }
    })().catch((e) => {
      g.__cfSchema = undefined;
      throw e;
    });
  }
  return g.__cfSchema;
}

export async function q<T extends QueryResultRow = any>(text: string, params: unknown[] = []): Promise<T[]> {
  await ensureSchema();
  const res = await getPool().query<T>(text, params as any[]);
  return res.rows;
}

export async function one<T extends QueryResultRow = any>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}

export type Tx = PoolClient;

export async function tx<T>(fn: (c: Tx) => Promise<T>): Promise<T> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('begin');
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (e) {
    try {
      await client.query('rollback');
    } catch {
      /* ignora */
    }
    throw e;
  } finally {
    client.release();
  }
}

export async function closePool() {
  await g.__cfPool?.end();
  g.__cfPool = undefined;
  g.__cfSchema = undefined;
}
