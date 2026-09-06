-- PostgreSQL Database Schema for Indoor & Venue Navigation Platform

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

-- Indexes for high-performance spatial and routing queries
CREATE INDEX IF NOT EXISTS idx_levels_venue ON levels(venue_id);
CREATE INDEX IF NOT EXISTS idx_units_level ON units(level_id);
CREATE INDEX IF NOT EXISTS idx_nodes_level ON nodes(level_id);
CREATE INDEX IF NOT EXISTS idx_edges_venue ON edges(venue_id);
CREATE INDEX IF NOT EXISTS idx_edges_from_to ON edges(from_node_id, to_node_id);
CREATE INDEX IF NOT EXISTS idx_pois_venue ON pois(venue_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_code ON checkpoints(code);
