import { Router } from 'express';
import { getDB } from '../db/database.js';
import { POIRecord } from '../types/db.js';

export const poisRouter = Router();

// GET /api/venues/:id/pois - Search & filter POIs
poisRouter.get('/:id/pois', async (req, res) => {
  try {
    const db = await getDB();
    const venueId = req.params.id;
    const q = (req.query.q as string || '').toLowerCase().trim();
    const category = req.query.category as string || '';
    const levelId = req.query.levelId as string || '';

    let sql = `
      SELECT p.*, l.name as level_name, l.ordinal as level_ordinal
      FROM pois p
      JOIN levels l ON p.level_id = l.id
      WHERE p.venue_id = $1
    `;
    const params: any[] = [venueId];

    if (category) {
      params.push(category);
      sql += ` AND p.category = $${params.length}`;
    }

    if (levelId) {
      params.push(levelId);
      sql += ` AND p.level_id = $${params.length}`;
    }

    if (q) {
      params.push(`%${q}%`);
      sql += ` AND (LOWER(p.name) LIKE $${params.length} OR LOWER(p.description) LIKE $${params.length})`;
    }

    sql += ' ORDER BY l.ordinal ASC, p.name ASC';

    const result = await db.query<POIRecord & { level_name: string; level_ordinal: number }>(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
