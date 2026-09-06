import { DBClient } from '../db/database.js';
import { VenueRecord, LevelRecord, UnitRecord, NodeRecord, EdgeRecord, POIRecord, CheckpointRecord } from '../types/db.js';
import { v4 as uuidv4 } from 'uuid';

export class VenueService {
  static async getAllVenues(db: DBClient): Promise<VenueRecord[]> {
    const res = await db.query<VenueRecord>('SELECT * FROM venues ORDER BY created_at DESC');
    return res.rows;
  }

  static async getVenueById(db: DBClient, venueId: string) {
    const venueRes = await db.query<VenueRecord>('SELECT * FROM venues WHERE id = $1', [venueId]);
    if (venueRes.rows.length === 0) return null;

    const levelsRes = await db.query<LevelRecord>(
      'SELECT * FROM levels WHERE venue_id = $1 ORDER BY ordinal ASC',
      [venueId]
    );

    const statsRes = await db.query(
      `SELECT 
        (SELECT COUNT(*) FROM units WHERE venue_id = $1) as unit_count,
        (SELECT COUNT(*) FROM nodes WHERE venue_id = $1) as node_count,
        (SELECT COUNT(*) FROM edges WHERE venue_id = $1) as edge_count,
        (SELECT COUNT(*) FROM pois WHERE venue_id = $1) as poi_count,
        (SELECT COUNT(*) FROM checkpoints WHERE venue_id = $1) as checkpoint_count`,
      [venueId]
    );

    return {
      venue: venueRes.rows[0],
      levels: levelsRes.rows,
      stats: statsRes.rows[0]
    };
  }

  static async getLevelMap(db: DBClient, venueId: string, levelId: string) {
    const levelRes = await db.query<LevelRecord>('SELECT * FROM levels WHERE id = $1 AND venue_id = $2', [levelId, venueId]);
    if (levelRes.rows.length === 0) return null;

    // Fetch units, nodes, edges, pois, checkpoints, and venue nodes concurrently
    const [unitsRes, nodesRes, edgesRes, poisRes, checkpointsRes, allVenueNodes] = await Promise.all([
      db.query<UnitRecord>('SELECT * FROM units WHERE level_id = $1', [levelId]),
      db.query<NodeRecord>('SELECT * FROM nodes WHERE level_id = $1', [levelId]),
      db.query<EdgeRecord>(
        `SELECT e.* FROM edges e
         JOIN nodes n1 ON e.from_node_id = n1.id
         JOIN nodes n2 ON e.to_node_id = n2.id
         WHERE e.venue_id = $1 AND (n1.level_id = $2 OR n2.level_id = $2)`,
        [venueId, levelId]
      ),
      db.query<POIRecord>('SELECT * FROM pois WHERE level_id = $1', [levelId]),
      db.query<CheckpointRecord>('SELECT * FROM checkpoints WHERE level_id = $1', [levelId]),
      db.query<NodeRecord>('SELECT * FROM nodes WHERE venue_id = $1', [venueId])
    ]);

    // Format into GeoJSON FeatureCollection
    const unitFeatures = unitsRes.rows.map(u => ({
      type: 'Feature',
      id: u.id,
      geometry: typeof u.geometry_geojson === 'string' ? JSON.parse(u.geometry_geojson) : u.geometry_geojson,
      properties: {
        name: u.name,
        category: u.category,
        accessibility_type: u.accessibility_type,
        color: u.color
      }
    }));

    const nodeFeatures = nodesRes.rows.map(n => ({
      type: 'Feature',
      id: n.id,
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(n.x_meters as any), parseFloat(n.y_meters as any)]
      },
      properties: {
        name: n.name,
        node_type: n.node_type,
        is_accessible: n.is_accessible
      }
    }));

    const nodesMap = new Map<string, NodeRecord>();
    // Map all nodes in venue for edge coordinate mapping
    for (const n of allVenueNodes.rows) {
      nodesMap.set(n.id, n);
    }

    const edgeFeatures = edgesRes.rows.map(e => {
      const fromN = nodesMap.get(e.from_node_id);
      const toN = nodesMap.get(e.to_node_id);
      const isVertical = fromN && toN && fromN.level_id !== toN.level_id;

      return {
        type: 'Feature',
        id: e.id,
        geometry: {
          type: 'LineString',
          coordinates: [
            [parseFloat(fromN?.x_meters as any || 0), parseFloat(fromN?.y_meters as any || 0)],
            [parseFloat(toN?.x_meters as any || 0), parseFloat(toN?.y_meters as any || 0)]
          ]
        },
        properties: {
          from_node_id: e.from_node_id,
          to_node_id: e.to_node_id,
          edge_type: e.edge_type,
          distance_meters: parseFloat(e.distance_meters as any),
          is_accessible: e.is_accessible,
          is_vertical: isVertical,
          vertical_connector_group: e.vertical_connector_group
        }
      };
    });

    const poiFeatures = poisRes.rows.map(p => ({
      type: 'Feature',
      id: p.id,
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(p.x_meters as any), parseFloat(p.y_meters as any)]
      },
      properties: {
        name: p.name,
        category: p.category,
        is_accessible: p.is_accessible,
        icon: p.icon,
        description: p.description,
        node_id: p.node_id
      }
    }));

    return {
      level: levelRes.rows[0],
      units: { type: 'FeatureCollection', features: unitFeatures },
      nodes: { type: 'FeatureCollection', features: nodeFeatures },
      edges: { type: 'FeatureCollection', features: edgeFeatures },
      pois: { type: 'FeatureCollection', features: poiFeatures },
      checkpoints: checkpointsRes.rows
    };
  }

  static async saveTracedGeometry(
    db: DBClient,
    venueId: string,
    levelId: string,
    data: {
      units?: Partial<UnitRecord>[];
      nodes?: Partial<NodeRecord>[];
      edges?: Partial<EdgeRecord>[];
      pois?: Partial<POIRecord>[];
    }
  ) {
    // Upsert units
    if (data.units && data.units.length > 0) {
      for (const u of data.units) {
        const id = u.id || `unit-${uuidv4().substring(0, 8)}`;
        await db.query(
          `INSERT INTO units (id, level_id, venue_id, name, category, accessibility_type, geometry_geojson, color)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             category = EXCLUDED.category,
             accessibility_type = EXCLUDED.accessibility_type,
             geometry_geojson = EXCLUDED.geometry_geojson,
             color = EXCLUDED.color`,
          [
            id,
            levelId,
            venueId,
            u.name || 'New Unit',
            u.category || 'room',
            u.accessibility_type || 'standard',
            JSON.stringify(u.geometry_geojson),
            u.color || '#e0f2fe'
          ]
        );
      }
    }

    // Upsert nodes
    if (data.nodes && data.nodes.length > 0) {
      for (const n of data.nodes) {
        const id = n.id || `node-${uuidv4().substring(0, 8)}`;
        await db.query(
          `INSERT INTO nodes (id, level_id, venue_id, x_meters, y_meters, node_type, is_accessible, name)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
             x_meters = EXCLUDED.x_meters,
             y_meters = EXCLUDED.y_meters,
             node_type = EXCLUDED.node_type,
             is_accessible = EXCLUDED.is_accessible,
             name = EXCLUDED.name`,
          [
            id,
            levelId,
            venueId,
            n.x_meters || 0,
            n.y_meters || 0,
            n.node_type || 'hallway',
            n.is_accessible !== undefined ? n.is_accessible : true,
            n.name || 'Waypoint'
          ]
        );
      }
    }

    // Upsert edges
    if (data.edges && data.edges.length > 0) {
      for (const e of data.edges) {
        const id = e.id || `edge-${uuidv4().substring(0, 8)}`;
        await db.query(
          `INSERT INTO edges (id, venue_id, from_node_id, to_node_id, edge_type, distance_meters, is_accessible, bidirectional, vertical_connector_group)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET
             from_node_id = EXCLUDED.from_node_id,
             to_node_id = EXCLUDED.to_node_id,
             edge_type = EXCLUDED.edge_type,
             distance_meters = EXCLUDED.distance_meters,
             is_accessible = EXCLUDED.is_accessible,
             bidirectional = EXCLUDED.bidirectional,
             vertical_connector_group = EXCLUDED.vertical_connector_group`,
          [
            id,
            venueId,
            e.from_node_id,
            e.to_node_id,
            e.edge_type || 'walkway',
            e.distance_meters || 5.0,
            e.is_accessible !== undefined ? e.is_accessible : true,
            e.bidirectional !== undefined ? e.bidirectional : true,
            e.vertical_connector_group || null
          ]
        );
      }
    }

    // Upsert POIs
    if (data.pois && data.pois.length > 0) {
      for (const p of data.pois) {
        const id = p.id || `poi-${uuidv4().substring(0, 8)}`;
        await db.query(
          `INSERT INTO pois (id, venue_id, level_id, node_id, name, category, is_accessible, icon, x_meters, y_meters, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO UPDATE SET
             node_id = EXCLUDED.node_id,
             name = EXCLUDED.name,
             category = EXCLUDED.category,
             is_accessible = EXCLUDED.is_accessible,
             icon = EXCLUDED.icon,
             x_meters = EXCLUDED.x_meters,
             y_meters = EXCLUDED.y_meters,
             description = EXCLUDED.description`,
          [
            id,
            venueId,
            levelId,
            p.node_id || null,
            p.name || 'New POI',
            p.category || 'info',
            p.is_accessible !== undefined ? p.is_accessible : true,
            p.icon || 'map-pin',
            p.x_meters || 0,
            p.y_meters || 0,
            p.description || ''
          ]
        );
      }
    }

    return { success: true, message: 'Geometry saved successfully' };
  }
}
