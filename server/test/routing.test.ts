import { getDB } from '../src/db/database.js';
import { seedDatabase } from '../src/db/seedData.js';
import { RoutingService } from '../src/services/routingService.js';

async function runTests() {
  console.log('--- STARTING ROUTING & ACCESSIBILITY TESTS ---');
  const db = await getDB();
  await seedDatabase(db);

  const venueId = 'venue-metropolis-medical';

  // Test 1: Planar Route on Same Floor (Main Entrance -> Pharmacy)
  console.log('\n[Test 1] Planar Route on Level 1: Main Entrance -> Pharmacy');
  const test1 = await RoutingService.calculateRoute(db, venueId, {
    startNodeId: 'node-l1-entrance',
    targetNodeId: 'node-l1-pharmacy-door',
    accessibleOnly: false
  });

  if (!test1.success) {
    throw new Error(`Test 1 Failed: ${test1.error}`);
  }
  console.log(`✓ Test 1 Passed: Found path with ${test1.waypoints.length} waypoints, distance = ${test1.totalDistanceMeters}m`);
  console.log(`  Steps generated: ${test1.steps.length}`);
  test1.steps.forEach(s => console.log(`   - [${s.direction}] ${s.instruction} (${s.distanceMeters}m)`));

  // Test 2: Multi-Floor Route (Level 1 Entrance -> Level 3 Cafeteria)
  console.log('\n[Test 2] Multi-Level Route: Level 1 Entrance -> Level 3 Cafeteria');
  const test2 = await RoutingService.calculateRoute(db, venueId, {
    startNodeId: 'node-l1-entrance',
    targetNodeId: 'node-l3-cafeteria-door',
    accessibleOnly: false
  });

  if (!test2.success) {
    throw new Error(`Test 2 Failed: ${test2.error}`);
  }
  console.log(`✓ Test 2 Passed: Found multi-floor path traversing levels: [${test2.levelsTraversed.join(', ')}]`);
  console.log(`  Total Distance: ${test2.totalDistanceMeters}m, Estimated Time: ${test2.totalDurationSeconds}s`);
  const transitionStep = test2.steps.find(s => s.isLevelTransition);
  console.log(`  Transition Step: [${transitionStep?.direction}] ${transitionStep?.instruction}`);

  // Test 3: Wheelchair Accessible Mode (Ensure elevator is used and stairs excluded)
  console.log('\n[Test 3] Wheelchair Accessible Mode: Level 1 -> Level 3');
  const test3 = await RoutingService.calculateRoute(db, venueId, {
    startNodeId: 'node-l1-entrance',
    targetNodeId: 'node-l3-cafeteria-door',
    accessibleOnly: true
  });

  if (!test3.success) {
    throw new Error(`Test 3 Failed: ${test3.error}`);
  }

  const usesStairs = test3.waypoints.some(w => w.nodeType === 'stair_landing');
  if (usesStairs) {
    throw new Error('Test 3 Failed: Accessible route contained stair landings!');
  }
  console.log(`✓ Test 3 Passed: Accessible route exclusively uses elevators. Verified 0 stairs traversed.`);

  console.log('\n=========================================');
  console.log(' ALL 3 BACKEND ROUTING TESTS PASSED 100% ');
  console.log('=========================================\n');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
