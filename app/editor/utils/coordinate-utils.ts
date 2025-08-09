import type { Position } from "elmajs";

export function screenToWorld(
  screenX: number,
  screenY: number,
  viewPortOffset: Position,
  zoom: number
): Position {
  return {
    x: (screenX - viewPortOffset.x) / zoom,
    y: (screenY - viewPortOffset.y) / zoom,
  };
}

export function distance(pos1: Position, pos2: Position): number {
  return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
}

export function isWithinThreshold(
  pos1: Position,
  pos2: Position,
  threshold: number,
  zoom: number
): boolean {
  return distance(pos1, pos2) <= threshold / zoom;
}
