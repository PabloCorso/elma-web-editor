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

export function getClosestPointOnLineSegment(
  point: Position,
  lineStart: Position,
  lineEnd: Position
): Position {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) {
    // Line segment is actually a point
    return lineStart;
  }
  
  let param = dot / lenSq;
  
  // Clamp param to [0, 1] to stay within the line segment
  param = Math.max(0, Math.min(1, param));
  
  return {
    x: lineStart.x + param * C,
    y: lineStart.y + param * D
  };
}
