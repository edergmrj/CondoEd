import { q } from './db';

export async function audit(
  user: { id: number; name: string } | null,
  action: string,
  entity?: string,
  entityId?: string | number,
  detail?: string,
) {
  try {
    await q(
      'insert into audit_log (user_id, user_name, action, entity, entity_id, detail) values ($1, $2, $3, $4, $5, $6)',
      [user?.id ?? null, user?.name ?? null, action, entity ?? null, entityId != null ? String(entityId) : null, detail ?? null],
    );
  } catch (e) {
    console.error('[audit] falhou', e);
  }
}
