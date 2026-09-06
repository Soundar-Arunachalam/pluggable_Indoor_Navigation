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

export interface RouteRequest {
  startNodeId?: string;
  startCoords?: { x: number; y: number; levelId: string };
  targetNodeId?: string;
  targetPoiId?: string;
  accessibleOnly?: boolean;
  preferElevator?: boolean;
  walkingSpeedMps?: number; // default 1.2 m/s
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
