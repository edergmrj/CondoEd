'use server';

import { redirect } from 'next/navigation';
import { act, actPublic, str } from '@/lib/act';
import { audit } from '@/lib/audit';
import { createSession, destroySession, getCurrentUser } from '@/lib/auth';
import { configProblem } from '@/lib/config';
import { authenticate } from '@/lib/credentials';
import { one } from '@/lib/db';
import { UserError } from '@/lib/errors';
import { changeOwnPassword, hasUsers, setupCondo } from '@/lib/services/admin';
import { EVERYONE, homeFor, type FormState, type Role } from '@/lib/types';

export async function loginAction(fd: FormData): Promise<FormState> {
  return actPublic(async () => {
    const problem = configProblem();
    if (problem) throw new UserError(problem);
    const id = await authenticate(str(fd, 'email'), String(fd.get('password') ?? ''));
    const u = await one<{ name: string; role: Role }>('select name, role from users where id = $1', [id]);
    await createSession(id);
    await audit({ id, name: u!.name }, 'login');
    return { ok: true, redirect: homeFor(u!.role) };
  });
}

export async function setupAction(fd: FormData): Promise<FormState> {
  return actPublic(async () => {
    const problem = configProblem();
    if (problem) throw new UserError(problem);
    if (await hasUsers()) throw new UserError('A instalação já foi concluída. Entre com seu e-mail e senha.');
    const key = process.env.SETUP_KEY;
    if (key && str(fd, 'setup_key') !== key) throw new UserError('Chave de instalação incorreta.');
    const password = String(fd.get('password') ?? '');
    if (password !== String(fd.get('password2') ?? '')) throw new UserError('As senhas não conferem.');
    const id = await setupCondo({
      condoName: str(fd, 'condo_name'),
      cnpj: str(fd, 'cnpj') || null,
      adminName: str(fd, 'name'),
      email: str(fd, 'email'),
      password,
    });
    await createSession(id);
    await audit({ id, name: str(fd, 'name') }, 'instalacao', 'condominio', 1, str(fd, 'condo_name'));
    return { ok: true, redirect: '/painel' };
  });
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) await audit(user, 'logout');
  await destroySession();
  redirect('/login');
}

export async function changePasswordAction(fd: FormData): Promise<FormState> {
  return act(EVERYONE, async (user) => {
    const next = String(fd.get('new') ?? '');
    if (next !== String(fd.get('confirm') ?? '')) throw new UserError('A confirmação não confere com a nova senha.');
    await changeOwnPassword(user.id, String(fd.get('current') ?? ''), next);
    await audit(user, 'senha.alterada');
    return { ok: true, message: 'Senha alterada.' };
  });
}
