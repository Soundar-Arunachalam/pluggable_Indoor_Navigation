import { Router } from 'express';
import { z } from 'zod';
import { getDB } from '../db/database.js';
import { RoutingService } from '../services/routingService.js';

export const routeRouter = Router();

const RouteRequestSchema = z.object({
  startNodeId: z.string().optional(),
  startCoords: z.object({
    x: z.number(),
    y: z.number(),
    levelId: z.string(),
  }).optional(),
  targetNodeId: z.string().optional(),
  targetPoiId: z.string().optional(),
  accessibleOnly: z.boolean().optional().default(false),
  preferElevator: z.boolean().optional().default(false),
  walkingSpeedMps: z.number().positive().max(5).optional().default(1.2),
}).refine(data => data.targetNodeId || data.targetPoiId, {
  message: 'Either targetNodeId or targetPoiId must be provided',
});

// POST /api/venues/:id/route — Compute A* route
routeRouter.post('/:id/route', async (req, res) => {
  const parsed = RouteRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ success: false, error: 'Validation error', details: parsed.error.flatten() });
  }

  try {
    const db = await getDB();
    const result = await RoutingService.calculateRoute(db, req.params.id, parsed.data as any);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
