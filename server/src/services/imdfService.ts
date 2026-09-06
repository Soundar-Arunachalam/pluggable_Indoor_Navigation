import { DBClient } from '../db/database.js';
import { IMDFBundle, IMDFFeatureCollection } from '../types/imdf.js';
import { VenueRecord, LevelRecord, UnitRecord, NodeRecord, EdgeRecord } from '../types/db.js';
import { v4 as uuidv4 } from 'uuid';

export class IMDFService {
  /**
   * Export venue into standard OGC / Apple IMDF GeoJSON bundle
   */
  static async exportIMDF(db: DBClient, venueId: string): Promise<IMDFBundle> {
    const venueRes = await db.query<VenueRecord>('SELECT * FROM venues WHERE id = $1', [venueId]);
    if (venueRes.rows.length === 0) {
      throw new Error(`Venue ${venueId} not found`);
    }
    const venue = venueRes.rows[0];

    const levelsRes = await db.query<LevelRecord>('SELECT * FROM levels WHERE venue_id = $1 ORDER BY ordinal ASC', [venueId]);
    const unitsRes = await db.query<UnitRecord>('SELECT * FROM units WHERE venue_id = $1', [venueId]);
    const nodesRes = await db.query<NodeRecord>('SELECT * FROM nodes WHERE venue_id = $1', [venueId]);
    const edgesRes = await db.query<EdgeRecord>('SELECT * FROM edges WHERE venue_id = $1', [venueId]);

    // 1. Venue FeatureCollection
    const venueCollection: IMDFFeatureCollection = {
      type: 'FeatureCollection',
      name: 'venue',
      features: [
        {
          id: venue.id,
          type: 'Feature',
          feature_type: 'venue',
          geometry: null,
          properties: {
            category: (venue.category === 'hospital' ? 'healthcare' : venue.category === 'mall' ? 'shopping' : 'other') as any,
            restriction: null,
            name: { en: venue.name },
            alt_name: null,
            hours: '08:00-20:00',
            phone: '+1-555-INDOOR',
            website: 'https://indoor-nav.local',
            display_point: {
              type: 'Point',
              coordinates: [-73.985130, 40.748817]
            },
            address: venue.address
          }
        }
      ]
    };

    // 2. Levels FeatureCollection
    const levelsCollection: IMDFFeatureCollection = {
      type: 'FeatureCollection',
      name: 'levels',
      features: levelsRes.rows.map(lvl => ({
        id: lvl.id,
        type: 'Feature',
        feature_type: 'level',
        geometry: null,
        properties: {
          category: (lvl.ordinal === 0 ? 'ground' : 'concourse') as any,
          restriction: null,
          name: { en: lvl.name },
          short_name: { en: lvl.short_name },
          ordinal: lvl.ordinal,
          outdoor: false,
          building_ids: [venue.id]
        }
      }))
    };

    // 3. Units FeatureCollection
    const unitsCollection: IMDFFeatureCollection = {
      type: 'FeatureCollection',
      name: 'units',
      features: unitsRes.rows.map(u => ({
        id: u.id,
        type: 'Feature',
        feature_type: 'unit',
        geometry: typeof u.geometry_geojson === 'string' ? JSON.parse(u.geometry_geojson) : u.geometry_geojson,
        properties: {
          category: (u.category === 'restroom' ? 'restroom.accessible' : u.category) as any,
          restriction: null,
          accessibility: u.accessibility_type === 'accessible' ? ['wheelchair'] : null,
          name: { en: u.name },
          alt_name: null,
          level_id: u.level_id
        }
      }))
    };

    // 4. Nodes FeatureCollection
    const nodesCollection: IMDFFeatureCollection = {
      type: 'FeatureCollection',
      name: 'nodes',
      features: nodesRes.rows.map(n => ({
        id: n.id,
        type: 'Feature',
        feature_type: 'node',
        geometry: {
          type: 'Point',
          coordinates: [parseFloat(n.x_meters as any), parseFloat(n.y_meters as any)]
        },
        properties: {
          level_id: n.level_id,
          node_type: n.node_type as any,
          accessibility: n.is_accessible ? ['wheelchair'] : null,
          name: n.name
        }
      }))
    };

    // 5. Pathways FeatureCollection
    const pathwaysCollection: IMDFFeatureCollection = {
      type: 'FeatureCollection',
      name: 'pathways',
      features: edgesRes.rows.map(e => ({
        id: e.id,
        type: 'Feature',
        feature_type: 'pathway',
        geometry: null,
        properties: {
          category: e.edge_type as any,
          direction: e.bidirectional ? 'bidirectional' : 'unidirectional',
          accessibility: e.is_accessible ? ['wheelchair'] : null,
          from_node_id: e.from_node_id,
          to_node_id: e.to_node_id,
          distance_meters: parseFloat(e.distance_meters as any),
          vertical_connector_group: e.vertical_connector_group || undefined
        }
      }))
    };

    return {
      manifest: {
        version: '1.0.0',
        generated_at: new Date().toISOString(),
        venue_id: venueId
      },
      venue: venueCollection,
      levels: levelsCollection,
      units: unitsCollection,
      nodes: nodesCollection,
      pathways: pathwaysCollection
    };
  }

  /**
   * Helper to safely extract a human-readable name string from IMDF name objects or strings
   */
  private static parseName(nameProp: any): string | null {
    if (!nameProp) return null;
    if (typeof nameProp === 'string') return nameProp.trim() || null;
    if (typeof nameProp === 'object') {
      return nameProp.en || nameProp['en-US'] || nameProp[Object.keys(nameProp)[0]] || null;
    }
    return String(nameProp);
  }

  /**
   * Universal Ingestion for Microsoft Places / Apple IMDF / GeoJSON packages
   */
  static async importIMDF(db: DBClient, rawInput: any, venueIdOverride?: string) {
    if (!rawInput) throw new Error('Invalid IMDF package: Input payload is empty');

    // 1. Normalize layers dictionary
    const layers: Record<string, any[]> = {
      venue: [],
      level: [],
      unit: [],
      opening: [],
      anchor: [],
      occupant: [],
      kiosk: [],
      fixture: [],
      footprint: [],
      building: [],
      node: [],
      pathway: []
    };

    const extractFeatures = (obj: any): any[] => {
      if (!obj) return [];
      if (Array.isArray(obj)) return obj;
      if (obj.type === 'FeatureCollection' && Array.isArray(obj.features)) return obj.features;
      if (obj.type === 'Feature') return [obj];
      if (obj.features && Array.isArray(obj.features)) return obj.features;
      return [];
    };

    // If input is a single FeatureCollection with mixed feature types
    if (rawInput.type === 'FeatureCollection' && Array.isArray(rawInput.features)) {
      for (const f of rawInput.features) {
        const fType = f.feature_type || f.properties?.feature_type || 'unit';
        const normKey = fType.toLowerCase().replace(/s$/, '');
        if (layers[normKey]) {
          layers[normKey].push(f);
        } else {
          layers.unit.push(f);
        }
      }
    } else {
      // Input is an object with layers (e.g. { "unit.geojson": ..., "level.geojson": ... } or { units: ..., levels: ... })
      for (const [key, val] of Object.entries(rawInput)) {
        const cleanKey = key.replace(/\.geojson$/i, '').replace(/\.json$/i, '').toLowerCase().replace(/s$/, '');
        const features = extractFeatures(val);
        if (layers[cleanKey]) {
          layers[cleanKey].push(...features);
        } else if (cleanKey === 'manifest') {
          // Keep manifest
        } else {
          // Unknown layer, if it has features treat as units
          if (features.length > 0) {
            layers.unit.push(...features);
          }
        }
      }
    }

    // 2. Identify Venue
    let venueId = venueIdOverride;
    if (!venueId) {
      const candidateId = rawInput.manifest?.venue_id || layers.venue[0]?.id;
      if (candidateId) {
        const existRes = await db.query('SELECT id FROM venues WHERE id = $1', [candidateId]);
        if (existRes.rows.length > 0) {
          venueId = `${candidateId}-${Date.now().toString(36).substring(4)}`;
        } else {
          venueId = candidateId;
        }
      } else {
        venueId = `venue-${Date.now()}`;
      }
    }

    const venueFeat = layers.venue[0];
    const venueName = IMDFService.parseName(venueFeat?.properties?.name) || 
                      IMDFService.parseName(layers.building[0]?.properties?.name) || 
                      (rawInput.manifest?.venue_id ? `Venue (${rawInput.manifest.venue_id})` : `Imported Venue (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);
    const rawCategory = venueFeat?.properties?.category || 'mall';
    const venueCategory = rawCategory.includes('health') ? 'hospital' : rawCategory.includes('shop') ? 'mall' : rawCategory.includes('transit') ? 'airport' : 'mall';
    const venueAddress = venueFeat?.properties?.address || 'Imported via IMDF standard';

    await db.query(
      `INSERT INTO venues (id, name, description, category, address)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         category = EXCLUDED.category,
         address = EXCLUDED.address`,
      [venueId, venueName, `Imported via Microsoft Places / IMDF standard on ${new Date().toLocaleDateString()}`, venueCategory, venueAddress]
    );

    // 3. Collect all coordinates to detect WGS-84 GPS vs Local Metric coordinates
    const allCoords: [number, number][] = [];
    const scanCoords = (geom: any) => {
      if (!geom || !geom.coordinates) return;
      const traverse = (c: any) => {
        if (Array.isArray(c) && typeof c[0] === 'number' && typeof c[1] === 'number') {
          allCoords.push([c[0], c[1]]);
        } else if (Array.isArray(c)) {
          c.forEach(traverse);
        }
      };
      traverse(geom.coordinates);
    };

    [...layers.unit, ...layers.opening, ...layers.anchor, ...layers.footprint, ...layers.node].forEach(f => scanCoords(f.geometry));

    // Check if coordinates are WGS-84 GPS degrees
    let isGPS = false;
    let minLng = 0, maxLng = 0, minLat = 0, maxLat = 0;
    let metersPerDegLng = 1, metersPerDegLat = 1;
    const paddingMeters = 5.0; // 5 meter margin

    if (allCoords.length > 0) {
      const lngs = allCoords.map(c => c[0]);
      const lats = allCoords.map(c => c[1]);
      minLng = Math.min(...lngs);
      maxLng = Math.max(...lngs);
      minLat = Math.min(...lats);
      maxLat = Math.max(...lats);

      isGPS = Math.abs(minLng) <= 180 && Math.abs(maxLng) <= 180 && Math.abs(minLat) <= 90 && Math.abs(maxLat) <= 90 && (Math.abs(minLng) > 0.001 || Math.abs(minLat) > 0.001);

      if (isGPS) {
        const centerLat = (minLat + maxLat) / 2;
        metersPerDegLat = 111320;
        metersPerDegLng = 111320 * Math.cos((centerLat * Math.PI) / 180);
      }
    }

    // Projection function from input coordinates to local floorplan metric meters [x, y]
    const projectPoint = (lng: number, lat: number): [number, number] => {
      if (isGPS) {
        const x = (lng - minLng) * metersPerDegLng + paddingMeters;
        const y = (maxLat - lat) * metersPerDegLat + paddingMeters; // Top-down SVG coordinate
        return [Math.round(x * 100) / 100, Math.round(y * 100) / 100];
      }
      return [lng, lat];
    };

    const projectGeometry = (geom: any): any => {
      if (!geom || !geom.coordinates) return geom;
      const transform = (c: any): any => {
        if (Array.isArray(c) && typeof c[0] === 'number' && typeof c[1] === 'number') {
          return projectPoint(c[0], c[1]);
        }
        if (Array.isArray(c)) {
          return c.map(transform);
        }
        return c;
      };
      return {
        ...geom,
        coordinates: transform(geom.coordinates)
      };
    };

    // Calculate dimensions in meters
    let calculatedWidthMeters = 80;
    let calculatedHeightMeters = 60;
    if (allCoords.length > 0) {
      if (isGPS) {
        calculatedWidthMeters = Math.max(20, Math.round((maxLng - minLng) * metersPerDegLng + paddingMeters * 2));
        calculatedHeightMeters = Math.max(20, Math.round((maxLat - minLat) * metersPerDegLat + paddingMeters * 2));
      } else {
        calculatedWidthMeters = Math.max(20, Math.round(maxLng + paddingMeters));
        calculatedHeightMeters = Math.max(20, Math.round(maxLat + paddingMeters));
      }
    }
    const calculatedScale = Math.min(Math.max(1000 / calculatedWidthMeters, 10), 30);

    // 4. Process Levels
    const levelIds: string[] = [];
    const levelFeatures = layers.level;

    if (levelFeatures.length === 0) {
      const defaultLvlId = `level-${venueId}-l1`;
      levelIds.push(defaultLvlId);
      await db.query(
        `INSERT INTO levels (id, venue_id, ordinal, name, short_name, scale_pixels_per_meter, width_meters, height_meters)
         VALUES ($1, $2, 0, 'Main Floor', 'L1', $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           scale_pixels_per_meter = EXCLUDED.scale_pixels_per_meter,
           width_meters = EXCLUDED.width_meters,
           height_meters = EXCLUDED.height_meters`,
        [defaultLvlId, venueId, calculatedScale, calculatedWidthMeters, calculatedHeightMeters]
      );
    } else {
      // Sort levels by ordinal
      levelFeatures.sort((a, b) => (a.properties?.ordinal ?? 0) - (b.properties?.ordinal ?? 0));

      for (let i = 0; i < levelFeatures.length; i++) {
        const lvl = levelFeatures[i];
        const lvlId = lvl.id || `level-${venueId}-${lvl.properties?.ordinal ?? i}`;
        levelIds.push(lvlId);
        const ordinal = lvl.properties?.ordinal !== undefined ? lvl.properties.ordinal : i;
        const name = IMDFService.parseName(lvl.properties?.name) || `Level ${ordinal >= 0 ? ordinal + 1 : ordinal}`;
        const shortName = IMDFService.parseName(lvl.properties?.short_name) || `L${ordinal >= 0 ? ordinal + 1 : ordinal}`;

        await db.query(
          `INSERT INTO levels (id, venue_id, ordinal, name, short_name, scale_pixels_per_meter, width_meters, height_meters)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
             ordinal = EXCLUDED.ordinal,
             name = EXCLUDED.name,
             short_name = EXCLUDED.short_name,
             scale_pixels_per_meter = EXCLUDED.scale_pixels_per_meter,
             width_meters = EXCLUDED.width_meters,
             height_meters = EXCLUDED.height_meters`,
          [lvlId, venueId, ordinal, name, shortName, calculatedScale, calculatedWidthMeters, calculatedHeightMeters]
        );
      }
    }

    const defaultLevelId = levelIds[0];

    // 5. Process Units (Rooms)
    const unitFeatures = layers.unit;
    const unitMap = new Map<string, { id: string; name: string; category: string; centroid: [number, number]; levelId: string; isAcc: boolean }>();

    for (const u of unitFeatures) {
      const uId = u.id || `unit-${uuidv4().substring(0, 8)}`;
      let levelId = u.properties?.level_id;
      if (!levelId || !levelIds.includes(levelId)) {
        levelId = defaultLevelId;
      }

      const rawName = IMDFService.parseName(u.properties?.name);
      const rawCategory = (u.properties?.category || 'room').toLowerCase();
      let category = 'room';
      if (rawCategory.includes('restroom') || rawCategory.includes('toilet') || rawCategory.includes('wc')) category = 'restroom';
      else if (rawCategory.includes('food') || rawCategory.includes('cafe') || rawCategory.includes('restaurant') || rawCategory.includes('kitchen')) category = 'food';
      else if (rawCategory.includes('clinic') || rawCategory.includes('first_aid') || rawCategory.includes('medical')) category = 'clinic';
      else if (rawCategory.includes('elevator') || rawCategory.includes('lift')) category = 'elevator';
      else if (rawCategory.includes('stair')) category = 'stairs';
      else if (rawCategory.includes('stage') || rawCategory.includes('auditorium')) category = 'stage';

      const isAcc = u.properties?.accessibility?.includes('wheelchair') || category === 'elevator';
      const name = rawName || (category === 'restroom' ? 'Restroom' : category === 'elevator' ? 'Elevator Core' : category === 'stairs' ? 'Stairwell' : `Room ${uId.substring(0, 4).toUpperCase()}`);
      
      const projectedGeometry = projectGeometry(u.geometry || { type: 'Polygon', coordinates: [] });

      // Compute centroid for POI / Door Node placement
      let cx = 10, cy = 10;
      if (projectedGeometry.coordinates && projectedGeometry.coordinates[0] && Array.isArray(projectedGeometry.coordinates[0])) {
        const ring = projectedGeometry.coordinates[0];
        let sx = 0, sy = 0, count = 0;
        for (const pt of ring) {
          if (Array.isArray(pt) && typeof pt[0] === 'number') {
            sx += pt[0];
            sy += pt[1];
            count++;
          }
        }
        if (count > 0) {
          cx = Math.round((sx / count) * 100) / 100;
          cy = Math.round((sy / count) * 100) / 100;
        }
      }

      const color = u.properties?.color || (
        category === 'restroom' ? '#f3e8ff' :
        category === 'food' ? '#fed7aa' :
        category === 'clinic' ? '#fee2e2' :
        category === 'elevator' ? '#e0e7ff' :
        category === 'stairs' ? '#fef3c7' :
        category === 'stage' ? '#fce7f3' : '#e0f2fe'
      );

      unitMap.set(uId, { id: uId, name, category, centroid: [cx, cy], levelId, isAcc });

      await db.query(
        `INSERT INTO units (id, level_id, venue_id, name, category, accessibility_type, geometry_geojson, color)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           category = EXCLUDED.category,
           accessibility_type = EXCLUDED.accessibility_type,
           geometry_geojson = EXCLUDED.geometry_geojson,
           color = EXCLUDED.color`,
        [uId, levelId, venueId, name, category, isAcc ? 'accessible' : 'standard', JSON.stringify(projectedGeometry), color]
      );
    }

    // 6. Process Anchors & Kiosks as Points of Interest (POIs)
    const anchorFeatures = [...layers.anchor, ...layers.kiosk, ...layers.fixture];
    for (const a of anchorFeatures) {
      const aName = IMDFService.parseName(a.properties?.name);
      if (!aName) continue;

      let levelId = a.properties?.level_id || defaultLevelId;
      if (!levelIds.includes(levelId)) levelId = defaultLevelId;

      let [ax, ay] = [20, 20];
      if (a.geometry?.coordinates) {
        const pt = projectPoint(a.geometry.coordinates[0], a.geometry.coordinates[1]);
        ax = pt[0];
        ay = pt[1];
      }

      const aId = a.id || `poi-${uuidv4().substring(0, 8)}`;
      await db.query(
        `INSERT INTO pois (id, venue_id, level_id, name, category, is_accessible, icon, x_meters, y_meters, description)
         VALUES ($1, $2, $3, $4, 'info', true, 'map-pin', $5, $6, 'Imported IMDF Anchor Point')
         ON CONFLICT (id) DO NOTHING`,
        [aId, venueId, levelId, aName, ax, ay]
      );
    }

    // Also register every named room unit as a searchable POI
    for (const u of unitMap.values()) {
      const poiId = `poi-${uuidv4().substring(0, 12)}`;
      const icon = u.category === 'restroom' ? 'bath' : u.category === 'food' ? 'utensils' : u.category === 'clinic' ? 'cross' : u.category === 'elevator' ? 'elevator' : 'door-closed';

      await db.query(
        `INSERT INTO pois (id, venue_id, level_id, name, category, is_accessible, icon, x_meters, y_meters, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           category = EXCLUDED.category,
           x_meters = EXCLUDED.x_meters,
           y_meters = EXCLUDED.y_meters`,
        [poiId, venueId, u.levelId, u.name, u.category, u.isAcc, icon, u.centroid[0], u.centroid[1], `${u.name} (${u.category})`]
      );
    }

    // 7. Process Nodes & Pathways (or Auto-Generate Mesh if not present)
    const nodeFeatures = layers.node;
    const pathwayFeatures = layers.pathway;
    const openingFeatures = layers.opening;

    let createdNodesCount = 0;
    let createdPathwaysCount = 0;

    if (nodeFeatures.length > 0) {
      // Use existing nodes
      for (const n of nodeFeatures) {
        const nId = n.id || `node-${uuidv4().substring(0, 12)}`;
        let levelId = n.properties?.level_id || defaultLevelId;
        if (!levelIds.includes(levelId)) levelId = defaultLevelId;

        const coords = n.geometry?.coordinates ? projectPoint(n.geometry.coordinates[0], n.geometry.coordinates[1]) : [40, 20];
        const nodeType = n.properties?.node_type || 'hallway';
        const isAcc = n.properties?.accessibility ? n.properties.accessibility.includes('wheelchair') : (nodeType !== 'stair_landing');
        const name = n.properties?.name || undefined;

        await db.query(
          `INSERT INTO nodes (id, level_id, venue_id, x_meters, y_meters, node_type, is_accessible, name)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
             x_meters = EXCLUDED.x_meters,
             y_meters = EXCLUDED.y_meters,
             node_type = EXCLUDED.node_type`,
          [nId, levelId, venueId, coords[0], coords[1], nodeType, isAcc, name]
        );
        createdNodesCount++;
      }
    }

    if (pathwayFeatures.length > 0) {
      // Use existing pathways
      for (const p of pathwayFeatures) {
        const eId = p.id || `edge-${uuidv4().substring(0, 12)}`;
        const fromId = p.properties?.from_node_id;
        const toId = p.properties?.to_node_id;
        if (!fromId || !toId) continue;

        const edgeType = p.properties?.category || 'walkway';
        const dist = p.properties?.distance_meters || 5.0;
        const isAcc = p.properties?.accessibility ? p.properties.accessibility.includes('wheelchair') : (edgeType !== 'stairs');
        const isBidi = p.properties?.direction !== 'unidirectional';
        const vGroup = p.properties?.vertical_connector_group || null;

        await db.query(
          `INSERT INTO edges (id, venue_id, from_node_id, to_node_id, edge_type, distance_meters, is_accessible, bidirectional, vertical_connector_group)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO NOTHING`,
          [eId, venueId, fromId, toId, edgeType, dist, isAcc, isBidi, vGroup]
        );
        createdPathwaysCount++;
      }
    }

    // If no nodes/pathways were provided in the IMDF (standard for Microsoft Places / Apple IMDF files):
    // Auto-generate navigation nodes at unit centroids and openings so routing is instantly functional
    if (nodeFeatures.length === 0) {
      const generatedNodes: { id: string; levelId: string; x: number; y: number; type: string; isAcc: boolean; name: string }[] = [];

      // 1. Create door nodes for each room
      for (const u of unitMap.values()) {
        const nId = `node-${uuidv4().substring(0, 12)}`;
        const nodeType = u.category === 'elevator' ? 'elevator_door' : u.category === 'stairs' ? 'stair_landing' : 'room_entry';
        
        await db.query(
          `INSERT INTO nodes (id, level_id, venue_id, x_meters, y_meters, node_type, is_accessible, name)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO NOTHING`,
          [nId, u.levelId, venueId, u.centroid[0], u.centroid[1], nodeType, u.isAcc, `${u.name} Door`]
        );
        generatedNodes.push({ id: nId, levelId: u.levelId, x: u.centroid[0], y: u.centroid[1], type: nodeType, isAcc: u.isAcc, name: u.name });
        createdNodesCount++;
      }

      // 2. Create nodes for openings if present
      for (const op of openingFeatures) {
        let levelId = op.properties?.level_id || defaultLevelId;
        if (!levelIds.includes(levelId)) levelId = defaultLevelId;

        if (op.geometry?.coordinates) {
          const pt = projectPoint(op.geometry.coordinates[0], op.geometry.coordinates[1]);
          const opId = op.id || `node-${uuidv4().substring(0, 12)}`;
          await db.query(
            `INSERT INTO nodes (id, level_id, venue_id, x_meters, y_meters, node_type, is_accessible, name)
             VALUES ($1, $2, $3, $4, $5, 'hallway', true, 'Opening')
             ON CONFLICT (id) DO NOTHING`,
            [opId, levelId, venueId, pt[0], pt[1]]
          );
          generatedNodes.push({ id: opId, levelId, x: pt[0], y: pt[1], type: 'hallway', isAcc: true, name: 'Opening' });
          createdNodesCount++;
        }
      }

      // 3. Connect nodes on the same level with walkable pathways (connecting nodes within proximity or spanning corridor)
      const nodesByLevel = new Map<string, typeof generatedNodes>();
      for (const n of generatedNodes) {
        if (!nodesByLevel.has(n.levelId)) nodesByLevel.set(n.levelId, []);
        nodesByLevel.get(n.levelId)!.push(n);
      }

      for (const [lvlId, lvlNodes] of nodesByLevel.entries()) {
        if (lvlNodes.length < 2) continue;

        // Build a minimum spanning proximity graph so all rooms are connected to corridors
        for (let i = 0; i < lvlNodes.length; i++) {
          // Find 2-3 closest neighbors for each node
          const distances = lvlNodes
            .map((other, idx) => {
              if (idx === i) return { other, dist: Infinity };
              const d = Math.sqrt(Math.pow(lvlNodes[i].x - other.x, 2) + Math.pow(lvlNodes[i].y - other.y, 2));
              return { other, dist: d };
            })
            .sort((a, b) => a.dist - b.dist);

          const connectCount = Math.min(3, distances.length);
          for (let k = 0; k < connectCount; k++) {
            const target = distances[k];
            if (target.dist < 50) { // Connect nodes within 50 meters
              const edgeId = `edge-${uuidv4().substring(0, 12)}`;
              const isAcc = lvlNodes[i].isAcc && target.other.isAcc;
              await db.query(
                `INSERT INTO edges (id, venue_id, from_node_id, to_node_id, edge_type, distance_meters, is_accessible, bidirectional)
                 VALUES ($1, $2, $3, $4, 'walkway', $5, $6, true)
                 ON CONFLICT (id) DO NOTHING`,
                [edgeId, venueId, lvlNodes[i].id, target.other.id, Math.max(1, Math.round(target.dist * 10) / 10), isAcc]
              );
              createdPathwaysCount++;
            }
          }
        }
      }
    }

    return {
      success: true,
      venueId,
      imported: {
        levels: levelIds.length,
        units: unitFeatures.length,
        anchors: anchorFeatures.length,
        nodes: createdNodesCount,
        pathways: createdPathwaysCount
      }
    };
  }
}
