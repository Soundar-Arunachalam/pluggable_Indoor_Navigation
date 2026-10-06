import { DBClient } from '../db/database.js';
import { GraphBuilder, NavigationGraph } from '../algorithms/GraphBuilder.js';
import { AStarRouter, RouterOptions } from '../algorithms/AStarRouter.js';
import { DirectionGenerator } from '../algorithms/DirectionGenerator.js';
import { RouteRequest, RouteResponse, RouteWaypoint } from '../types/navigation.js';
import { POIRecord, NodeRecord } from '../types/db.js';
import { v4 as uuidv4 } from 'uuid';

export class RoutingService {
  private static graphCache = new Map<string, { graph: NavigationGraph; timestamp: number }>();
  private static CACHE_TTL = 300000; // 5 minutes

  static async getGraph(db: DBClient, venueId: string): Promise<NavigationGraph> {
    const cached = this.graphCache.get(venueId);
    const now = Date.now();
    if (cached && now - cached.timestamp < this.CACHE_TTL) {
      return cached.graph;
    }

    const graph = await GraphBuilder.buildGraph(db, venueId);
    this.graphCache.set(venueId, { graph, timestamp: now });
    return graph;
  }

  static invalidateCache(venueId: string) {
    this.graphCache.delete(venueId);
  }

  static async calculateRoute(
    db: DBClient,
    venueId: string,
    req: RouteRequest
  ): Promise<RouteResponse> {
    const graph = await this.getGraph(db, venueId);

    // 1. Resolve Start Node ID with automatic entrance fallback
    let startNodeId = req.startNodeId;
    if (!startNodeId && req.startCoords) {
      startNodeId = this.findNearestNode(graph, req.startCoords.levelId, req.startCoords.x, req.startCoords.y);
    }

    // If still not found, automatically pick the venue's main entrance or first ground floor node
    if (!startNodeId || !graph.nodes.has(startNodeId)) {
      // Look for entrance node on ground floor (ordinal 0)
      for (const [id, node] of graph.nodes.entries()) {
        if (node.nodeType === 'entrance') {
          startNodeId = id;
          break;
        }
      }

      // Fallback to any node on ordinal 0
      if (!startNodeId) {
        for (const [id, node] of graph.nodes.entries()) {
          if (node.levelOrdinal === 0) {
            startNodeId = id;
            break;
          }
        }
      }

      // Fallback to first available node in graph
      if (!startNodeId && graph.nodes.size > 0) {
        startNodeId = graph.nodes.keys().next().value;
      }
    }

    if (!startNodeId || !graph.nodes.has(startNodeId)) {
      return {
        success: false,
        error: 'No navigation nodes found for this venue.',
        routeId: uuidv4(),
        venueId,
        totalDistanceMeters: 0,
        totalDurationSeconds: 0,
        accessible: req.accessibleOnly || false,
        levelsTraversed: [],
        waypoints: [],
        steps: [],
        geometryByLevel: {}
      };
    }

    // 2. Resolve Target Node ID & Target Name
    let targetNodeId = req.targetNodeId;
    let targetName = 'Destination';

    if (req.targetPoiId) {
      const poiRes = await db.query<POIRecord>('SELECT * FROM pois WHERE id = $1', [req.targetPoiId]);
      if (poiRes.rows.length > 0) {
        const poi = poiRes.rows[0];
        targetName = poi.name;
        if (poi.node_id && graph.nodes.has(poi.node_id)) {
          targetNodeId = poi.node_id;
        } else {
          targetNodeId = this.findNearestNode(graph, poi.level_id, parseFloat(poi.x_meters as any), parseFloat(poi.y_meters as any));
        }
      }
    }

    if (!targetNodeId || !graph.nodes.has(targetNodeId)) {
      return {
        success: false,
        error: 'Target destination node not found in venue graph.',
        routeId: uuidv4(),
        venueId,
        totalDistanceMeters: 0,
        totalDurationSeconds: 0,
        accessible: req.accessibleOnly || false,
        levelsTraversed: [],
        waypoints: [],
        steps: [],
        geometryByLevel: {}
      };
    }

    // 3. Execute A* Pathfinding
    const routerOpts: RouterOptions = {
      accessibleOnly: req.accessibleOnly || false,
      preferElevator: req.preferElevator || false,
      walkingSpeedMps: req.walkingSpeedMps || 1.2
    };

    const path = AStarRouter.findPath(graph, startNodeId, targetNodeId, routerOpts);

    if (!path.found) {
      return {
        success: false,
        error: req.accessibleOnly
          ? 'No wheelchair-accessible path found (stairs-only route exists). Try disabling wheelchair mode if possible.'
          : 'No continuous path found between selected origin and destination.',
        routeId: uuidv4(),
        venueId,
        totalDistanceMeters: 0,
        totalDurationSeconds: 0,
        accessible: req.accessibleOnly || false,
        levelsTraversed: [],
        waypoints: [],
        steps: [],
        geometryByLevel: {}
      };
    }

    // 4. Generate Turn-by-Turn Steps
    const steps = DirectionGenerator.generateSteps(path, targetName, routerOpts.walkingSpeedMps);

    // 5. Build Waypoint List & Per-Level Geometry
    const waypoints: RouteWaypoint[] = path.nodes.map(n => ({
      nodeId: n.id,
      levelId: n.levelId,
      levelOrdinal: n.levelOrdinal,
      levelName: n.levelName,
      x: n.x,
      y: n.y,
      nodeType: n.nodeType,
      name: n.name
    }));

    const geometryByLevel: RouteResponse['geometryByLevel'] = {};
    for (const lvl of path.levelsTraversed) {
      const levelNodes = path.nodes.filter(n => n.levelId === lvl);
      if (levelNodes.length > 0) {
        geometryByLevel[lvl] = {
          coordinates: levelNodes.map(n => [n.x, n.y]),
          startNodeId: levelNodes[0].id,
          endNodeId: levelNodes[levelNodes.length - 1].id
        };
      }
    }

    return {
      success: true,
      routeId: uuidv4(),
      venueId,
      totalDistanceMeters: path.totalDistanceMeters,
      totalDurationSeconds: path.totalDurationSeconds,
      accessible: req.accessibleOnly || false,
      levelsTraversed: path.levelsTraversed,
      waypoints,
      steps,
      geometryByLevel
    };
  }

  private static findNearestNode(
    graph: NavigationGraph,
    levelId: string,
    x: number,
    y: number
  ): string | undefined {
    let bestDist = Infinity;
    let bestNodeId: string | undefined = undefined;

    for (const [id, node] of graph.nodes.entries()) {
      if (node.levelId === levelId) {
        const dx = node.x - x;
        const dy = node.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bestDist) {
          bestDist = dist;
          bestNodeId = id;
        }
      }
    }

    return bestNodeId;
  }
}
