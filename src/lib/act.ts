import { revalidatePath } from 'next/cache';
import { getCurrentUser } from './auth';
import { UserError } from './errors';
import type { FormState, Role, SessionUser } from './types';

function friendly(e: unknown): string | null {
  const code = (e as { code?: string })?.code;
  if (code === '23505') return 'Já existe um registro com esses dados.';
  if (code === '23503') return 'Este registro está vinculado a outros dados e não pode ser removido.';
  if (code === '23514') return 'Algum valor informado é inválido.';
  return null;
}

function fail(e: unknown): FormState {
  if (e instanceof UserError) return { error: e.message };
  const f = friendly(e);
  if (f) return { error: f };
  console.error('[action]', e);
  return { error: 'Algo deu errado. Tente novamente em instantes.' };
}

/** Executa uma Server Action exigindo login e perfil; converte erros em mensagens para o formulário. */
export async function act(roles: Role[], fn: (user: SessionUser) => Promise<FormState | void>): Promise<FormState> {
  try {
    const user = await getCurrentUser();
    if (!user) return { error: 'Sua sessão expirou. Entre novamente.', redirect: '/login' };
    if (!roles.includes(user.role)) return { error: 'Você não tem permissão para esta ação.' };
    const result = await fn(user);
    revalidatePath('/', 'layout');
    return result ?? { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Variante sem login (entrar e configuração inicial). */
export async function actPublic(fn: () => Promise<FormState | void>): Promise<FormState> {
  try {
    const result = await fn();
    revalidatePath('/', 'layout');
    return result ?? { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---- leitura de campos de formulário ----
export const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
export const opt = (fd: FormData, k: string) => str(fd, k) || null;
export const int = (fd: FormData, k: string) => {
  const v = str(fd, k);
  const n = Number(v);
  return v !== '' && Number.isInteger(n) ? n : null;
};
export const flag = (fd: FormData, k: string) => fd.get(k) === 'on' || fd.get(k) === 'true';
