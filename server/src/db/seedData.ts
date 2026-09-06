import { DBClient } from './database.js';

export async function seedDatabase(db: DBClient) {
  // Check if venues already exist
  const existing = await db.query('SELECT COUNT(*) as count FROM venues');
  if (parseInt((existing.rows[0] as any).count, 10) > 0) {
    console.log('[PostgreSQL] Database already seeded with pilot venues.');
    return;
  }

  console.log('[PostgreSQL] Seeding pilot venues into PostgreSQL...');

  // ==========================================
  // VENUE 1: Metropolis Health & Science Center
  // ==========================================
  const venue1Id = 'venue-metropolis-medical';
  await db.query(
    `INSERT INTO venues (id, name, description, category, address)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      venue1Id,
      'Metropolis Health & Science Center',
      'A modern 3-story hospital and clinical research facility with multi-wing accessible indoor wayfinding.',
      'hospital',
      '500 Innovation Blvd, Metropolis, NY 10001'
    ]
  );

  // Levels for Venue 1
  const v1L1 = 'level-metro-l1';
  const v1L2 = 'level-metro-l2';
  const v1L3 = 'level-metro-l3';

  await db.query(
    `INSERT INTO levels (id, venue_id, ordinal, name, short_name, scale_pixels_per_meter, width_meters, height_meters)
     VALUES 
     ($1, $2, 0, 'Level 1 - Main Lobby & Diagnostics', 'L1', 20.0, 80.0, 60.0),
     ($3, $2, 1, 'Level 2 - Specialized Clinics & Care', 'L2', 20.0, 80.0, 60.0),
     ($4, $2, 2, 'Level 3 - Surgery, Inpatient & Dining', 'L3', 20.0, 80.0, 60.0)`,
    [v1L1, venue1Id, v1L2, v1L3]
  );

  // --- Units (Rooms/Polygons) for Level 1 ---
  const unitsL1 = [
    {
      id: 'unit-l1-entrance',
      name: 'Main Entrance & Atrium',
      category: 'reception',
      accessibility: 'accessible',
      color: '#e0f2fe',
      coords: [[[35, 5], [45, 5], [45, 15], [35, 15], [35, 5]]]
    },
    {
      id: 'unit-l1-pharmacy',
      name: 'Outpatient Pharmacy',
      category: 'room',
      accessibility: 'accessible',
      color: '#dcfce7',
      coords: [[[10, 10], [30, 10], [30, 25], [10, 25], [10, 10]]]
    },
    {
      id: 'unit-l1-radiology',
      name: 'Radiology & MRI Imaging Suite',
      category: 'clinic',
      accessibility: 'accessible',
      color: '#fef3c7',
      coords: [[[50, 10], [70, 10], [70, 30], [50, 30], [50, 10]]]
    },
    {
      id: 'unit-l1-emergency',
      name: 'Emergency Triage Wing',
      category: 'clinic',
      accessibility: 'accessible',
      color: '#fee2e2',
      coords: [[[10, 35], [30, 35], [30, 55], [10, 55], [10, 35]]]
    },
    {
      id: 'unit-l1-restroom-acc',
      name: 'Accessible Restroom North',
      category: 'restroom',
      accessibility: 'accessible',
      color: '#f3e8ff',
      coords: [[[32, 25], [38, 25], [38, 32], [32, 32], [32, 25]]]
    },
    {
      id: 'unit-l1-restroom-public',
      name: 'Public Restrooms South',
      category: 'restroom',
      accessibility: 'standard',
      color: '#f3e8ff',
      coords: [[[42, 25], [48, 25], [48, 32], [42, 32], [42, 25]]]
    },
    {
      id: 'unit-l1-elev-north',
      name: 'North Elevator Core',
      category: 'elevator',
      accessibility: 'accessible',
      color: '#c7d2fe',
      coords: [[[34, 38], [39, 38], [39, 44], [34, 44], [34, 38]]]
    },
    {
      id: 'unit-l1-stairs-west',
      name: 'West Stairwell A',
      category: 'stairs',
      accessibility: 'stair_only',
      color: '#fed7aa',
      coords: [[[41, 38], [46, 38], [46, 44], [41, 44], [41, 38]]]
    },
    {
      id: 'unit-l1-elev-south',
      name: 'South Elevator Core',
      category: 'elevator',
      accessibility: 'accessible',
      color: '#c7d2fe',
      coords: [[[65, 38], [70, 38], [70, 44], [65, 44], [65, 38]]]
    }
  ];

  for (const u of unitsL1) {
    await db.query(
      `INSERT INTO units (id, level_id, venue_id, name, category, accessibility_type, geometry_geojson, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [u.id, v1L1, venue1Id, u.name, u.category, u.accessibility, JSON.stringify({ type: 'Polygon', coordinates: u.coords }), u.color]
    );
  }

  // --- Units for Level 2 ---
  const unitsL2 = [
    {
      id: 'unit-l2-cardio',
      name: 'Cardiology Center',
      category: 'clinic',
      accessibility: 'accessible',
      color: '#fee2e2',
      coords: [[[10, 10], [35, 10], [35, 30], [10, 30], [10, 10]]]
    },
    {
      id: 'unit-l2-neuro',
      name: 'Neurology & Brain Health',
      category: 'clinic',
      accessibility: 'accessible',
      color: '#e0e7ff',
      coords: [[[45, 10], [70, 10], [70, 30], [45, 30], [45, 10]]]
    },
    {
      id: 'unit-l2-pediatrics',
      name: 'Pediatric Clinic',
      category: 'clinic',
      accessibility: 'accessible',
      color: '#fef3c7',
      coords: [[[10, 35], [30, 35], [30, 55], [10, 55], [10, 35]]]
    },
    {
      id: 'unit-l2-lounge',
      name: 'Family Waiting Lounge',
      category: 'room',
      accessibility: 'accessible',
      color: '#dcfce7',
      coords: [[[50, 35], [70, 35], [70, 55], [50, 55], [50, 35]]]
    },
    {
      id: 'unit-l2-restroom-acc',
      name: 'Accessible Restroom L2',
      category: 'restroom',
      accessibility: 'accessible',
      color: '#f3e8ff',
      coords: [[[35, 22], [42, 22], [42, 30], [35, 30], [35, 22]]]
    },
    {
      id: 'unit-l2-elev-north',
      name: 'North Elevator Core L2',
      category: 'elevator',
      accessibility: 'accessible',
      color: '#c7d2fe',
      coords: [[[34, 38], [39, 38], [39, 44], [34, 44], [34, 38]]]
    },
    {
      id: 'unit-l2-stairs-west',
      name: 'West Stairwell A L2',
      category: 'stairs',
      accessibility: 'stair_only',
      color: '#fed7aa',
      coords: [[[41, 38], [46, 38], [46, 44], [41, 44], [41, 38]]]
    },
    {
      id: 'unit-l2-elev-south',
      name: 'South Elevator Core L2',
      category: 'elevator',
      accessibility: 'accessible',
      color: '#c7d2fe',
      coords: [[[65, 38], [70, 38], [70, 44], [65, 44], [65, 38]]]
    }
  ];

  for (const u of unitsL2) {
    await db.query(
      `INSERT INTO units (id, level_id, venue_id, name, category, accessibility_type, geometry_geojson, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [u.id, v1L2, venue1Id, u.name, u.category, u.accessibility, JSON.stringify({ type: 'Polygon', coordinates: u.coords }), u.color]
    );
  }

  // --- Units for Level 3 ---
  const unitsL3 = [
    {
      id: 'unit-l3-surgery',
      name: 'Surgical Suites 1 - 4',
      category: 'clinic',
      accessibility: 'accessible',
      color: '#fee2e2',
      coords: [[[10, 10], [40, 10], [40, 32], [10, 32], [10, 10]]]
    },
    {
      id: 'unit-l3-cafeteria',
      name: 'Staff & Visitor Cafeteria',
      category: 'food',
      accessibility: 'accessible',
      color: '#fed7aa',
      coords: [[[45, 10], [70, 10], [70, 32], [45, 32], [45, 10]]]
    },
    {
      id: 'unit-l3-icu',
      name: 'Intensive Care Unit (ICU)',
      category: 'clinic',
      accessibility: 'accessible',
      color: '#fef3c7',
      coords: [[[10, 35], [30, 35], [30, 55], [10, 55], [10, 35]]]
    },
    {
      id: 'unit-l3-recovery',
      name: 'Inpatient Recovery Rooms 301-312',
      category: 'room',
      accessibility: 'accessible',
      color: '#dcfce7',
      coords: [[[50, 35], [70, 35], [70, 55], [50, 55], [50, 35]]]
    },
    {
      id: 'unit-l3-restroom-acc',
      name: 'Accessible Restroom L3',
      category: 'restroom',
      accessibility: 'accessible',
      color: '#f3e8ff',
      coords: [[[35, 22], [42, 22], [42, 30], [35, 30], [35, 22]]]
    },
    {
      id: 'unit-l3-elev-north',
      name: 'North Elevator Core L3',
      category: 'elevator',
      accessibility: 'accessible',
      color: '#c7d2fe',
      coords: [[[34, 38], [39, 38], [39, 44], [34, 44], [34, 38]]]
    },
    {
      id: 'unit-l3-stairs-west',
      name: 'West Stairwell A L3',
      category: 'stairs',
      accessibility: 'stair_only',
      color: '#fed7aa',
      coords: [[[41, 38], [46, 38], [46, 44], [41, 44], [41, 38]]]
    },
    {
      id: 'unit-l3-elev-south',
      name: 'South Elevator Core L3',
      category: 'elevator',
      accessibility: 'accessible',
      color: '#c7d2fe',
      coords: [[[65, 38], [70, 38], [70, 44], [65, 44], [65, 38]]]
    }
  ];

  for (const u of unitsL3) {
    await db.query(
      `INSERT INTO units (id, level_id, venue_id, name, category, accessibility_type, geometry_geojson, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [u.id, v1L3, venue1Id, u.name, u.category, u.accessibility, JSON.stringify({ type: 'Polygon', coordinates: u.coords }), u.color]
    );
  }

  // ==========================================
  // Nodes (Waypoints) for Level 1, 2, and 3
  // ==========================================
  const nodes = [
    // --- Level 1 Nodes ---
    { id: 'node-l1-entrance', level_id: v1L1, x: 40.0, y: 8.0, type: 'entrance', is_acc: true, name: 'Main Entrance' },
    { id: 'node-l1-lobby-center', level_id: v1L1, x: 40.0, y: 18.0, type: 'hallway', is_acc: true, name: 'Central Atrium Corridor' },
    { id: 'node-l1-hall-west', level_id: v1L1, x: 25.0, y: 18.0, type: 'hallway', is_acc: true, name: 'West Wing Hallway' },
    { id: 'node-l1-pharmacy-door', level_id: v1L1, x: 25.0, y: 25.0, type: 'room_entry', is_acc: true, name: 'Pharmacy Entrance' },
    { id: 'node-l1-hall-east', level_id: v1L1, x: 55.0, y: 18.0, type: 'hallway', is_acc: true, name: 'East Wing Hallway' },
    { id: 'node-l1-radiology-door', level_id: v1L1, x: 55.0, y: 25.0, type: 'room_entry', is_acc: true, name: 'Radiology Entrance' },
    { id: 'node-l1-hall-center-mid', level_id: v1L1, x: 40.0, y: 32.0, type: 'hallway', is_acc: true, name: 'Restroom Junction' },
    { id: 'node-l1-restroom-acc-door', level_id: v1L1, x: 35.0, y: 32.0, type: 'room_entry', is_acc: true, name: 'Accessible Restroom' },
    { id: 'node-l1-restroom-pub-door', level_id: v1L1, x: 45.0, y: 32.0, type: 'room_entry', is_acc: true, name: 'Public Restrooms' },
    { id: 'node-l1-hall-south', level_id: v1L1, x: 40.0, y: 45.0, type: 'hallway', is_acc: true, name: 'South Transit Concourse' },
    { id: 'node-l1-elev-north-door', level_id: v1L1, x: 36.5, y: 44.0, type: 'elevator_door', is_acc: true, name: 'Elevator North L1' },
    { id: 'node-l1-stairs-west-door', level_id: v1L1, x: 43.5, y: 44.0, type: 'stair_landing', is_acc: false, name: 'West Stairs L1' },
    { id: 'node-l1-elev-south-door', level_id: v1L1, x: 67.5, y: 44.0, type: 'elevator_door', is_acc: true, name: 'Elevator South L1' },
    { id: 'node-l1-emergency-door', level_id: v1L1, x: 25.0, y: 45.0, type: 'room_entry', is_acc: true, name: 'Emergency Triage' },

    // --- Level 2 Nodes ---
    { id: 'node-l2-hall-center-north', level_id: v1L2, x: 40.0, y: 18.0, type: 'hallway', is_acc: true, name: 'Level 2 North Corridor' },
    { id: 'node-l2-cardio-door', level_id: v1L2, x: 25.0, y: 18.0, type: 'room_entry', is_acc: true, name: 'Cardiology Door' },
    { id: 'node-l2-neuro-door', level_id: v1L2, x: 55.0, y: 18.0, type: 'room_entry', is_acc: true, name: 'Neurology Door' },
    { id: 'node-l2-hall-center-mid', level_id: v1L2, x: 40.0, y: 32.0, type: 'hallway', is_acc: true, name: 'Level 2 Central Lobby' },
    { id: 'node-l2-restroom-acc-door', level_id: v1L2, x: 38.0, y: 30.0, type: 'room_entry', is_acc: true, name: 'Restroom L2' },
    { id: 'node-l2-pediatrics-door', level_id: v1L2, x: 25.0, y: 45.0, type: 'room_entry', is_acc: true, name: 'Pediatrics Door' },
    { id: 'node-l2-lounge-door', level_id: v1L2, x: 55.0, y: 45.0, type: 'room_entry', is_acc: true, name: 'Family Lounge Door' },
    { id: 'node-l2-hall-south', level_id: v1L2, x: 40.0, y: 45.0, type: 'hallway', is_acc: true, name: 'Level 2 Transit Concourse' },
    { id: 'node-l2-elev-north-door', level_id: v1L2, x: 36.5, y: 44.0, type: 'elevator_door', is_acc: true, name: 'Elevator North L2' },
    { id: 'node-l2-stairs-west-door', level_id: v1L2, x: 43.5, y: 44.0, type: 'stair_landing', is_acc: false, name: 'West Stairs L2' },
    { id: 'node-l2-elev-south-door', level_id: v1L2, x: 67.5, y: 44.0, type: 'elevator_door', is_acc: true, name: 'Elevator South L2' },

    // --- Level 3 Nodes ---
    { id: 'node-l3-hall-center-north', level_id: v1L3, x: 40.0, y: 18.0, type: 'hallway', is_acc: true, name: 'Level 3 Surgical Corridor' },
    { id: 'node-l3-surgery-door', level_id: v1L3, x: 25.0, y: 18.0, type: 'room_entry', is_acc: true, name: 'Surgery Suite Door' },
    { id: 'node-l3-cafeteria-door', level_id: v1L3, x: 55.0, y: 18.0, type: 'room_entry', is_acc: true, name: 'Cafeteria Entrance' },
    { id: 'node-l3-hall-center-mid', level_id: v1L3, x: 40.0, y: 32.0, type: 'hallway', is_acc: true, name: 'Level 3 Central Hub' },
    { id: 'node-l3-restroom-acc-door', level_id: v1L3, x: 38.0, y: 30.0, type: 'room_entry', is_acc: true, name: 'Restroom L3' },
    { id: 'node-l3-icu-door', level_id: v1L3, x: 25.0, y: 45.0, type: 'room_entry', is_acc: true, name: 'ICU Door' },
    { id: 'node-l3-recovery-door', level_id: v1L3, x: 55.0, y: 45.0, type: 'room_entry', is_acc: true, name: 'Recovery Rooms Door' },
    { id: 'node-l3-hall-south', level_id: v1L3, x: 40.0, y: 45.0, type: 'hallway', is_acc: true, name: 'Level 3 Transit Concourse' },
    { id: 'node-l3-elev-north-door', level_id: v1L3, x: 36.5, y: 44.0, type: 'elevator_door', is_acc: true, name: 'Elevator North L3' },
    { id: 'node-l3-stairs-west-door', level_id: v1L3, x: 43.5, y: 44.0, type: 'stair_landing', is_acc: false, name: 'West Stairs L3' },
    { id: 'node-l3-elev-south-door', level_id: v1L3, x: 67.5, y: 44.0, type: 'elevator_door', is_acc: true, name: 'Elevator South L3' }
  ];

  for (const n of nodes) {
    await db.query(
      `INSERT INTO nodes (id, level_id, venue_id, x_meters, y_meters, node_type, is_accessible, name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [n.id, n.level_id, venue1Id, n.x, n.y, n.type, n.is_acc, n.name]
    );
  }

  // ==========================================
  // Edges (Floor pathways + Inter-level connectors)
  // ==========================================
  const edges = [
    // --- Level 1 Horizontal Edges ---
    { from: 'node-l1-entrance', to: 'node-l1-lobby-center', type: 'walkway', dist: 10.0, acc: true },
    { from: 'node-l1-lobby-center', to: 'node-l1-hall-west', type: 'walkway', dist: 15.0, acc: true },
    { from: 'node-l1-hall-west', to: 'node-l1-pharmacy-door', type: 'walkway', dist: 7.0, acc: true },
    { from: 'node-l1-lobby-center', to: 'node-l1-hall-east', type: 'walkway', dist: 15.0, acc: true },
    { from: 'node-l1-hall-east', to: 'node-l1-radiology-door', type: 'walkway', dist: 7.0, acc: true },
    { from: 'node-l1-lobby-center', to: 'node-l1-hall-center-mid', type: 'walkway', dist: 14.0, acc: true },
    { from: 'node-l1-hall-center-mid', to: 'node-l1-restroom-acc-door', type: 'walkway', dist: 5.0, acc: true },
    { from: 'node-l1-hall-center-mid', to: 'node-l1-restroom-pub-door', type: 'walkway', dist: 5.0, acc: true },
    { from: 'node-l1-hall-center-mid', to: 'node-l1-hall-south', type: 'walkway', dist: 13.0, acc: true },
    { from: 'node-l1-hall-south', to: 'node-l1-elev-north-door', type: 'walkway', dist: 3.6, acc: true },
    { from: 'node-l1-hall-south', to: 'node-l1-stairs-west-door', type: 'walkway', dist: 3.6, acc: true },
    { from: 'node-l1-hall-south', to: 'node-l1-elev-south-door', type: 'walkway', dist: 27.5, acc: true },
    { from: 'node-l1-hall-south', to: 'node-l1-emergency-door', type: 'walkway', dist: 15.0, acc: true },

    // --- Level 2 Horizontal Edges ---
    { from: 'node-l2-hall-center-north', to: 'node-l2-cardio-door', type: 'walkway', dist: 15.0, acc: true },
    { from: 'node-l2-hall-center-north', to: 'node-l2-neuro-door', type: 'walkway', dist: 15.0, acc: true },
    { from: 'node-l2-hall-center-north', to: 'node-l2-hall-center-mid', type: 'walkway', dist: 14.0, acc: true },
    { from: 'node-l2-hall-center-mid', to: 'node-l2-restroom-acc-door', type: 'walkway', dist: 3.0, acc: true },
    { from: 'node-l2-hall-center-mid', to: 'node-l2-hall-south', type: 'walkway', dist: 13.0, acc: true },
    { from: 'node-l2-hall-south', to: 'node-l2-pediatrics-door', type: 'walkway', dist: 15.0, acc: true },
    { from: 'node-l2-hall-south', to: 'node-l2-lounge-door', type: 'walkway', dist: 15.0, acc: true },
    { from: 'node-l2-hall-south', to: 'node-l2-elev-north-door', type: 'walkway', dist: 3.6, acc: true },
    { from: 'node-l2-hall-south', to: 'node-l2-stairs-west-door', type: 'walkway', dist: 3.6, acc: true },
    { from: 'node-l2-hall-south', to: 'node-l2-elev-south-door', type: 'walkway', dist: 27.5, acc: true },

    // --- Level 3 Horizontal Edges ---
    { from: 'node-l3-hall-center-north', to: 'node-l3-surgery-door', type: 'walkway', dist: 15.0, acc: true },
    { from: 'node-l3-hall-center-north', to: 'node-l3-cafeteria-door', type: 'walkway', dist: 15.0, acc: true },
    { from: 'node-l3-hall-center-north', to: 'node-l3-hall-center-mid', type: 'walkway', dist: 14.0, acc: true },
    { from: 'node-l3-hall-center-mid', to: 'node-l3-restroom-acc-door', type: 'walkway', dist: 3.0, acc: true },
    { from: 'node-l3-hall-center-mid', to: 'node-l3-hall-south', type: 'walkway', dist: 13.0, acc: true },
    { from: 'node-l3-hall-south', to: 'node-l3-icu-door', type: 'walkway', dist: 15.0, acc: true },
    { from: 'node-l3-hall-south', to: 'node-l3-recovery-door', type: 'walkway', dist: 15.0, acc: true },
    { from: 'node-l3-hall-south', to: 'node-l3-elev-north-door', type: 'walkway', dist: 3.6, acc: true },
    { from: 'node-l3-hall-south', to: 'node-l3-stairs-west-door', type: 'walkway', dist: 3.6, acc: true },
    { from: 'node-l3-hall-south', to: 'node-l3-elev-south-door', type: 'walkway', dist: 27.5, acc: true },

    // --- Multi-Level Vertical Transition Edges ---
    // North Elevator (Accessible): L1 <-> L2, L2 <-> L3
    { from: 'node-l1-elev-north-door', to: 'node-l2-elev-north-door', type: 'elevator', dist: 5.0, acc: true, group: 'Elevator-North' },
    { from: 'node-l2-elev-north-door', to: 'node-l3-elev-north-door', type: 'elevator', dist: 5.0, acc: true, group: 'Elevator-North' },

    // South Elevator (Accessible): L1 <-> L2, L2 <-> L3
    { from: 'node-l1-elev-south-door', to: 'node-l2-elev-south-door', type: 'elevator', dist: 5.0, acc: true, group: 'Elevator-South' },
    { from: 'node-l2-elev-south-door', to: 'node-l3-elev-south-door', type: 'elevator', dist: 5.0, acc: true, group: 'Elevator-South' },

    // West Stairs (Non-accessible / Stairs-only): L1 <-> L2, L2 <-> L3
    { from: 'node-l1-stairs-west-door', to: 'node-l2-stairs-west-door', type: 'stairs', dist: 8.0, acc: false, group: 'Stairs-West' },
    { from: 'node-l2-stairs-west-door', to: 'node-l3-stairs-west-door', type: 'stairs', dist: 8.0, acc: false, group: 'Stairs-West' }
  ];

  let edgeIdx = 1;
  for (const e of edges) {
    await db.query(
      `INSERT INTO edges (id, venue_id, from_node_id, to_node_id, edge_type, distance_meters, is_accessible, bidirectional, vertical_connector_group)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [`edge-${edgeIdx++}`, venue1Id, e.from, e.to, e.type, e.dist, e.acc, true, e.group || null]
    );
  }

  // ==========================================
  // POIs (Points of Interest)
  // ==========================================
  const pois = [
    // Level 1
    { id: 'poi-pharmacy', venue: venue1Id, level: v1L1, node: 'node-l1-pharmacy-door', name: 'Outpatient Pharmacy', cat: 'pharmacy', acc: true, icon: 'pill', x: 20.0, y: 17.5, desc: 'Prescription pickup, health supplies, and consultation.' },
    { id: 'poi-radiology', venue: venue1Id, level: v1L1, node: 'node-l1-radiology-door', name: 'Radiology & MRI Suite', cat: 'clinic', acc: true, icon: 'activity', x: 60.0, y: 20.0, desc: 'X-Ray, CT Scan, and MRI diagnostic services.' },
    { id: 'poi-emergency', venue: venue1Id, level: v1L1, node: 'node-l1-emergency-door', name: 'Emergency Triage Wing', cat: 'first_aid', acc: true, icon: 'heart-pulse', x: 20.0, y: 45.0, desc: '24/7 Acute trauma and emergency medical care.' },
    { id: 'poi-restroom-l1', venue: venue1Id, level: v1L1, node: 'node-l1-restroom-acc-door', name: 'Wheelchair Accessible Restroom', cat: 'restroom', acc: true, icon: 'user', x: 35.0, y: 28.5, desc: 'ADA-compliant universal restroom with baby changing station.' },
    { id: 'poi-elev-north-l1', venue: venue1Id, level: v1L1, node: 'node-l1-elev-north-door', name: 'North Elevator (All Floors)', cat: 'elevator', acc: true, icon: 'arrow-up-down', x: 36.5, y: 41.0, desc: 'Direct access to Level 2 (Clinics) & Level 3 (Cafeteria/Surgery).' },
    { id: 'poi-stairs-l1', venue: venue1Id, level: v1L1, node: 'node-l1-stairs-west-door', name: 'Stairwell A', cat: 'stairs', acc: false, icon: 'footprints', x: 43.5, y: 41.0, desc: 'Rapid stair access to all upper levels.' },

    // Level 2
    { id: 'poi-cardio', venue: venue1Id, level: v1L2, node: 'node-l2-cardio-door', name: 'Cardiology & Heart Center', cat: 'clinic', acc: true, icon: 'heart', x: 22.5, y: 20.0, desc: 'Echocardiograms, ECGs, and cardiovascular consultations.' },
    { id: 'poi-neuro', venue: venue1Id, level: v1L2, node: 'node-l2-neuro-door', name: 'Neurology & Brain Health', cat: 'clinic', acc: true, icon: 'brain', x: 57.5, y: 20.0, desc: 'Neuroscience outpatient examinations.' },
    { id: 'poi-pediatrics', venue: venue1Id, level: v1L2, node: 'node-l2-pediatrics-door', name: 'Pediatric Care Wing', cat: 'clinic', acc: true, icon: 'baby', x: 20.0, y: 45.0, desc: 'Child health, immunization, and pediatric specialists.' },
    { id: 'poi-lounge-l2', venue: venue1Id, level: v1L2, node: 'node-l2-lounge-door', name: 'Family Waiting Lounge', cat: 'room', acc: true, icon: 'coffee', x: 60.0, y: 45.0, desc: 'Quiet relaxation zone with complimentary Wi-Fi & refreshments.' },

    // Level 3
    { id: 'poi-cafeteria', venue: venue1Id, level: v1L3, node: 'node-l3-cafeteria-door', name: 'Staff & Visitor Cafeteria', cat: 'food', acc: true, icon: 'utensils', x: 57.5, y: 21.0, desc: 'Hot meals, organic salad bar, barista coffee, and open garden terrace.' },
    { id: 'poi-surgery', venue: venue1Id, level: v1L3, node: 'node-l3-surgery-door', name: 'Surgical Theatres 1 - 4', cat: 'clinic', acc: true, icon: 'scissors', x: 25.0, y: 21.0, desc: 'Advanced sterile surgical operations & pre-op prep.' },
    { id: 'poi-icu', venue: venue1Id, level: v1L3, node: 'node-l3-icu-door', name: 'Intensive Care Unit (ICU)', cat: 'clinic', acc: true, icon: 'shield-alert', x: 20.0, y: 45.0, desc: 'Critical intensive patient monitoring.' }
  ];

  for (const p of pois) {
    await db.query(
      `INSERT INTO pois (id, venue_id, level_id, node_id, name, category, is_accessible, icon, x_meters, y_meters, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [p.id, p.venue, p.level, p.node, p.name, p.cat, p.acc, p.icon, p.x, p.y, p.desc]
    );
  }

  // ==========================================
  // Checkpoints (QR Codes)
  // ==========================================
  const checkpoints = [
    { id: 'cp-l1-entrance', venue: venue1Id, level: v1L1, node: 'node-l1-entrance', code: 'QR-METRO-L1-ENTRANCE', label: 'Main Entrance Kiosk', desc: 'Scan at the main glass entrance foyer.' },
    { id: 'cp-l1-pharmacy', venue: venue1Id, level: v1L1, node: 'node-l1-pharmacy-door', code: 'QR-METRO-L1-PHARMACY', label: 'Pharmacy Checkpoint', desc: 'Scan near the pharmacy prescription counter.' },
    { id: 'cp-l1-elev-n', venue: venue1Id, level: v1L1, node: 'node-l1-elev-north-door', code: 'QR-METRO-L1-ELEVATOR-N', label: 'North Elevator Hall L1', desc: 'Scan outside the Ground floor elevator doors.' },
    { id: 'cp-l2-lobby', venue: venue1Id, level: v1L2, node: 'node-l2-hall-center-mid', code: 'QR-METRO-L2-LOBBY', label: 'Level 2 Specialty Hub', desc: 'Scan at the central 2nd floor welcome desk.' },
    { id: 'cp-l3-cafeteria', venue: venue1Id, level: v1L3, node: 'node-l3-cafeteria-door', code: 'QR-METRO-L3-CAFETERIA', label: 'Level 3 Cafeteria Foyer', desc: 'Scan at the dining hall entrance.' }
  ];

  for (const cp of checkpoints) {
    await db.query(
      `INSERT INTO checkpoints (id, venue_id, level_id, node_id, code, label, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [cp.id, cp.venue, cp.level, cp.node, cp.code, cp.label, cp.desc]
    );
  }

  // ==========================================
  // VENUE 2: NeoFest 2026 Innovation & Music Expo
  // ==========================================
  const venue2Id = 'venue-neofest-expo';
  await db.query(
    `INSERT INTO venues (id, name, description, category, address)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      venue2Id,
      'NeoFest 2026 Innovation & Music Expo',
      'A dynamic 2-level festival and exhibition pavilion with live stages, demo booths, and food lounges.',
      'festival',
      'Pier 48 Expo Grounds, San Francisco, CA'
    ]
  );

  const v2L1 = 'level-neofest-ground';
  const v2L2 = 'level-neofest-mezzanine';

  await db.query(
    `INSERT INTO levels (id, venue_id, ordinal, name, short_name, scale_pixels_per_meter, width_meters, height_meters)
     VALUES 
     ($1, $2, 0, 'Ground Plaza - Main Stage & Expo', 'G', 20.0, 90.0, 70.0),
     ($3, $2, 1, 'Mezzanine - VIP & Creator Deck', 'M1', 20.0, 90.0, 70.0)`,
    [v2L1, venue2Id, v2L2]
  );

  // Units for Venue 2 Ground Plaza
  const v2UnitsL1 = [
    {
      id: 'unit-v2-main-stage',
      name: 'Keynote & Main Music Stage',
      category: 'stage',
      accessibility: 'accessible',
      color: '#e0e7ff',
      coords: [[[10, 10], [45, 10], [45, 30], [10, 30], [10, 10]]]
    },
    {
      id: 'unit-v2-booth-zone',
      name: 'Startup & Tech Expo Village',
      category: 'room',
      accessibility: 'accessible',
      color: '#fef3c7',
      coords: [[[55, 10], [80, 10], [80, 45], [55, 45], [55, 10]]]
    },
    {
      id: 'unit-v2-food-alley',
      name: 'Food Truck Alley',
      category: 'food',
      accessibility: 'accessible',
      color: '#fed7aa',
      coords: [[[10, 45], [45, 45], [45, 60], [10, 60], [10, 45]]]
    },
    {
      id: 'unit-v2-elev-n',
      name: 'Plaza Elevator',
      category: 'elevator',
      accessibility: 'accessible',
      color: '#c7d2fe',
      coords: [[[48, 32], [52, 32], [52, 38], [48, 38], [48, 32]]]
    },
    {
      id: 'unit-v2-stairs-s',
      name: 'Grand Staircase',
      category: 'stairs',
      accessibility: 'stair_only',
      color: '#fecdd3',
      coords: [[[48, 42], [52, 42], [52, 48], [48, 48], [48, 42]]]
    }
  ];

  for (const u of v2UnitsL1) {
    await db.query(
      `INSERT INTO units (id, level_id, venue_id, name, category, accessibility_type, geometry_geojson, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [u.id, v2L1, venue2Id, u.name, u.category, u.accessibility, JSON.stringify({ type: 'Polygon', coordinates: u.coords }), u.color]
    );
  }

  // Nodes for Venue 2
  const v2Nodes = [
    { id: 'node-v2-g-entrance', level_id: v2L1, x: 50.0, y: 5.0, type: 'entrance', is_acc: true, name: 'Festival Gate 1' },
    { id: 'node-v2-g-center', level_id: v2L1, x: 50.0, y: 20.0, type: 'hallway', is_acc: true, name: 'Main Plaza Walkway' },
    { id: 'node-v2-g-stage-door', level_id: v2L1, x: 30.0, y: 20.0, type: 'room_entry', is_acc: true, name: 'Main Stage Front' },
    { id: 'node-v2-g-booths-door', level_id: v2L1, x: 65.0, y: 20.0, type: 'room_entry', is_acc: true, name: 'Expo Booths Entry' },
    { id: 'node-v2-g-food-door', level_id: v2L1, x: 30.0, y: 50.0, type: 'room_entry', is_acc: true, name: 'Food Trucks' },
    { id: 'node-v2-g-elev-door', level_id: v2L1, x: 50.0, y: 35.0, type: 'elevator_door', is_acc: true, name: 'Elevator Ground' },
    { id: 'node-v2-g-stairs-door', level_id: v2L1, x: 50.0, y: 45.0, type: 'stair_landing', is_acc: false, name: 'Grand Staircase Ground' },

    // Mezzanine
    { id: 'node-v2-m-center', level_id: v2L2, x: 50.0, y: 25.0, type: 'hallway', is_acc: true, name: 'VIP Deck Concourse' },
    { id: 'node-v2-m-vip-door', level_id: v2L2, x: 30.0, y: 25.0, type: 'room_entry', is_acc: true, name: 'VIP Lounge Entry' },
    { id: 'node-v2-m-elev-door', level_id: v2L2, x: 50.0, y: 35.0, type: 'elevator_door', is_acc: true, name: 'Elevator Mezzanine' },
    { id: 'node-v2-m-stairs-door', level_id: v2L2, x: 50.0, y: 45.0, type: 'stair_landing', is_acc: false, name: 'Grand Staircase Mezzanine' }
  ];

  for (const n of v2Nodes) {
    await db.query(
      `INSERT INTO nodes (id, level_id, venue_id, x_meters, y_meters, node_type, is_accessible, name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [n.id, n.level_id, venue2Id, n.x, n.y, n.type, n.is_acc, n.name]
    );
  }

  // Edges for Venue 2
  const v2Edges = [
    { from: 'node-v2-g-entrance', to: 'node-v2-g-center', type: 'walkway', dist: 15.0, acc: true },
    { from: 'node-v2-g-center', to: 'node-v2-g-stage-door', type: 'walkway', dist: 20.0, acc: true },
    { from: 'node-v2-g-center', to: 'node-v2-g-booths-door', type: 'walkway', dist: 15.0, acc: true },
    { from: 'node-v2-g-center', to: 'node-v2-g-elev-door', type: 'walkway', dist: 15.0, acc: true },
    { from: 'node-v2-g-elev-door', to: 'node-v2-g-stairs-door', type: 'walkway', dist: 10.0, acc: true },
    { from: 'node-v2-g-stairs-door', to: 'node-v2-g-food-door', type: 'walkway', dist: 20.0, acc: true },

    // Mezzanine
    { from: 'node-v2-m-center', to: 'node-v2-m-vip-door', type: 'walkway', dist: 20.0, acc: true },
    { from: 'node-v2-m-center', to: 'node-v2-m-elev-door', type: 'walkway', dist: 10.0, acc: true },
    { from: 'node-v2-m-elev-door', to: 'node-v2-m-stairs-door', type: 'walkway', dist: 10.0, acc: true },

    // Connectors
    { from: 'node-v2-g-elev-door', to: 'node-v2-m-elev-door', type: 'elevator', dist: 6.0, acc: true, group: 'Elevator-Expo' },
    { from: 'node-v2-g-stairs-door', to: 'node-v2-m-stairs-door', type: 'stairs', dist: 12.0, acc: false, group: 'Stairs-Grand' }
  ];

  for (const e of v2Edges) {
    await db.query(
      `INSERT INTO edges (id, venue_id, from_node_id, to_node_id, edge_type, distance_meters, is_accessible, bidirectional, vertical_connector_group)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [`edge-${edgeIdx++}`, venue2Id, e.from, e.to, e.type, e.dist, e.acc, true, e.group || null]
    );
  }

  // POIs for Venue 2
  const v2Pois = [
    { id: 'poi-v2-stage', venue: venue2Id, level: v2L1, node: 'node-v2-g-stage-door', name: 'Main Keynote Stage', cat: 'stage', acc: true, icon: 'mic', x: 27.5, y: 20.0, desc: 'Headliner presentations and tech demonstrations.' },
    { id: 'poi-v2-booths', venue: venue2Id, level: v2L1, node: 'node-v2-g-booths-door', name: 'Startup Expo Zone', cat: 'booth', acc: true, icon: 'grid', x: 67.5, y: 27.5, desc: '50+ Interactive tech and developer product booths.' },
    { id: 'poi-v2-food', venue: venue2Id, level: v2L1, node: 'node-v2-g-food-door', name: 'Food & Beverage Garden', cat: 'food', acc: true, icon: 'utensils', x: 27.5, y: 52.5, desc: 'Artisanal food trucks and refreshment bar.' },
    { id: 'poi-v2-vip', venue: venue2Id, level: v2L2, node: 'node-v2-m-vip-door', name: 'VIP & Speaker Deck', cat: 'room', acc: true, icon: 'award', x: 30.0, y: 25.0, desc: 'Exclusive VIP networking & acoustic balcony.' }
  ];

  for (const p of v2Pois) {
    await db.query(
      `INSERT INTO pois (id, venue_id, level_id, node_id, name, category, is_accessible, icon, x_meters, y_meters, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [p.id, p.venue, p.level, p.node, p.name, p.cat, p.acc, p.icon, p.x, p.y, p.desc]
    );
  }

  // Checkpoints for Venue 2
  const v2Checkpoints = [
    { id: 'cp-v2-gate', venue: venue2Id, level: v2L1, node: 'node-v2-g-entrance', code: 'QR-NEOFEST-GATE1', label: 'Main Festival Gate', desc: 'Scan at the main ticket wristband check-in.' },
    { id: 'cp-v2-stage', venue: venue2Id, level: v2L1, node: 'node-v2-g-stage-door', code: 'QR-NEOFEST-STAGE', label: 'Main Stage Stand', desc: 'Scan near the sound mixing console.' }
  ];

  for (const cp of v2Checkpoints) {
    await db.query(
      `INSERT INTO checkpoints (id, venue_id, level_id, node_id, code, label, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [cp.id, cp.venue, cp.level, cp.node, cp.code, cp.label, cp.desc]
    );
  }

  console.log('[PostgreSQL] Seed completed: 2 venues, 5 levels, 21 units, 35 nodes, 40+ edges, 17 POIs, 7 Checkpoints inserted.');
}
