import { performance } from 'perf_hooks';
import os from 'os';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { getDB } from '../src/db/database.js';
import { seedDatabase } from '../src/db/seedData.js';
import { RoutingService } from '../src/services/routingService.js';
import { VenueService } from '../src/services/venueService.js';
import { GraphBuilder } from '../src/algorithms/GraphBuilder.js';
import { venuesRouter } from '../src/routes/venues.js';
import { routeRouter } from '../src/routes/route.js';
import { poisRouter } from '../src/routes/pois.js';
import { checkpointsRouter } from '../src/routes/checkpoints.js';

interface Stats {
  min: number;
  max: number;
  avg: number;
  median: number;
  p95: number;
  raw: number[];
}

function calculateStats(times: number[]): Stats {
  const sorted = [...times].sort((a, b) => a - b);
  const min = Math.min(...sorted);
  const max = Math.max(...sorted);
  const avg = sorted.reduce((acc, val) => acc + val, 0) / sorted.length;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const p95Index = Math.min(Math.floor(sorted.length * 0.95), sorted.length - 1);
  const p95 = sorted[p95Index];

  return {
    min: Number(min.toFixed(3)),
    max: Number(max.toFixed(3)),
    avg: Number(avg.toFixed(3)),
    median: Number(median.toFixed(3)),
    p95: Number(p95.toFixed(3)),
    raw: sorted.map(t => Number(t.toFixed(3)))
  };
}

async function httpRequest(url: string, options: { method: string; body?: any }): Promise<{ status: number; duration: number; data: any }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const postData = options.body ? JSON.stringify(options.body) : '';
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const start = performance.now();
    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const duration = performance.now() - start;
        try {
          const parsedData = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode || 200, duration, data: parsedData });
        } catch {
          resolve({ status: res.statusCode || 200, duration, data: body });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

export async function runBenchmark(label: string = 'BASELINE') {
  console.log(`\n======================================================`);
  console.log(` RUNNING REAL PERFORMANCE BENCHMARK: ${label}`);
  console.log(`======================================================\n`);

  // Environment specs
  const cpus = os.cpus();
  const envInfo = {
    cpu: cpus.length > 0 ? `${cpus[0].model} (${cpus.length} cores)` : 'Unknown CPU',
    ram: `${(os.totalmem() / (1024 ** 3)).toFixed(2)} GB`,
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    nodeVersion: process.version,
    databaseMode: 'Embedded PostgreSQL (PGlite WASM with persistent file storage)',
    dataset: 'Metropolis Health & Science Center (3 floors, 30+ rooms, 50+ waypoints, 70+ edges, 20+ POIs)',
    iterations: 30,
    timestamp: new Date().toISOString()
  };

  console.log('Environment Details:');
  console.log(` - CPU:          ${envInfo.cpu}`);
  console.log(` - RAM:          ${envInfo.ram}`);
  console.log(` - OS:           ${envInfo.os}`);
  console.log(` - Node.js:      ${envInfo.nodeVersion}`);
  console.log(` - Database:     ${envInfo.databaseMode}`);
  console.log(` - Venue:        ${envInfo.dataset}`);
  console.log(` - Iterations:   ${envInfo.iterations}`);
  console.log(` - Timestamp:    ${envInfo.timestamp}\n`);

  const db = await getDB();
  await seedDatabase(db);

  // Setup test Express server for realistic end-to-end API benchmarks
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/venues', venuesRouter);
  app.use('/api/venues', routeRouter);
  app.use('/api/venues', poisRouter);
  app.use('/api/venues', checkpointsRouter);

  const testPort = 4099;
  const server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(testPort, () => resolve(s));
  });

  const venueId = 'venue-metropolis-medical';
  const level1Id = 'level-metro-l1';
  const ITERATIONS = envInfo.iterations;

  try {
    // ----------------------------------------------------
    // 1. COLD ROUTE VS WARM ROUTE (EXISTING CACHING)
    // ----------------------------------------------------
    console.log('[1/5] Measuring Cold vs Warm Route Performance...');
    
    // Invalidate cache first to guarantee genuine cold start
    RoutingService.invalidateCache(venueId);
    
    const coldStart = performance.now();
    const coldResult = await RoutingService.calculateRoute(db, venueId, {
      startNodeId: 'node-l1-entrance',
      targetNodeId: 'node-l1-pharmacy-door',
      accessibleOnly: false
    });
    const coldDuration = performance.now() - coldStart;

    if (!coldResult.success) throw new Error('Cold route failed: ' + coldResult.error);

    // Warm iterations (repeating same route with graph cached in memory)
    const warmTimes: number[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      const res = await RoutingService.calculateRoute(db, venueId, {
        startNodeId: 'node-l1-entrance',
        targetNodeId: 'node-l1-pharmacy-door',
        accessibleOnly: false
      });
      const t1 = performance.now();
      if (!res.success) throw new Error('Warm route failed at iter ' + i);
      warmTimes.push(t1 - t0);
    }
    const warmStats = calculateStats(warmTimes);

    // ----------------------------------------------------
    // 2. MULTI-FLOOR ROUTE (Level 1 Entrance -> Level 3 Cafeteria)
    // ----------------------------------------------------
    console.log('[2/5] Measuring Multi-Floor Route (Level 1 -> Level 3)...');
    
    // Cold multi-floor (with cache invalidated)
    RoutingService.invalidateCache(venueId);
    const coldMultiStart = performance.now();
    const coldMultiResult = await RoutingService.calculateRoute(db, venueId, {
      startNodeId: 'node-l1-entrance',
      targetNodeId: 'node-l3-cafeteria-door',
      accessibleOnly: false
    });
    const coldMultiDuration = performance.now() - coldMultiStart;
    if (!coldMultiResult.success) throw new Error('Cold multi-floor failed');

    // Warm multi-floor iterations
    const multiFloorTimes: number[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      const res = await RoutingService.calculateRoute(db, venueId, {
        startNodeId: 'node-l1-entrance',
        targetNodeId: 'node-l3-cafeteria-door',
        accessibleOnly: false
      });
      const t1 = performance.now();
      if (!res.success) throw new Error('Multi-floor route failed at iter ' + i);
      multiFloorTimes.push(t1 - t0);
    }
    const multiFloorStats = calculateStats(multiFloorTimes);

    // Multi-floor with accessibility constraint (Wheelchair mode)
    const accessibleMultiFloorTimes: number[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      const res = await RoutingService.calculateRoute(db, venueId, {
        startNodeId: 'node-l1-entrance',
        targetNodeId: 'node-l3-cafeteria-door',
        accessibleOnly: true
      });
      const t1 = performance.now();
      if (!res.success) throw new Error('Accessible route failed at iter ' + i);
      accessibleMultiFloorTimes.push(t1 - t0);
    }
    const accessibleMultiFloorStats = calculateStats(accessibleMultiFloorTimes);

    // ----------------------------------------------------
    // 3. POI SEARCH RESPONSE TIME
    // ----------------------------------------------------
    console.log('[3/5] Measuring POI Search Response Times...');
    const poiSearchTimes: number[] = [];
    const searchTerms = ['clinic', 'pharmacy', 'emergency', 'cafeteria', 'radiology'];
    for (let i = 0; i < ITERATIONS; i++) {
      const query = searchTerms[i % searchTerms.length];
      const t0 = performance.now();
      const res = await httpRequest(`http://localhost:${testPort}/api/venues/${venueId}/pois?query=${query}`, { method: 'GET' });
      const t1 = performance.now();
      if (res.status !== 200) throw new Error('POI search failed: ' + res.status);
      poiSearchTimes.push(t1 - t0);
    }
    const poiSearchStats = calculateStats(poiSearchTimes);

    // ----------------------------------------------------
    // 4. VENUE / MAP DATA LOADING TIME (getLevelMap)
    // ----------------------------------------------------
    console.log('[4/5] Measuring Venue & Floor Map Data Loading Time...');
    const mapLoadingTimes: number[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      const res = await VenueService.getLevelMap(db, venueId, level1Id);
      const t1 = performance.now();
      if (!res) throw new Error('Map loading failed');
      mapLoadingTimes.push(t1 - t0);
    }
    const mapLoadingStats = calculateStats(mapLoadingTimes);

    // ----------------------------------------------------
    // 5. END-TO-END HTTP API RESPONSE TIME
    // ----------------------------------------------------
    console.log('[5/5] Measuring End-to-End HTTP API Route Endpoint Time...');
    const apiRouteTimes: number[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      const res = await httpRequest(`http://localhost:${testPort}/api/venues/${venueId}/route`, {
        method: 'POST',
        body: {
          startNodeId: 'node-l1-entrance',
          targetNodeId: 'node-l1-pharmacy-door',
          accessibleOnly: false
        }
      });
      const t1 = performance.now();
      if (res.status !== 200) throw new Error('API route failed: ' + res.status);
      apiRouteTimes.push(t1 - t0);
    }
    const apiRouteStats = calculateStats(apiRouteTimes);

    // API multi-floor endpoint
    const apiMultiFloorTimes: number[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      const res = await httpRequest(`http://localhost:${testPort}/api/venues/${venueId}/route`, {
        method: 'POST',
        body: {
          startNodeId: 'node-l1-entrance',
          targetNodeId: 'node-l3-cafeteria-door',
          accessibleOnly: false
        }
      });
      const t1 = performance.now();
      if (res.status !== 200) throw new Error('API multi-floor route failed: ' + res.status);
      apiMultiFloorTimes.push(t1 - t0);
    }
    const apiMultiFloorStats = calculateStats(apiMultiFloorTimes);

    // API Venue details + Level 1 Map endpoint
    const apiMapEndpointTimes: number[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      const res = await httpRequest(`http://localhost:${testPort}/api/venues/${venueId}/levels/${level1Id}/map`, {
        method: 'GET'
      });
      const t1 = performance.now();
      if (res.status !== 200) throw new Error('API map endpoint failed: ' + res.status);
      apiMapEndpointTimes.push(t1 - t0);
    }
    const apiMapEndpointStats = calculateStats(apiMapEndpointTimes);

    const report = {
      environment: envInfo,
      coldExecution: {
        singleFloorColdMs: Number(coldDuration.toFixed(3)),
        multiFloorColdMs: Number(coldMultiDuration.toFixed(3))
      },
      warmExecution: {
        singleFloorRoute: warmStats,
        multiFloorRoute: multiFloorStats,
        accessibleMultiFloorRoute: accessibleMultiFloorStats,
        poiSearch: poiSearchStats,
        mapDataLoading: mapLoadingStats,
        apiSingleFloorRoute: apiRouteStats,
        apiMultiFloorRoute: apiMultiFloorStats,
        apiMapEndpoint: apiMapEndpointStats
      }
    };

    console.log('\n======================================================');
    console.log(` BENCHMARK RESULTS FOR: ${label}`);
    console.log('======================================================');
    console.log(JSON.stringify(report, null, 2));

    return report;
  } finally {
    server.close();
  }
}

// Run directly if invoked via CLI
if (process.argv[1]?.includes('benchmark')) {
  runBenchmark(process.argv[2] || 'BASELINE')
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Benchmark error:', err);
      process.exit(1);
    });
}
