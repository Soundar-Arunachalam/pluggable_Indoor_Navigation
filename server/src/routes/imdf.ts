import { Router } from 'express';
import { getDB } from '../db/database.js';
import { IMDFService } from '../services/imdfService.js';

export const imdfRouter = Router();

// GET /api/venues/:id/export/imdf - Export complete OGC IMDF GeoJSON bundle
imdfRouter.get('/:id/export/imdf', async (req, res) => {
  try {
    const db = await getDB();
    const bundle = await IMDFService.exportIMDF(db, req.params.id);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="imdf-${req.params.id}.json"`);
    res.json(bundle);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/venues/import - Import a full venue IMDF / GeoJSON layout
imdfRouter.post('/import', async (req, res) => {
  try {
    const db = await getDB();
    const result = await IMDFService.importIMDF(db, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/venues/:id/import/imdf - Ingest IMDF bundle for a specific venue
imdfRouter.post('/:id/import/imdf', async (req, res) => {
  try {
    const db = await getDB();
    const result = await IMDFService.importIMDF(db, req.body, req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

