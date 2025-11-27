import * as elmajs from "elmajs";
import type { EditorState } from "../editor-state";
import { isPolygonClockwise, shouldPolygonBeGround } from "../helpers";

const { Level, ObjectType, Gravity } = elmajs;

export function getLevelFromState(state: EditorState) {
  // Validate that we have at least some level data
  if (!state.polygons || state.polygons.length === 0) {
    throw new Error(
      "No polygons found in level. Please add some geometry before downloading."
    );
  }

  const level = new Level();
  level.name = state.levelName || "Untitled";

  // Normalize polygon winding based on nesting (ground vs sky) before export
  const normalizedPolygons = state.polygons.map((polygon) => {
    const shouldBeGround = shouldPolygonBeGround(polygon, state.polygons);
    // Export expects opposite ground/sky orientation than the canvas winding check
    const shouldBeGroundForExport = !shouldBeGround;
    const isClockwise = isPolygonClockwise(polygon.vertices);
    const vertices =
      shouldBeGroundForExport === isClockwise
        ? polygon.vertices
        : [...polygon.vertices].reverse();

    return {
      ...polygon,
      vertices: vertices.map((vertex) => ensureFloatingPointPosition(vertex)),
    };
  });

  // Process polygons with floating point coordinates
  level.polygons = normalizedPolygons;

  // Convert separate object arrays to elmajs objects array format
  const objects = [
    // Start position (type 4)
    {
      type: ObjectType.Start,
      position: ensureFloatingPointPosition(state.start),
      gravity: Gravity.None,
      animation: 1,
    },
    // Apples (type 2)
    ...state.apples.map((apple) => ({
      type: ObjectType.Apple,
      position: ensureFloatingPointPosition(apple.position),
      gravity: Gravity.None,
      animation: 1,
    })),
    // Killers (type 3)
    ...state.killers.map((pos) => ({
      type: ObjectType.Killer,
      position: ensureFloatingPointPosition(pos),
      gravity: Gravity.None,
      animation: 1,
    })),
    // Flowers (type 1)
    ...state.flowers.map((pos) => ({
      type: ObjectType.Exit,
      position: ensureFloatingPointPosition(pos),
      gravity: Gravity.None,
      animation: 1,
    })),
  ];

  level.objects = objects;
  level.integrity = level.calculateIntegrity();

  return level;
}

// Ensure coordinates are floating point (not integers)
function ensureFloatingPointPosition(pos: elmajs.Position) {
  return {
    x: Number.isInteger(pos.x) ? parseFloat(pos.x.toFixed(1)) : pos.x,
    y: Number.isInteger(pos.y) ? parseFloat(pos.y.toFixed(1)) : pos.y,
  };
}

export function levelToBlob(level: elmajs.Level): Blob {
  const buffer = level.toBuffer();
  const uint8Array = new Uint8Array(buffer);
  return new Blob([uint8Array], { type: "application/octet-stream" });
}

export function downloadLevel(level: elmajs.Level) {
  const blob = levelToBlob(level);
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${level.name}.lev`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
