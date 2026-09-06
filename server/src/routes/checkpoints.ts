import { Router } from 'express';
import { getDB } from '../db/database.js';
import { CheckpointRecord, NodeRecord, LevelRecord } from '../types/db.js';

export const checkpointsRouter = Router();

// GET /api/venues/:id/checkpoints - List all checkpoints for a venue
checkpointsRouter.get('/:id/checkpoints', async (req, res) => {
  try {
    const db = await getDB();
    const venueId = req.params.id;
    const resDb = await db.query<CheckpointRecord & { level_name: string; level_ordinal: number; x_meters: number; y_meters: number }>(
      `SELECT c.*, l.name as level_name, l.ordinal as level_ordinal, n.x_meters, n.y_meters
       FROM checkpoints c
       JOIN levels l ON c.level_id = l.id
       JOIN nodes n ON c.node_id = n.id
       WHERE c.venue_id = $1
       ORDER BY l.ordinal ASC, c.label ASC`,
      [venueId]
    );
    res.json({ success: true, data: resDb.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/venues/:id/checkpoints/:code - Resolve scanned QR code to exact location
checkpointsRouter.get('/:id/checkpoints/:code', async (req, res) => {
  try {
    const db = await getDB();
    const venueId = req.params.id;
    const code = req.params.code;

    const resDb = await db.query<CheckpointRecord & { level_name: string; level_ordinal: number; x_meters: number; y_meters: number }>(
      `SELECT c.*, l.name as level_name, l.ordinal as level_ordinal, n.x_meters, n.y_meters
       FROM checkpoints c
       JOIN levels l ON c.level_id = l.id
       JOIN nodes n ON c.node_id = n.id
       WHERE c.venue_id = $1 AND (c.code = $2 OR c.id = $2)`,
      [venueId, code]
    );

    if (resDb.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Checkpoint code not recognized' });
    }

    res.json({ success: true, data: resDb.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
