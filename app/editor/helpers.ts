import type { Polygon, Position } from "elmajs";

// Helper function to determine if a polygon is clockwise
export function isPolygonClockwise(vertices: Position[]): boolean {
  let sum = 0;
  for (let i = 0; i < vertices.length; i++) {
    const current = vertices[i];
    const next = vertices[(i + 1) % vertices.length];
    sum += (next.x - current.x) * (next.y + current.y);
  }
  return sum > 0;
}

// Helper function to determine if a polygon should be ground based on winding rule
export function shouldPolygonBeGround(
  polygon: Polygon,
  allPolygons: Polygon[]
): boolean {
  // Use multiple sample points to determine if polygon should be ground
  const samplePoints = getPolygonSamplePoints(polygon.vertices);
  let groundVotes = 0;
  let skyVotes = 0;

  for (const point of samplePoints) {
    let containmentCount = 0;

    for (const otherPolygon of allPolygons) {
      if (otherPolygon === polygon) continue;
      if (isPointInPolygon(point, otherPolygon.vertices)) {
        containmentCount++;
      }
    }

    // If contained by odd number of polygons, it should be sky (not ground)
    if (containmentCount % 2 === 0) {
      groundVotes++;
    } else {
      skyVotes++;
    }
  }

  // Return the majority vote
  return groundVotes >= skyVotes;
}

// Helper function to get multiple sample points from a polygon
export function getPolygonSamplePoints(vertices: Position[]): Position[] {
  if (vertices.length < 3) return [];

  const center = getPolygonCenter(vertices);
  const points = [center];

  // Add additional sample points for better accuracy
  for (let i = 0; i < vertices.length; i++) {
    const current = vertices[i];
    const next = vertices[(i + 1) % vertices.length];

    // Add midpoint of each edge
    const midpoint = {
      x: (current.x + next.x) / 2,
      y: (current.y + next.y) / 2,
    };
    points.push(midpoint);
  }

  return points;
}

// Helper function to get the center of a polygon
export function getPolygonCenter(vertices: Position[]): Position {
  const sumX = vertices.reduce((sum, v) => sum + v.x, 0);
  const sumY = vertices.reduce((sum, v) => sum + v.y, 0);
  return {
    x: sumX / vertices.length,
    y: sumY / vertices.length,
  };
}

// Helper function to check if a point is inside a polygon
export function isPointInPolygon(
  point: Position,
  vertices: Position[]
): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x,
      yi = vertices[i].y;
    const xj = vertices[j].x,
      yj = vertices[j].y;

    if (
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}
