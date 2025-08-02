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
      // Skip the current polygon and grass polygons (grass is decorative only)
      if (otherPolygon === polygon || otherPolygon.grass) continue;
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

  const result = groundVotes >= skyVotes;

  // Return the majority vote
  return result;
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

    // Add points at 1/3 and 2/3 along each edge for better coverage
    const third1 = {
      x: current.x + (next.x - current.x) / 3,
      y: current.y + (next.y - current.y) / 3,
    };
    const third2 = {
      x: current.x + (2 * (next.x - current.x)) / 3,
      y: current.y + (2 * (next.y - current.y)) / 3,
    };
    points.push(third1, third2);
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

// Helper function to check if a point is inside a polygon with improved precision
export function isPointInPolygon(
  point: Position,
  vertices: Position[]
): boolean {
  if (vertices.length < 3) return false;

  let inside = false;
  const epsilon = 1e-10; // Small epsilon for floating-point comparisons

  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x;
    const yi = vertices[i].y;
    const xj = vertices[j].x;
    const yj = vertices[j].y;

    // Handle horizontal edges (avoid division by zero)
    if (Math.abs(yj - yi) < epsilon) {
      // Horizontal edge - check if point is on the edge
      if (Math.abs(point.y - yi) < epsilon) {
        const minX = Math.min(xi, xj);
        const maxX = Math.max(xi, xj);
        if (point.x >= minX - epsilon && point.x <= maxX + epsilon) {
          return true; // Point is on the edge, consider it inside
        }
      }
      continue; // Skip horizontal edges for ray casting
    }

    // Check if the ray intersects this edge
    if (yi > point.y !== yj > point.y) {
      // Calculate intersection x-coordinate
      const intersectX = ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;

      // Use epsilon for floating-point comparison
      if (point.x < intersectX - epsilon) {
        inside = !inside;
      } else if (Math.abs(point.x - intersectX) < epsilon) {
        // Point is exactly on the edge
        return true;
      }
    }
  }

  return inside;
}

// Debug function to help identify polygon orientation issues
export function debugPolygonOrientation(
  polygon: Polygon,
  allPolygons: Polygon[]
): {
  isClockwise: boolean;
  shouldBeGround: boolean;
  samplePoints: Position[];
  containmentResults: Array<{
    point: Position;
    containmentCount: number;
    isGround: boolean;
  }>;
} {
  const isClockwise = isPolygonClockwise(polygon.vertices);
  const samplePoints = getPolygonSamplePoints(polygon.vertices);
  const containmentResults = [];

  for (const point of samplePoints) {
    let containmentCount = 0;

    for (const otherPolygon of allPolygons) {
      // Skip the current polygon and grass polygons (grass is decorative only)
      if (otherPolygon === polygon || otherPolygon.grass) continue;
      if (isPointInPolygon(point, otherPolygon.vertices)) {
        containmentCount++;
      }
    }

    const isGround = containmentCount % 2 === 0;
    containmentResults.push({ point, containmentCount, isGround });
  }

  const groundVotes = containmentResults.filter((r) => r.isGround).length;
  const skyVotes = containmentResults.filter((r) => !r.isGround).length;
  const shouldBeGround = groundVotes >= skyVotes;

  return {
    isClockwise,
    shouldBeGround,
    samplePoints,
    containmentResults,
  };
}
