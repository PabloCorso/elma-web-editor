import type { Position, Polygon } from "elmajs";
import { CoordinateUtils } from "./coordinate-utils";

export interface SelectedVertex {
  polygon: Polygon;
  vertex: Position;
}

export class SelectionUtils {
  static findVertexNearPosition(
    pos: Position,
    polygons: Polygon[],
    threshold: number = 10,
    zoom: number
  ): { polygon: Polygon; vertex: Position } | null {
    for (const polygon of polygons) {
      for (const vertex of polygon.vertices) {
        if (CoordinateUtils.isWithinThreshold(pos, vertex, threshold, zoom)) {
          return { polygon, vertex };
        }
      }
    }
    return null;
  }

  static findObjectNearPosition(
    pos: Position,
    objects: Position[],
    threshold: number = 15,
    zoom: number
  ): Position | null {
    for (const object of objects) {
      if (CoordinateUtils.isWithinThreshold(pos, object, threshold, zoom)) {
        return object;
      }
    }
    return null;
  }

  static isVertexSelected(
    vertex: { polygon: Polygon; vertex: Position },
    selectedVertices: SelectedVertex[]
  ): boolean {
    return selectedVertices.some(
      (sv) => sv.polygon === vertex.polygon && sv.vertex === vertex.vertex
    );
  }

  static isObjectSelected(
    object: Position,
    selectedObjects: Position[]
  ): boolean {
    return selectedObjects.includes(object);
  }

  static getAllObjects(
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

  static isPointInRect(
    point: Position,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number
  ): boolean {
    return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
  }

  static getSelectionBounds(
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
} 