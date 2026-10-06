import { query } from './db';

export async function logAudit({
  userId,
  action,
  entityType,
  entityId,
  oldData,
  newData,
  ipAddress,
}: {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldData?: any;
  newData?: any;
  ipAddress?: string | null;
}) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_data, new_data, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId || null,
        action,
        entityType,
        entityId || null,
        oldData ? JSON.stringify(oldData) : null,
        newData ? JSON.stringify(newData) : null,
        ipAddress || null,
      ]
    );
  } catch (err) {
    console.error('[Audit Log Error]', err);
  }
}
