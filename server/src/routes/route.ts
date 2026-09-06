import { Router } from 'express';
import { getDB } from '../db/database.js';
import { RoutingService } from '../services/routingService.js';
import { RouteRequest } from '../types/navigation.js';

export const routeRouter = Router();

// POST /api/venues/:id/route - Compute shortest/accessible path with turn-by-turn steps
routeRouter.post('/:id/route', async (req, res) => {
  try {
    const db = await getDB();
    const venueId = req.params.id;
    const body: RouteRequest = req.body;

    const routeResult = await RoutingService.calculateRoute(db, venueId, body);
    if (!routeResult.success) {
      return res.status(400).json(routeResult);
    }
    res.json(routeResult);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
