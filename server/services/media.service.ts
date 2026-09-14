import { db } from '../db/database.ts';
import { Media } from '../types/index.ts';

export class MediaService {
  static getAllMedia(limit: number = 50, offset: number = 0): Media[] {
    const stmt = db.prepare(`
      SELECT * FROM media
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(limit, offset) as unknown as Media[];
  }

  static getMediaById(id: string): Media | null {
    const stmt = db.prepare('SELECT * FROM media WHERE id = ?');
    return (stmt.get(id) as any) || null;
  }

  static registerMedia(data: {
    filename: string;
    originalName: string;
    mimeType: string;
    fileSize: number;
    url: string;
    storagePath?: string;
    altTextUk?: string;
    altTextEn?: string;
    width?: number | null;
    height?: number | null;
    createdBy: string;
  }): Media {
    const id = 'media_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO media (
        id, filename, original_name, mime_type, file_size, storage_path,
        url, alt_text_uk, alt_text_en, width, height, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.filename,
      data.originalName,
      data.mimeType,
      data.fileSize,
      data.storagePath || data.url,
      data.url,
      data.altTextUk || '',
      data.altTextEn || '',
      data.width || null,
      data.height || null,
      data.createdBy,
      now
    );

    return this.getMediaById(id)!;
  }

  static deleteMedia(id: string): boolean {
    const res = db.prepare('DELETE FROM media WHERE id = ?').run(id);
    return res.changes > 0;
  }
}
