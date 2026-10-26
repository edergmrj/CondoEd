import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { one, q } from './db';
import { UserError } from './errors';

const scryptAsync = (pw: string, salt: Buffer, len: number) =>
  new Promise<Buffer>((resolve, reject) => scrypt(pw, salt, len, (e, k) => (e ? reject(e) : resolve(k))));

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(pw, salt, 64);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, saltHex, hashHex] = stored.split('$');
  if (alg !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scryptAsync(pw, Buffer.from(saltHex, 'hex'), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function validatePassword(pw: string) {
  if (pw.length < 8) throw new UserError('A senha precisa ter pelo menos 8 caracteres.');
  if (pw.length > 128) throw new UserError('A senha é longa demais (máximo de 128 caracteres).');
}

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

/** Confere e-mail e senha. Bloqueia a conta por 15 min após 5 erros seguidos. */
export async function authenticate(email: string, password: string): Promise<number> {
  const invalid = new UserError('E-mail ou senha incorretos.');
  const u = await one<{ id: number; password_hash: string; active: boolean; locked_until: string | null }>(
    'select id, password_hash, active, locked_until from users where lower(email) = lower($1)',
    [email.trim()],
  );
  if (!u || !u.active) {
    await hashPassword(password); // gasta o mesmo tempo para não revelar se o e-mail existe
    throw invalid;
  }
  if (u.locked_until && new Date(u.locked_until) > new Date()) {
    throw new UserError('Acesso bloqueado por excesso de tentativas. Aguarde alguns minutos e tente de novo.');
  }
  const ok = await verifyPassword(password, u.password_hash);
  if (!ok) {
    await q(
      `update users set
         failed_attempts = case when failed_attempts + 1 >= ${MAX_ATTEMPTS} then 0 else failed_attempts + 1 end,
         locked_until = case when failed_attempts + 1 >= ${MAX_ATTEMPTS} then now() + interval '${LOCK_MINUTES} minutes' else locked_until end
       where id = $1`,
      [u.id],
    );
    throw invalid;
  }
  await q('update users set failed_attempts = 0, locked_until = null where id = $1', [u.id]);
  return u.id;
}
