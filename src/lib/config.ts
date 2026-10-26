/** Retorna uma mensagem se faltar alguma variável de ambiente obrigatória. */
export function configProblem(): string | null {
  if (!(process.env.DATABASE_URL || process.env.POSTGRES_URL)) {
    return 'A variável de ambiente DATABASE_URL não está configurada.';
  }
  if (!process.env.AUTH_SECRET && process.env.NODE_ENV === 'production') {
    return 'A variável de ambiente AUTH_SECRET não está configurada.';
  }
  return null;
}
