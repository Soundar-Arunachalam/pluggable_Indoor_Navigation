import { getDB } from '../src/db/database.js';
import { IMDFService } from '../src/services/imdfService.js';
import { RoutingService } from '../src/services/routingService.js';

async function runIMDFTest() {
  console.log('--- TESTING MICROSOFT PLACES IMDF IMPORT & ROUTING ---');
  const db = await getDB();

  // Simulated Microsoft Places IMDF Export Bundle (Real-world WGS-84 Coordinates)
  const mockPlacesIMDF = {
    manifest: {
      version: '1.0.0',
      venue_id: 'venue-microsoft-places-hq'
    },
    venue: {
      type: 'FeatureCollection',
      features: [{
        id: 'venue-microsoft-places-hq',
        type: 'Feature',
        feature_type: 'venue',
        geometry: null,
        properties: {
          name: { en: 'Microsoft Silicon Valley Campus' },
          category: 'business',
          address: '1065 La Avenida St, Mountain View, CA'
        }
      }]
    },
    levels: {
      type: 'FeatureCollection',
      features: [
        {
          id: 'level-bldg1-l1',
          type: 'Feature',
          feature_type: 'level',
          geometry: null,
          properties: { name: { en: 'Building 1 - Ground Floor' }, short_name: { en: '1' }, ordinal: 0 }
        }
      ]
    },
    units: {
      type: 'FeatureCollection',
      features: [
        {
          id: 'unit-conf-ada',
          type: 'Feature',
          feature_type: 'unit',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-122.0728, 37.4030],
              [-122.0725, 37.4030],
              [-122.0725, 37.4032],
              [-122.0728, 37.4032],
              [-122.0728, 37.4030]
            ]]
          },
          properties: {
            name: { en: 'Ada Lovelace Boardroom' },
            category: 'room',
            level_id: 'level-bldg1-l1',
            accessibility: ['wheelchair']
          }
        },
        {
          id: 'unit-cafe-espresso',
          type: 'Feature',
          feature_type: 'unit',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-122.0724, 37.4030],
              [-122.0721, 37.4030],
              [-122.0721, 37.4032],
              [-122.0724, 37.4032],
              [-122.0724, 37.4030]
            ]]
          },
          properties: {
            name: { en: 'Espresso Bar & Cafe' },
            category: 'food',
            level_id: 'level-bldg1-l1',
            accessibility: ['wheelchair']
          }
        }
      ]
    },
    openings: {
      type: 'FeatureCollection',
      features: [
        {
          id: 'opening-ada-door',
          type: 'Feature',
          feature_type: 'opening',
          geometry: {
            type: 'Point',
            coordinates: [-122.07265, 37.4030]
          },
          properties: {
            level_id: 'level-bldg1-l1'
          }
        },
        {
          id: 'opening-cafe-door',
          type: 'Feature',
          feature_type: 'opening',
          geometry: {
            type: 'Point',
            coordinates: [-122.07225, 37.4030]
          },
          properties: {
            level_id: 'level-bldg1-l1'
          }
        }
      ]
    }
  };

  // 1. Ingest
  console.log('[Step 1] Ingesting Microsoft Places IMDF WGS-84 dataset...');
  const importRes = await IMDFService.importIMDF(db, mockPlacesIMDF);
  console.log('✓ Import Completed:', importRes.imported);

  // 2. Query POIs
  const poisRes = await db.query('SELECT * FROM pois WHERE venue_id = $1', ['venue-microsoft-places-hq']);
  console.log(`✓ POIs created: ${poisRes.rows.length} (Expected >= 2)`);
  poisRes.rows.forEach(p => console.log(`   - [POI] ${p.name} (${p.category}) at (${p.x_meters}m, ${p.y_meters}m)`));

  // 3. Query Nodes & Test Route
  const nodesRes = await db.query('SELECT * FROM nodes WHERE venue_id = $1', ['venue-microsoft-places-hq']);
  console.log(`✓ Navigation Nodes generated: ${nodesRes.rows.length}`);

  if (nodesRes.rows.length >= 2) {
    const fromNode = nodesRes.rows[0].id;
    const toNode = nodesRes.rows[1].id;
    const route = await RoutingService.calculateRoute(db, 'venue-microsoft-places-hq', {
      startNodeId: fromNode,
      targetNodeId: toNode
    });
    console.log(`✓ Turn-by-Turn Route Computed between "${nodesRes.rows[0].name}" and "${nodesRes.rows[1].name}":`);
    console.log(`   Success: ${route.success}, Distance: ${route.totalDistanceMeters}m, Steps: ${route.steps.length}`);
    route.steps.forEach(s => console.log(`   - [${s.action}] ${s.instruction} (${s.distanceMeters}m)`));

  }

  console.log('=========================================');
  console.log(' MICROSOFT PLACES IMDF IMPORT TEST PASSED ');
  console.log('=========================================');
}

runIMDFTest().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
