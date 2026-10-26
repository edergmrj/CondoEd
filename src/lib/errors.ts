/** Erro com mensagem segura para mostrar ao usuário. */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserError';
  }
}
