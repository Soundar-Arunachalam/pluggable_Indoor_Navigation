import { Router } from 'express';
import { z } from 'zod';
import { getDB } from '../db/database.js';
import { VenueService } from '../services/venueService.js';
import { RoutingService } from '../services/routingService.js';
import { v4 as uuidv4 } from 'uuid';

export const venuesRouter = Router();

// ── Zod schemas ────────────────────────────────────────────────────────────────
const GeometrySchema = z.object({
  levelId: z.string().min(1),
  units: z.array(z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    category: z.string().optional(),
    accessibility_type: z.string().optional(),
    geometry_geojson: z.any(),
    color: z.string().optional(),
  })).optional(),
  nodes: z.array(z.object({
    id: z.string().optional(),
    x_meters: z.number(),
    y_meters: z.number(),
    node_type: z.string().optional(),
    is_accessible: z.boolean().optional(),
    name: z.string().optional(),
  })).optional(),
  edges: z.array(z.object({
    id: z.string().optional(),
    from_node_id: z.string(),
    to_node_id: z.string(),
    edge_type: z.string().optional(),
    distance_meters: z.number(),
    is_accessible: z.boolean().optional(),
    vertical_connector_group: z.string().nullable().optional(),
  })).optional(),
  pois: z.array(z.object({
    id: z.string().optional(),
    name: z.string(),
    category: z.string(),
    is_accessible: z.boolean().optional(),
    icon: z.string().optional(),
    x_meters: z.number(),
    y_meters: z.number(),
    description: z.string().optional(),
  })).optional(),
});

const CreateVenueSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().optional(),
  category: z.enum(['hospital', 'mall', 'airport', 'campus', 'office', 'expo', 'transit', 'other']),
  address: z.string().optional(),
  levels: z.array(z.object({
    name: z.string(),
    short_name: z.string(),
    ordinal: z.number().int().min(0),
  })).min(1).optional(),
});

const FloorplanSchema = z.object({
  floorplan_svg_url: z.string().url().optional().or(z.literal('')),
  scale_pixels_per_meter: z.number().positive().optional(),
  width_meters: z.number().positive().optional(),
  height_meters: z.number().positive().optional(),
});

// ── Helper ─────────────────────────────────────────────────────────────────────
function validate<T>(schema: z.ZodSchema<T>, body: unknown, res: any): T | null {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    res.status(422).json({ success: false, error: 'Validation error', details: parsed.error.flatten() });
    return null;
  }
  return parsed.data;
}

// ── GET /api/venues — List all venues ─────────────────────────────────────────
venuesRouter.get('/', async (req, res) => {
  try {
    const db = await getDB();
    const venues = await VenueService.getAllVenues(db);
    res.json({ success: true, data: venues });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/venues — Create new venue ────────────────────────────────────────
venuesRouter.post('/', async (req, res) => {
  const body = validate(CreateVenueSchema, req.body, res);
  if (!body) return;
  try {
    const db = await getDB();
    const venueId = `venue-${uuidv4().substring(0, 8)}`;

    await db.query(
      `INSERT INTO venues (id, name, description, category, address)
       VALUES ($1, $2, $3, $4, $5)`,
      [venueId, body.name, body.description || '', body.category, body.address || '']
    );

    // Create default levels
    const levelDefs = body.levels || [
      { name: 'Ground Floor', short_name: 'G', ordinal: 0 },
      { name: 'First Floor', short_name: 'F1', ordinal: 1 },
    ];
    for (const lvl of levelDefs) {
      await db.query(
        `INSERT INTO levels (id, venue_id, ordinal, name, short_name)
         VALUES ($1, $2, $3, $4, $5)`,
        [`level-${uuidv4().substring(0, 8)}`, venueId, lvl.ordinal, lvl.name, lvl.short_name]
      );
    }

    const result = await VenueService.getVenueById(db, venueId);
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/venues/:id — Get venue details ────────────────────────────────────
venuesRouter.get('/:id', async (req, res) => {
  try {
    const db = await getDB();
    const result = await VenueService.getVenueById(db, req.params.id);
    if (!result) return res.status(404).json({ success: false, error: 'Venue not found' });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /api/venues/:id — Delete venue ─────────────────────────────────────
venuesRouter.delete('/:id', async (req, res) => {
  try {
    const db = await getDB();
    await db.query('DELETE FROM venues WHERE id = $1', [req.params.id]);
    RoutingService.invalidateCache(req.params.id);
    res.json({ success: true, message: 'Venue deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/venues/:id/levels/:levelId/map ────────────────────────────────────
venuesRouter.get('/:id/levels/:levelId/map', async (req, res) => {
  try {
    const db = await getDB();
    const mapData = await VenueService.getLevelMap(db, req.params.id, req.params.levelId);
    if (!mapData) return res.status(404).json({ success: false, error: 'Level map not found' });
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.json({ success: true, data: mapData });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PUT /api/venues/:id/geometry — Save editor geometry ───────────────────────
venuesRouter.put('/:id/geometry', async (req, res) => {
  const body = validate(GeometrySchema, req.body, res);
  if (!body) return;
  try {
    const db = await getDB();
    const { levelId, units, nodes, edges, pois } = body;
    const result = await VenueService.saveTracedGeometry(db, req.params.id, levelId, { units, nodes, edges, pois } as any);
    // Invalidate route graph cache after geometry change
    RoutingService.invalidateCache(req.params.id);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PUT /api/venues/:id/levels/:levelId/floorplan ─────────────────────────────
venuesRouter.put('/:id/levels/:levelId/floorplan', async (req, res) => {
  const body = validate(FloorplanSchema, req.body, res);
  if (!body) return;
  try {
    const db = await getDB();
    await db.query(
      `UPDATE levels SET
         floorplan_svg_url       = COALESCE($1, floorplan_svg_url),
         scale_pixels_per_meter  = COALESCE($2, scale_pixels_per_meter),
         width_meters            = COALESCE($3, width_meters),
         height_meters           = COALESCE($4, height_meters)
       WHERE id = $5 AND venue_id = $6`,
      [body.floorplan_svg_url || null, body.scale_pixels_per_meter || null,
       body.width_meters || null, body.height_meters || null,
       req.params.levelId, req.params.id]
    );
    res.json({ success: true, message: 'Floorplan updated' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/venues/:id/cache/purge — Manual cache invalidation ──────────────
venuesRouter.post('/:id/cache/purge', async (req, res) => {
  RoutingService.invalidateCache(req.params.id);
  res.json({ success: true, message: 'Route graph cache purged' });
});
