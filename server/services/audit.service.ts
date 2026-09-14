import { db } from '../db/database.ts';
import { AuditLog } from '../types/index.ts';

export class AuditService {
  static log(params: {
    userId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): AuditLog {
    const id = 'audit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const now = new Date().toISOString();
    const oldValStr = params.oldValues ? JSON.stringify(params.oldValues) : null;
    const newValStr = params.newValues ? JSON.stringify(params.newValues) : null;

    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      params.userId || null,
      params.action,
      params.entityType,
      params.entityId || null,
      oldValStr,
      newValStr,
      params.ipAddress || null,
      params.userAgent || null,
      now
    );

    return {
      id,
      user_id: params.userId || null,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      old_values: oldValStr,
      new_values: newValStr,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
      created_at: now
    };
  }

  static getRecentLogs(limit: number = 50, offset: number = 0): AuditLog[] {
    const stmt = db.prepare(`
      SELECT * FROM audit_logs
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(limit, offset) as unknown as AuditLog[];
  }

  static getLogsForEntity(entityType: string, entityId: string): AuditLog[] {
    const stmt = db.prepare(`
      SELECT * FROM audit_logs
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(entityType, entityId) as unknown as AuditLog[];
  }
}
