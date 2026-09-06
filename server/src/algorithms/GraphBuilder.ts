import { DBClient } from '../db/database.js';
import { NodeRecord, EdgeRecord, LevelRecord } from '../types/db.js';

export interface GraphNode {
  id: string;
  levelId: string;
  levelOrdinal: number;
  levelName: string;
  x: number; // meters
  y: number; // meters
  nodeType: string;
  isAccessible: boolean;
  name?: string;
}

export interface GraphEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  edgeType: 'walkway' | 'elevator' | 'stairs' | 'ramp' | 'escalator';
  distanceMeters: number;
  isAccessible: boolean;
  isVertical: boolean;
  group?: string;
}

export interface NavigationGraph {
  venueId: string;
  nodes: Map<string, GraphNode>;
  adjacency: Map<string, GraphEdge[]>;
  levels: Map<string, LevelRecord>;
}

export class GraphBuilder {
  static async buildGraph(db: DBClient, venueId: string): Promise<NavigationGraph> {
    // Fetch Levels, Nodes, and Edges concurrently using Promise.all
    const [levelsRes, nodesRes, edgesRes] = await Promise.all([
      db.query<LevelRecord>('SELECT * FROM levels WHERE venue_id = $1 ORDER BY ordinal ASC', [venueId]),
      db.query<NodeRecord>('SELECT * FROM nodes WHERE venue_id = $1', [venueId]),
      db.query<EdgeRecord>('SELECT * FROM edges WHERE venue_id = $1', [venueId])
    ]);

    const levelsMap = new Map<string, LevelRecord>();
    for (const lvl of levelsRes.rows) {
      levelsMap.set(lvl.id, lvl);
    }

    const nodesMap = new Map<string, GraphNode>();
    for (const n of nodesRes.rows) {
      const level = levelsMap.get(n.level_id);
      nodesMap.set(n.id, {
        id: n.id,
        levelId: n.level_id,
        levelOrdinal: level ? level.ordinal : 0,
        levelName: level ? level.name : 'Unknown Level',
        x: parseFloat(n.x_meters as any),
        y: parseFloat(n.y_meters as any),
        nodeType: n.node_type,
        isAccessible: Boolean(n.is_accessible),
        name: n.name || undefined
      });
    }

    const adjacency = new Map<string, GraphEdge[]>();

    for (const e of edgesRes.rows) {
      const fromNode = nodesMap.get(e.from_node_id);
      const toNode = nodesMap.get(e.to_node_id);
      if (!fromNode || !toNode) continue;

      const isVertical = fromNode.levelId !== toNode.levelId;
      const distance = parseFloat(e.distance_meters as any);
      const isAccessible = Boolean(e.is_accessible);

      // Forward edge
      const forwardEdge: GraphEdge = {
        id: e.id,
        fromNodeId: e.from_node_id,
        toNodeId: e.to_node_id,
        edgeType: e.edge_type,
        distanceMeters: distance,
        isAccessible: isAccessible,
        isVertical: isVertical,
        group: e.vertical_connector_group || undefined
      };

      if (!adjacency.has(e.from_node_id)) {
        adjacency.set(e.from_node_id, []);
      }
      adjacency.get(e.from_node_id)!.push(forwardEdge);

      // Bidirectional edge
      if (e.bidirectional) {
        const reverseEdge: GraphEdge = {
          id: `${e.id}-rev`,
          fromNodeId: e.to_node_id,
          toNodeId: e.from_node_id,
          edgeType: e.edge_type,
          distanceMeters: distance,
          isAccessible: isAccessible,
          isVertical: isVertical,
          group: e.vertical_connector_group || undefined
        };

        if (!adjacency.has(e.to_node_id)) {
          adjacency.set(e.to_node_id, []);
        }
        adjacency.get(e.to_node_id)!.push(reverseEdge);
      }
    }

    return {
      venueId,
      nodes: nodesMap,
      adjacency,
      levels: levelsMap
    };
  }
}
