import { Router } from 'express';
import { getDB } from '../db/database.js';
import { VenueService } from '../services/venueService.js';
import { RoutingService } from '../services/routingService.js';

export const venuesRouter = Router();

// GET /api/venues - List all venues
venuesRouter.get('/', async (req, res) => {
  try {
    const db = await getDB();
    const venues = await VenueService.getAllVenues(db);
    res.json({ success: true, data: venues });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/venues/:id - Get venue details & levels
venuesRouter.get('/:id', async (req, res) => {
  try {
    const db = await getDB();
    const result = await VenueService.getVenueById(db, req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Venue not found' });
    }
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/venues/:id/levels/:levelId/map - Get full map layer for a level
venuesRouter.get('/:id/levels/:levelId/map', async (req, res) => {
  try {
    const db = await getDB();
    const mapData = await VenueService.getLevelMap(db, req.params.id, req.params.levelId);
    if (!mapData) {
      return res.status(404).json({ success: false, error: 'Level map not found' });
    }
    res.json({ success: true, data: mapData });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/venues/:id/geometry - Save traced geometry from Editor
venuesRouter.put('/:id/geometry', async (req, res) => {
  try {
    const db = await getDB();
    const { levelId, units, nodes, edges, pois } = req.body;
    if (!levelId) {
      return res.status(400).json({ success: false, error: 'levelId is required' });
    }
    const result = await VenueService.saveTracedGeometry(db, req.params.id, levelId, { units, nodes, edges, pois });
    RoutingService.invalidateCache(req.params.id);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/venues/:id/levels/:levelId/floorplan - Update level blueprint SVG / image URL
venuesRouter.put('/:id/levels/:levelId/floorplan', async (req, res) => {
  try {
    const db = await getDB();
    const { floorplan_svg_url, scale_pixels_per_meter, width_meters, height_meters } = req.body;
    await db.query(
      `UPDATE levels SET
         floorplan_svg_url = COALESCE($1, floorplan_svg_url),
         scale_pixels_per_meter = COALESCE($2, scale_pixels_per_meter),
         width_meters = COALESCE($3, width_meters),
         height_meters = COALESCE($4, height_meters)
       WHERE id = $5 AND venue_id = $6`,
      [floorplan_svg_url || null, scale_pixels_per_meter || null, width_meters || null, height_meters || null, req.params.levelId, req.params.id]
    );
    res.json({ success: true, message: 'Floorplan blueprint updated successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

