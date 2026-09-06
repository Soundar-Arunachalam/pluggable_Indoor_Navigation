import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export interface DBClient {
  query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[] }>;
}

let dbInstance: DBClient | null = null;
let pgliteInstance: PGlite | null = null;
let pgPoolInstance: pg.Pool | null = null;

export async function getDB(): Promise<DBClient> {
  if (dbInstance) {
    return dbInstance;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && databaseUrl.trim() !== '') {
    try {
      console.log('[PostgreSQL] Connecting to external PostgreSQL database at', databaseUrl.replace(/:[^:@]+@/, ':***@'));
      const pool = new pg.Pool({ connectionString: databaseUrl });
      await pool.query('SELECT 1');
      console.log('[PostgreSQL] Successfully connected to PostgreSQL instance.');
      
      pgPoolInstance = pool;
      dbInstance = {
        async query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[] }> {
          const res = await pool.query(sql, params);
          return { rows: res.rows as T[] };
        }
      };
      await initSchema(dbInstance);
      return dbInstance;
    } catch (err) {
      console.warn('[PostgreSQL] Failed to connect to external PostgreSQL, falling back to embedded PGlite WASM Postgres:', err);
    }
  }

  // Use embedded full PostgreSQL WASM (PGlite)
  if (!pgliteInstance) {
    try {
      const dataDir = path.join(process.cwd(), 'data', 'pgdata');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      console.log('[PostgreSQL] Initializing embedded PostgreSQL (PGlite) with persistent storage at', dataDir);
      pgliteInstance = new PGlite(dataDir);
      await pgliteInstance.waitReady;
    } catch (err) {
      console.warn('[PostgreSQL] File storage locked by another process or unavailable, falling back to in-memory PGlite instance.');
      pgliteInstance = new PGlite();
      await pgliteInstance.waitReady;
    }
  }
  
  dbInstance = {
    async query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[] }> {
      const res = await pgliteInstance!.query(sql, params);
      return { rows: res.rows as T[] };
    }
  };

  console.log('[PostgreSQL] Embedded PostgreSQL engine ready.');
  await initSchema(dbInstance);
  return dbInstance;
}

async function initSchema(db: DBClient) {
  try {
    const schemaSql = `
      CREATE TABLE IF NOT EXISTS venues (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          category TEXT NOT NULL,
          address TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS levels (
          id TEXT PRIMARY KEY,
          venue_id TEXT REFERENCES venues(id) ON DELETE CASCADE,
          ordinal INTEGER NOT NULL,
          name TEXT NOT NULL,
          short_name TEXT NOT NULL,
          floorplan_svg_url TEXT,
          scale_pixels_per_meter NUMERIC(14, 4) DEFAULT 20.0,
          width_meters NUMERIC(14, 2) DEFAULT 100.0,
          height_meters NUMERIC(14, 2) DEFAULT 80.0
      );

      CREATE TABLE IF NOT EXISTS units (
          id TEXT PRIMARY KEY,
          level_id TEXT REFERENCES levels(id) ON DELETE CASCADE,
          venue_id TEXT REFERENCES venues(id) ON DELETE CASCADE,
          name TEXT,
          category TEXT NOT NULL,
          accessibility_type TEXT DEFAULT 'standard',
          geometry_geojson JSONB NOT NULL,
          color TEXT
      );

      CREATE TABLE IF NOT EXISTS nodes (
          id TEXT PRIMARY KEY,
          level_id TEXT REFERENCES levels(id) ON DELETE CASCADE,
          venue_id TEXT REFERENCES venues(id) ON DELETE CASCADE,
          x_meters NUMERIC(14, 3) NOT NULL,
          y_meters NUMERIC(14, 3) NOT NULL,
          node_type TEXT DEFAULT 'hallway',
          is_accessible BOOLEAN DEFAULT TRUE,
          name TEXT
      );

      CREATE TABLE IF NOT EXISTS edges (
          id TEXT PRIMARY KEY,
          venue_id TEXT REFERENCES venues(id) ON DELETE CASCADE,
          from_node_id TEXT REFERENCES nodes(id) ON DELETE CASCADE,
          to_node_id TEXT REFERENCES nodes(id) ON DELETE CASCADE,
          edge_type TEXT DEFAULT 'walkway',
          distance_meters NUMERIC(14, 3) NOT NULL,
          is_accessible BOOLEAN DEFAULT TRUE,
          bidirectional BOOLEAN DEFAULT TRUE,
          vertical_connector_group TEXT
      );

      CREATE TABLE IF NOT EXISTS pois (
          id TEXT PRIMARY KEY,
          venue_id TEXT REFERENCES venues(id) ON DELETE CASCADE,
          level_id TEXT REFERENCES levels(id) ON DELETE CASCADE,
          node_id TEXT REFERENCES nodes(id) ON DELETE SET NULL,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          is_accessible BOOLEAN DEFAULT TRUE,
          icon TEXT,
          x_meters NUMERIC(14, 3) NOT NULL,
          y_meters NUMERIC(14, 3) NOT NULL,
          description TEXT
      );

      CREATE TABLE IF NOT EXISTS checkpoints (
          id TEXT PRIMARY KEY,
          venue_id TEXT REFERENCES venues(id) ON DELETE CASCADE,
          level_id TEXT REFERENCES levels(id) ON DELETE CASCADE,
          node_id TEXT REFERENCES nodes(id) ON DELETE CASCADE,
          code TEXT UNIQUE NOT NULL,
          label TEXT NOT NULL,
          description TEXT
      );
    `;

    // Execute schema statements
    const statements = schemaSql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
      await db.query(stmt);
    }

    // Auto-migrate column types from VARCHAR to TEXT if database already existed with older schema
    const migrationStatements = [
      'ALTER TABLE venues ALTER COLUMN id TYPE TEXT',
      'ALTER TABLE venues ALTER COLUMN name TYPE TEXT',
      'ALTER TABLE venues ALTER COLUMN category TYPE TEXT',
      'ALTER TABLE levels ALTER COLUMN id TYPE TEXT',
      'ALTER TABLE levels ALTER COLUMN venue_id TYPE TEXT',
      'ALTER TABLE levels ALTER COLUMN name TYPE TEXT',
      'ALTER TABLE levels ALTER COLUMN short_name TYPE TEXT',
      'ALTER TABLE units ALTER COLUMN id TYPE TEXT',
      'ALTER TABLE units ALTER COLUMN level_id TYPE TEXT',
      'ALTER TABLE units ALTER COLUMN venue_id TYPE TEXT',
      'ALTER TABLE units ALTER COLUMN name TYPE TEXT',
      'ALTER TABLE units ALTER COLUMN category TYPE TEXT',
      'ALTER TABLE units ALTER COLUMN accessibility_type TYPE TEXT',
      'ALTER TABLE units ALTER COLUMN color TYPE TEXT',
      'ALTER TABLE nodes ALTER COLUMN id TYPE TEXT',
      'ALTER TABLE nodes ALTER COLUMN level_id TYPE TEXT',
      'ALTER TABLE nodes ALTER COLUMN venue_id TYPE TEXT',
      'ALTER TABLE nodes ALTER COLUMN node_type TYPE TEXT',
      'ALTER TABLE nodes ALTER COLUMN name TYPE TEXT',
      'ALTER TABLE edges ALTER COLUMN id TYPE TEXT',
      'ALTER TABLE edges ALTER COLUMN venue_id TYPE TEXT',
      'ALTER TABLE edges ALTER COLUMN from_node_id TYPE TEXT',
      'ALTER TABLE edges ALTER COLUMN to_node_id TYPE TEXT',
      'ALTER TABLE edges ALTER COLUMN edge_type TYPE TEXT',
      'ALTER TABLE edges ALTER COLUMN vertical_connector_group TYPE TEXT',
      'ALTER TABLE pois ALTER COLUMN id TYPE TEXT',
      'ALTER TABLE pois ALTER COLUMN venue_id TYPE TEXT',
      'ALTER TABLE pois ALTER COLUMN level_id TYPE TEXT',
      'ALTER TABLE pois ALTER COLUMN node_id TYPE TEXT',
      'ALTER TABLE pois ALTER COLUMN name TYPE TEXT',
      'ALTER TABLE pois ALTER COLUMN category TYPE TEXT',
      'ALTER TABLE pois ALTER COLUMN icon TYPE TEXT',
      'ALTER TABLE checkpoints ALTER COLUMN id TYPE TEXT',
      'ALTER TABLE checkpoints ALTER COLUMN venue_id TYPE TEXT',
      'ALTER TABLE checkpoints ALTER COLUMN level_id TYPE TEXT',
      'ALTER TABLE checkpoints ALTER COLUMN node_id TYPE TEXT',
      'ALTER TABLE checkpoints ALTER COLUMN code TYPE TEXT',
      'ALTER TABLE checkpoints ALTER COLUMN label TYPE TEXT'
    ];

    for (const mig of migrationStatements) {
      try {
        await db.query(mig);
      } catch (e) {
        // Ignore column type alteration warnings if already TEXT
      }
    }

    console.log('[PostgreSQL] Schema and types verified successfully.');
  } catch (error) {
    console.error('[PostgreSQL] Error initializing schema:', error);
    throw error;
  }
}
