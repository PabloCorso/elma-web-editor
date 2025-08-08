import type { Position, Polygon } from "elmajs";
import { isWithinThreshold } from "./coordinate-utils";

export type SelectedVertex = {
  polygon: Polygon;
  vertex: Position;
};

export function findVertexNearPosition(
  pos: Position,
  polygons: Polygon[],
  threshold: number = 10,
  zoom: number
): { polygon: Polygon; vertex: Position } | null {
  for (const polygon of polygons) {
    for (const vertex of polygon.vertices) {
      if (isWithinThreshold(pos, vertex, threshold, zoom)) {
        return { polygon, vertex };
      }
    }
  }
  return null;
}

export function findObjectNearPosition(
  pos: Position,
  objects: Position[],
  threshold: number = 15,
  zoom: number
): Position | null {
  for (const object of objects) {
    if (isWithinThreshold(pos, object, threshold, zoom)) {
      return object;
    }
  }
  return null;
}

export function isVertexSelected(
  vertex: { polygon: Polygon; vertex: Position },
  selectedVertices: SelectedVertex[]
): boolean {
  return selectedVertices.some(
    (sv) => sv.polygon === vertex.polygon && sv.vertex === vertex.vertex
  );
}

export function isObjectSelected(
  object: Position,
  selectedObjects: Position[]
): boolean {
  return selectedObjects.includes(object);
}

export function getAllObjects(
  apples: Position[],
  killers: Position[],
  flowers: Position[],
  start: Position
): Array<{ obj: Position; type: string }> {
  return [
    ...apples.map((apple) => ({ obj: apple, type: "apple" })),
    ...killers.map((killer) => ({ obj: killer, type: "killer" })),
    ...flowers.map((flower) => ({ obj: flower, type: "flower" })),
    { obj: start, type: "start" },
  ];
}

export function isPointInRect(
  point: Position,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): boolean {
  return (
    point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
  );
}

export function getSelectionBounds(
  startPos: Position,
  endPos: Position
): { minX: number; maxX: number; minY: number; maxY: number } {
  return {
    minX: Math.min(startPos.x, endPos.x),
    maxX: Math.max(startPos.x, endPos.x),
    minY: Math.min(startPos.y, endPos.y),
    maxY: Math.max(startPos.y, endPos.y),
  };
}

export function findPolygonEdgeNearPosition(
  pos: Position,
  polygons: Polygon[],
  threshold: number = 8,
  zoom: number
): Polygon | null {
  const adjustedThreshold = threshold / zoom;
  
  for (const polygon of polygons) {
    if (polygon.vertices.length < 3) continue;
    
    // Check each edge of the polygon
    for (let i = 0; i < polygon.vertices.length; i++) {
      const start = polygon.vertices[i];
      const end = polygon.vertices[(i + 1) % polygon.vertices.length];
      
      // Calculate distance from point to line segment
      const distance = distanceToLineSegment(pos, start, end);
      
      if (distance <= adjustedThreshold) {
        return polygon;
      }
    }
  }
  
  return null;
}

function distanceToLineSegment(
  point: Position,
  lineStart: Position,
  lineEnd: Position
): number {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) {
    // Line segment is actually a point
    return Math.sqrt(A * A + B * B);
  }
  
  let param = dot / lenSq;
  
  let xx, yy;
  if (param < 0) {
    xx = lineStart.x;
    yy = lineStart.y;
  } else if (param > 1) {
    xx = lineEnd.x;
    yy = lineEnd.y;
  } else {
    xx = lineStart.x + param * C;
    yy = lineStart.y + param * D;
  }
  
  const dx = point.x - xx;
  const dy = point.y - yy;
  
  return Math.sqrt(dx * dx + dy * dy);
}
