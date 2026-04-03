/**
 * Anchor point detection - ported from physics_collision.cpp
 */
import { Vec2, rotate90deg } from "../core/vec2";
import {
  TWO_POINT_DISCRIMINATION_DISTANCE,
  OBJECT_RADIUS,
} from "../core/constants";
import type { Segment, Segments } from "./segments";
import type { GameObject } from "../level";

/**
 * Check for collision between a circle (wheel/head) and a segment.
 * Returns the anchor point if collision occurs.
 */
function getAnchorPoint(r: Vec2, radius: number, seg: Segment): Vec2 | null {
  const rel = r.sub(seg.r);
  const positionAlongLine = rel.dot(seg.unitVector);

  if (positionAlongLine < 0) {
    // Behind the segment
    if (r.sub(seg.r).length() < radius) {
      return seg.r.clone();
    }
    return null;
  }

  if (positionAlongLine > seg.length) {
    // Past the end of the segment
    const endPoint = seg.r.add(seg.unitVector.scale(seg.length));
    if (r.sub(endPoint).length() < radius) {
      return endPoint;
    }
    return null;
  }

  // Along the segment
  const n = rotate90deg(seg.unitVector);
  const distance = rel.dot(n);
  if (distance < -radius || distance > radius) {
    return null;
  }

  return seg.r.add(seg.unitVector.scale(positionAlongLine));
}

interface AnchorPointResult {
  count: number;
  point1: Vec2;
  point2: Vec2;
}

/**
 * Get up to two points of collision for a circle at position r with radius.
 */
export function getTwoAnchorPoints(
  segments: Segments,
  r: Vec2,
  radius: number,
): AnchorPointResult {
  segments.iterateCollisionGridCellSegments(r);
  let count = 0;
  let point1 = new Vec2();
  let point2 = new Vec2();

  let seg: Segment | null;
  while ((seg = segments.nextCollisionGridSegment()) !== null) {
    const point = getAnchorPoint(r, radius, seg);
    if (point === null) continue;

    if (count === 1) {
      point2 = point;
      count++;
      // If points are too close, merge them
      if (point1.sub(point2).length() < TWO_POINT_DISCRIMINATION_DISTANCE) {
        point1 = point1.add(point2).scale(0.5);
        count = 1;
      } else {
        // Valid second point found
        return { count, point1, point2 };
      }
    }

    if (count === 0) {
      point1 = point;
      count++;
    }
  }

  return { count, point1, point2 };
}

/**
 * Return the index of the first object that a head/wheel touches, or -1 if none.
 */
export function getTouchingObject(
  objects: GameObject[],
  r: Vec2,
  radius: number,
  isFlagTag: boolean,
): number {
  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i]!;
    if (!obj.active) continue;

    // Skip Exit in flagtag mode
    if (obj.type === "exit" && isFlagTag) continue;

    const diff = r.sub(obj.r);
    const maxDistance = radius + OBJECT_RADIUS;
    if (diff.x * diff.x + diff.y * diff.y < maxDistance * maxDistance) {
      return i;
    }
  }

  return -1;
}
