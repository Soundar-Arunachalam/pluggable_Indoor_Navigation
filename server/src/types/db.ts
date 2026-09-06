export interface VenueRecord {
  id: string;
  name: string;
  description: string;
  category: 'hospital' | 'mall' | 'campus' | 'festival' | 'convention' | 'office';
  address: string;
  created_at?: string;
  updated_at?: string;
}

export interface LevelRecord {
  id: string;
  venue_id: string;
  ordinal: number;
  name: string;
  short_name: string;
  floorplan_svg_url?: string;
  scale_pixels_per_meter: number;
  width_meters: number;
  height_meters: number;
}

export interface UnitRecord {
  id: string;
  level_id: string;
  venue_id: string;
  name: string;
  category: 'room' | 'restroom' | 'elevator' | 'stairs' | 'corridor' | 'exit' | 'reception' | 'clinic' | 'stage' | 'food';
  accessibility_type: 'accessible' | 'standard' | 'stair_only';
  geometry_geojson: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
  color?: string;
}

export interface NodeRecord {
  id: string;
  level_id: string;
  venue_id: string;
  x_meters: number;
  y_meters: number;
  node_type: 'hallway' | 'room_entry' | 'elevator_door' | 'stair_landing' | 'checkpoint' | 'entrance' | 'exit';
  is_accessible: boolean;
  name?: string;
}

export interface EdgeRecord {
  id: string;
  venue_id: string;
  from_node_id: string;
  to_node_id: string;
  edge_type: 'walkway' | 'elevator' | 'stairs' | 'ramp' | 'escalator';
  distance_meters: number;
  is_accessible: boolean;
  bidirectional: boolean;
  vertical_connector_group?: string; // e.g. "Elevator-North", "Stairwell-East"
}

export interface POIRecord {
  id: string;
  venue_id: string;
  level_id: string;
  node_id?: string;
  name: string;
  category: 'restroom' | 'food' | 'first_aid' | 'elevator' | 'stairs' | 'clinic' | 'exit' | 'info' | 'pharmacy' | 'stage' | 'booth';
  is_accessible: boolean;
  icon?: string;
  x_meters: number;
  y_meters: number;
  description?: string;
}

export interface CheckpointRecord {
  id: string;
  venue_id: string;
  level_id: string;
  node_id: string;
  code: string;
  label: string;
  description?: string;
}
