import { PathResult } from './AStarRouter.js';
import { RouteStep, TurnDirection } from '../types/navigation.js';

export class DirectionGenerator {
  /**
   * Convert calculated path nodes and edges into human-friendly turn-by-turn steps
   */
  static generateSteps(
    path: PathResult,
    targetName: string = 'your destination',
    walkingSpeedMps: number = 1.2
  ): RouteStep[] {
    const { nodes, edges } = path;
    if (nodes.length === 0) return [];

    if (nodes.length === 1) {
      return [
        {
          stepIndex: 0,
          direction: 'arrive',
          instruction: `You are already at ${targetName}`,
          detail: nodes[0].levelName,
          distanceMeters: 0,
          durationSeconds: 0,
          fromLevelId: nodes[0].levelId,
          toLevelId: nodes[0].levelId,
          fromLevelName: nodes[0].levelName,
          toLevelName: nodes[0].levelName,
          isLevelTransition: false,
          startPoint: { x: nodes[0].x, y: nodes[0].y, levelId: nodes[0].levelId },
          endPoint: { x: nodes[0].x, y: nodes[0].y, levelId: nodes[0].levelId }
        }
      ];
    }

    const steps: RouteStep[] = [];
    let stepIndex = 0;

    // Initial departure step
    const firstNode = nodes[0];
    const secondNode = nodes[1];
    const firstEdge = edges[0];

    const initialDistance = Math.round(firstEdge.distanceMeters * 10) / 10;
    const initialDuration = Math.max(2, Math.round(initialDistance / walkingSpeedMps));

    if (firstEdge.isVertical) {
      const isUp = secondNode.levelOrdinal > firstNode.levelOrdinal;
      const isElevator = firstEdge.edgeType === 'elevator';
      const direction: TurnDirection = isElevator
        ? (isUp ? 'elevator_up' : 'elevator_down')
        : (isUp ? 'stairs_up' : 'stairs_down');

      const action = isElevator ? 'Take the elevator' : 'Take the stairs';
      steps.push({
        stepIndex: stepIndex++,
        direction,
        instruction: `${action} to ${secondNode.levelName}`,
        detail: `Transition from ${firstNode.levelName} to ${secondNode.levelName}`,
        distanceMeters: initialDistance,
        durationSeconds: initialDuration + (isElevator ? 15 : 0),
        fromLevelId: firstNode.levelId,
        toLevelId: secondNode.levelId,
        fromLevelName: firstNode.levelName,
        toLevelName: secondNode.levelName,
        isLevelTransition: true,
        transitionType: firstEdge.edgeType as any,
        startPoint: { x: firstNode.x, y: firstNode.y, levelId: firstNode.levelId },
        endPoint: { x: secondNode.x, y: secondNode.y, levelId: secondNode.levelId }
      });
    } else {
      steps.push({
        stepIndex: stepIndex++,
        direction: 'depart',
        instruction: `Head straight toward ${secondNode.name || 'the hallway'}`,
        detail: `On ${firstNode.levelName}`,
        distanceMeters: initialDistance,
        durationSeconds: initialDuration,
        fromLevelId: firstNode.levelId,
        toLevelId: secondNode.levelId,
        fromLevelName: firstNode.levelName,
        toLevelName: secondNode.levelName,
        isLevelTransition: false,
        startPoint: { x: firstNode.x, y: firstNode.y, levelId: firstNode.levelId },
        endPoint: { x: secondNode.x, y: secondNode.y, levelId: secondNode.levelId }
      });
    }

    // Process subsequent nodes (1 to N-1)
    for (let i = 1; i < nodes.length - 1; i++) {
      const prev = nodes[i - 1];
      const curr = nodes[i];
      const next = nodes[i + 1];
      const edge = edges[i];

      const segmentDist = Math.round(edge.distanceMeters * 10) / 10;
      const segmentDur = Math.max(2, Math.round(segmentDist / walkingSpeedMps));

      // Handle vertical level transition
      if (edge.isVertical) {
        const isUp = next.levelOrdinal > curr.levelOrdinal;
        const isElevator = edge.edgeType === 'elevator';
        const direction: TurnDirection = isElevator
          ? (isUp ? 'elevator_up' : 'elevator_down')
          : (isUp ? 'stairs_up' : 'stairs_down');

        const action = isElevator ? 'Take the elevator' : 'Take the stairs';
        steps.push({
          stepIndex: stepIndex++,
          direction,
          instruction: `${action} to ${next.levelName}`,
          detail: `Exit onto ${next.levelName}`,
          distanceMeters: segmentDist,
          durationSeconds: segmentDur + (isElevator ? 15 : 0),
          fromLevelId: curr.levelId,
          toLevelId: next.levelId,
          fromLevelName: curr.levelName,
          toLevelName: next.levelName,
          isLevelTransition: true,
          transitionType: edge.edgeType as any,
          startPoint: { x: curr.x, y: curr.y, levelId: curr.levelId },
          endPoint: { x: next.x, y: next.y, levelId: next.levelId }
        });
        continue;
      }

      // Handle 2D planar turn
      if (prev.levelId === curr.levelId && curr.levelId === next.levelId) {
        const v1x = curr.x - prev.x;
        const v1y = curr.y - prev.y;
        const v2x = next.x - curr.x;
        const v2y = next.y - curr.y;

        const angle1 = Math.atan2(v1y, v1x);
        const angle2 = Math.atan2(v2y, v2x);

        let deltaAngle = (angle2 - angle1) * (180 / Math.PI);
        // Normalize to [-180, 180]
        while (deltaAngle > 180) deltaAngle -= 360;
        while (deltaAngle < -180) deltaAngle += 360;

        let direction: TurnDirection = 'straight';
        let turnName = 'Continue straight';

        if (deltaAngle > 135 || deltaAngle < -135) {
          direction = 'sharp_right';
          turnName = 'Make a sharp turn';
        } else if (deltaAngle >= 60 && deltaAngle <= 135) {
          direction = 'right';
          turnName = 'Turn right';
        } else if (deltaAngle >= 25 && deltaAngle < 60) {
          direction = 'slight_right';
          turnName = 'Turn slightly right';
        } else if (deltaAngle <= -60 && deltaAngle >= -135) {
          direction = 'left';
          turnName = 'Turn left';
        } else if (deltaAngle <= -25 && deltaAngle > -60) {
          direction = 'slight_left';
          turnName = 'Turn slightly left';
        }

        const landmark = next.name ? ` toward ${next.name}` : '';
        steps.push({
          stepIndex: stepIndex++,
          direction,
          instruction: `${turnName}${landmark}`,
          detail: `Walk ${segmentDist}m along the corridor`,
          distanceMeters: segmentDist,
          durationSeconds: segmentDur,
          fromLevelId: curr.levelId,
          toLevelId: next.levelId,
          fromLevelName: curr.levelName,
          toLevelName: next.levelName,
          isLevelTransition: false,
          startPoint: { x: curr.x, y: curr.y, levelId: curr.levelId },
          endPoint: { x: next.x, y: next.y, levelId: next.levelId }
        });
      }
    }

    // Final Arrival step
    const lastNode = nodes[nodes.length - 1];
    steps.push({
      stepIndex: stepIndex++,
      direction: 'arrive',
      instruction: `Arrive at ${targetName}`,
      detail: `Destination is on your side on ${lastNode.levelName}`,
      distanceMeters: 0,
      durationSeconds: 0,
      fromLevelId: lastNode.levelId,
      toLevelId: lastNode.levelId,
      fromLevelName: lastNode.levelName,
      toLevelName: lastNode.levelName,
      isLevelTransition: false,
      startPoint: { x: lastNode.x, y: lastNode.y, levelId: lastNode.levelId },
      endPoint: { x: lastNode.x, y: lastNode.y, levelId: lastNode.levelId }
    });

    return steps;
  }
}
