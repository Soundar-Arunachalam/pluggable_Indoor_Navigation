export interface Venue {
  id: string;
  name: string;
  description: string;
  category: 'hospital' | 'mall' | 'campus' | 'festival' | 'convention' | 'office';
  address: string;
}

export interface Level {
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

export interface POI {
  id: string;
  venue_id: string;
  level_id: string;
  level_name?: string;
  level_ordinal?: number;
  node_id?: string;
  name: string;
  category: 'restroom' | 'food' | 'first_aid' | 'elevator' | 'stairs' | 'clinic' | 'exit' | 'info' | 'pharmacy' | 'stage' | 'booth';
  is_accessible: boolean;
  icon?: string;
  x_meters: number;
  y_meters: number;
  description?: string;
}

export interface Checkpoint {
  id: string;
  venue_id: string;
  level_id: string;
  level_name?: string;
  level_ordinal?: number;
  node_id: string;
  code: string;
  label: string;
  description?: string;
  x_meters?: number;
  y_meters?: number;
}

export interface GeoJSONFeature {
  type: 'Feature';
  id: string;
  geometry: any;
  properties: any;
}

export interface LevelMapData {
  level: Level;
  units: { type: 'FeatureCollection'; features: GeoJSONFeature[] };
  nodes: { type: 'FeatureCollection'; features: GeoJSONFeature[] };
  edges: { type: 'FeatureCollection'; features: GeoJSONFeature[] };
  pois: { type: 'FeatureCollection'; features: GeoJSONFeature[] };
  checkpoints: Checkpoint[];
}

export type TurnDirection =
  | 'depart'
  | 'straight'
  | 'slight_left'
  | 'slight_right'
  | 'left'
  | 'right'
  | 'sharp_left'
  | 'sharp_right'
  | 'elevator_up'
  | 'elevator_down'
  | 'stairs_up'
  | 'stairs_down'
  | 'ramp_up'
  | 'ramp_down'
  | 'arrive';

export interface RouteStep {
  stepIndex: number;
  direction: TurnDirection;
  instruction: string;
  detail?: string;
  distanceMeters: number;
  durationSeconds: number;
  fromLevelId: string;
  toLevelId: string;
  fromLevelName: string;
  toLevelName: string;
  isLevelTransition: boolean;
  transitionType?: 'elevator' | 'stairs' | 'ramp' | 'escalator';
  startPoint: { x: number; y: number; levelId: string };
  endPoint: { x: number; y: number; levelId: string };
}

export interface RouteWaypoint {
  nodeId: string;
  levelId: string;
  levelOrdinal: number;
  levelName: string;
  x: number;
  y: number;
  nodeType: string;
  name?: string;
}

export interface RouteResponse {
  success: boolean;
  error?: string;
  routeId: string;
  venueId: string;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  accessible: boolean;
  levelsTraversed: string[];
  waypoints: RouteWaypoint[];
  steps: RouteStep[];
  geometryByLevel: {
    [levelId: string]: {
      coordinates: [number, number][];
      startNodeId: string;
      endNodeId: string;
    };
  };
}
