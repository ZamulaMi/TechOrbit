import { db } from '../db/database.ts';
import { Notification } from '../types/index.ts';

export class NotificationService {
  static create(params: {
    type: Notification['type'];
    title: string;
    message: string;
    link?: string | null;
  }): Notification {
    const id = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO notifications (id, type, title, message, link, read, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `);

    stmt.run(id, params.type, params.title, params.message, params.link || null, now);

    return {
      id,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link || null,
      read: false,
      created_at: now
    };
  }

  static getNotifications(unreadOnly: boolean = false, limit: number = 30): Notification[] {
    let sql = 'SELECT * FROM notifications';
    if (unreadOnly) {
      sql += ' WHERE read = 0';
    }
    sql += ' ORDER BY created_at DESC LIMIT ?';

    const items = db.prepare(sql).all(limit) as any[];
    return items.map(item => ({
      ...item,
      read: Boolean(item.read)
    }));
  }

  static markAsRead(id: string): boolean {
    const res = db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(id);
    return res.changes > 0;
  }

  static markAllAsRead(): void {
    db.prepare('UPDATE notifications SET read = 1 WHERE read = 0').run();
  }

  static getUnreadCount(): number {
    const res = db.prepare('SELECT count(*) as count FROM notifications WHERE read = 0').get() as { count: number };
    return res?.count || 0;
  }
}
