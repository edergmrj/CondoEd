import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { SignJWT, jwtVerify } from 'jose';
import { one } from './db';
import { homeFor, type Role, type SessionUser } from './types';

const COOKIE = 'cf_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

function secret() {
  const s = process.env.AUTH_SECRET || (process.env.NODE_ENV !== 'production' ? 'dev-only-secret-change-me-0123456789abcdef' : '');
  if (!s) throw new Error('AUTH_SECRET não configurada');
  return new TextEncoder().encode(s);
}

export async function signSession(userId: number): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export async function createSession(userId: number) {
  const token = await signSession(userId);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

interface UserRow {
  id: number;
  name: string;
  email: string;
  role: Role;
  unit_id: number | null;
  active: boolean;
}

/** Usuário logado (ou null). Confere no banco a cada requisição, então desativar um usuário vale na hora. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    const id = Number(payload.sub);
    if (!Number.isInteger(id)) return null;
    const u = await one<UserRow>('select id, name, email, role, unit_id, active from users where id = $1', [id]);
    if (!u || !u.active) return null;
    return { id: u.id, name: u.name, email: u.email, role: u.role, unitId: u.unit_id };
  } catch {
    return null;
  }
});

/** Para páginas: exige login (e, opcionalmente, um dos perfis). */
export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (roles && !roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}
