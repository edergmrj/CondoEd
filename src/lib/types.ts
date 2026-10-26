export type Role = 'admin' | 'financeiro' | 'conselho' | 'morador';

export type FormState =
  | { ok?: boolean; error?: string; message?: string; redirect?: string }
  | undefined;

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  unitId: number | null;
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Síndico (acesso total)',
  financeiro: 'Financeiro (lança e dá baixa)',
  conselho: 'Conselho fiscal (somente leitura)',
  morador: 'Morador (vê a própria unidade)',
};

export const WRITERS: Role[] = ['admin', 'financeiro'];
export const STAFF: Role[] = ['admin', 'financeiro', 'conselho'];
export const EVERYONE: Role[] = ['admin', 'financeiro', 'conselho', 'morador'];

export const canWrite = (r: Role) => r === 'admin' || r === 'financeiro';
export const homeFor = (r: Role) => (r === 'morador' ? '/minhas-cobrancas' : '/painel');
