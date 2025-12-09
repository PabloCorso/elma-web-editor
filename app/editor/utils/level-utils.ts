import type { Polygon, Position } from "elmajs";
import type { Apple } from "../editor.types";

export function calculateBoundingBox({
  polygons,
  apples,
  killers,
  flowers,
  start,
}: {
  polygons?: Polygon[];
  apples?: Apple[];
  killers?: Position[];
  flowers?: Position[];
  start?: Position;
}) {
  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;

  // Update bounds from polygons
  polygons?.forEach((polygon) => {
    polygon.vertices.forEach((vertex) => {
      minX = Math.min(minX, vertex.x);
      minY = Math.min(minY, vertex.y);
      maxX = Math.max(maxX, vertex.x);
      maxY = Math.max(maxY, vertex.y);
    });
  });

  // Update bounds from objects
  const positions = [
    ...(apples?.map((a) => a.position) ?? []),
    ...(killers ?? []),
    ...(flowers ?? []),
    ...(start ? [start] : []),
  ];

  positions.forEach((pos) => {
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x);
    maxY = Math.max(maxY, pos.y);
  });

  return { minX, minY, maxX, maxY };
}
