import { NavigationGraph, GraphNode, GraphEdge } from './GraphBuilder.js';

export interface RouterOptions {
  accessibleOnly?: boolean;
  preferElevator?: boolean;
  walkingSpeedMps?: number; // default 1.2 m/s
  elevatorWaitPenaltyMeters?: number; // default 10m penalty equivalent
}

export interface PathResult {
  found: boolean;
  nodes: GraphNode[];
  edges: GraphEdge[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  levelsTraversed: string[];
}

interface PriorityNode {
  nodeId: string;
  fScore: number;
}

class PriorityQueue {
  private heap: PriorityNode[] = [];

  push(nodeId: string, fScore: number) {
    this.heap.push({ nodeId, fScore });
    let i = this.heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.heap[parent].fScore <= this.heap[i].fScore) break;
      const tmp = this.heap[parent];
      this.heap[parent] = this.heap[i];
      this.heap[i] = tmp;
      i = parent;
    }
  }

  pop(): string | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0].nodeId;
    const bottom = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      let i = 0;
      const len = this.heap.length;
      while (true) {
        const left = (i << 1) + 1;
        const right = left + 1;
        let smallest = i;
        if (left < len && this.heap[left].fScore < this.heap[smallest].fScore) smallest = left;
        if (right < len && this.heap[right].fScore < this.heap[smallest].fScore) smallest = right;
        if (smallest === i) break;
        const tmp = this.heap[smallest];
        this.heap[smallest] = this.heap[i];
        this.heap[i] = tmp;
        i = smallest;
      }
    }
    return top;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }
}

export class AStarRouter {
  /**
   * 3D Euclidean Heuristic Distance between two nodes
   */
  private static heuristic(nodeA: GraphNode, nodeB: GraphNode): number {
    const dx = nodeA.x - nodeB.x;
    const dy = nodeA.y - nodeB.y;
    const floorHeightMeters = 4.0;
    const dz = (nodeA.levelOrdinal - nodeB.levelOrdinal) * floorHeightMeters;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Find Shortest Path between startNodeId and targetNodeId
   */
  static findPath(
    graph: NavigationGraph,
    startNodeId: string,
    targetNodeId: string,
    options: RouterOptions = {}
  ): PathResult {
    const {
      accessibleOnly = false,
      preferElevator = false,
      walkingSpeedMps = 1.2,
      elevatorWaitPenaltyMeters = 8.0
    } = options;

    const startNode = graph.nodes.get(startNodeId);
    const targetNode = graph.nodes.get(targetNodeId);

    if (!startNode || !targetNode) {
      return {
        found: false,
        nodes: [],
        edges: [],
        totalDistanceMeters: 0,
        totalDurationSeconds: 0,
        levelsTraversed: []
      };
    }

    if (startNodeId === targetNodeId) {
      return {
        found: true,
        nodes: [startNode],
        edges: [],
        totalDistanceMeters: 0,
        totalDurationSeconds: 0,
        levelsTraversed: [startNode.levelId]
      };
    }

    const openSet = new PriorityQueue();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    const cameFromNode = new Map<string, string>();
    const cameFromEdge = new Map<string, GraphEdge>();

    gScore.set(startNodeId, 0);
    const initialH = this.heuristic(startNode, targetNode);
    fScore.set(startNodeId, initialH);
    openSet.push(startNodeId, initialH);

    const closedSet = new Set<string>();

    while (!openSet.isEmpty()) {
      const currentId = openSet.pop()!;

      if (currentId === targetNodeId) {
        // Reconstruct path
        return this.reconstructPath(
          graph,
          startNodeId,
          targetNodeId,
          cameFromNode,
          cameFromEdge,
          walkingSpeedMps
        );
      }

      closedSet.add(currentId);

      const outgoingEdges = graph.adjacency.get(currentId) || [];
      const currentNode = graph.nodes.get(currentId)!;

      for (const edge of outgoingEdges) {
        const neighborId = edge.toNodeId;
        const neighborNode = graph.nodes.get(neighborId);
        if (!neighborNode) continue;

        if (closedSet.has(neighborId)) continue;

        // Accessibility filter: If accessibleOnly is enabled, skip stairs or inaccessible paths
        if (accessibleOnly) {
          if (!edge.isAccessible || edge.edgeType === 'stairs') {
            continue;
          }
          if (!neighborNode.isAccessible && neighborNode.nodeType === 'stair_landing') {
            continue;
          }
        }

        // Calculate traversal cost
        let edgeCost = edge.distanceMeters;

        // Apply elevator preference or wait penalty
        if (edge.edgeType === 'elevator') {
          edgeCost += elevatorWaitPenaltyMeters;
        } else if (edge.edgeType === 'stairs' && preferElevator) {
          edgeCost += 20.0; // penalize stairs when user prefers elevator
        }

        const tentativeGScore = (gScore.get(currentId) ?? Infinity) + edgeCost;

        if (tentativeGScore < (gScore.get(neighborId) ?? Infinity)) {
          cameFromNode.set(neighborId, currentId);
          cameFromEdge.set(neighborId, edge);
          gScore.set(neighborId, tentativeGScore);

          const h = this.heuristic(neighborNode, targetNode);
          const f = tentativeGScore + h;
          fScore.set(neighborId, f);

          openSet.push(neighborId, f);
        }
      }
    }

    return {
      found: false,
      nodes: [],
      edges: [],
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
      levelsTraversed: []
    };
  }

  private static reconstructPath(
    graph: NavigationGraph,
    startNodeId: string,
    targetNodeId: string,
    cameFromNode: Map<string, string>,
    cameFromEdge: Map<string, GraphEdge>,
    walkingSpeedMps: number
  ): PathResult {
    const pathNodes: GraphNode[] = [];
    const pathEdges: GraphEdge[] = [];
    const levelsSet = new Set<string>();

    let currentId: string | undefined = targetNodeId;

    while (currentId !== undefined) {
      const node = graph.nodes.get(currentId)!;
      pathNodes.unshift(node);
      levelsSet.add(node.levelId);

      const edge = cameFromEdge.get(currentId);
      if (edge) {
        pathEdges.unshift(edge);
      }

      if (currentId === startNodeId) {
        break;
      }
      currentId = cameFromNode.get(currentId);
    }

    // Compute exact physical distance
    let totalDist = 0;
    for (const e of pathEdges) {
      totalDist += e.distanceMeters;
    }

    // Compute realistic traversal duration
    let durationSeconds = totalDist / walkingSpeedMps;
    for (const e of pathEdges) {
      if (e.edgeType === 'elevator') {
        durationSeconds += 15.0; // elevator ride & door cycle
      }
    }

    return {
      found: true,
      nodes: pathNodes,
      edges: pathEdges,
      totalDistanceMeters: Math.round(totalDist * 10) / 10,
      totalDurationSeconds: Math.round(durationSeconds),
      levelsTraversed: Array.from(levelsSet)
    };
  }
}
