import * as elmajs from "elmajs";
import type { EditorState } from "../editor-state";
import {
  correctPolygonWinding,
  correctPolygonPrecision,
  correctVertexPrecision as correctPositionPrecision,
} from "../polygon-utils";

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

  const normalizedPolygons = state.polygons.map((polygon) => {
    const correctedPolygon = correctPolygonPrecision(polygon);
    return polygon.grass
      ? correctedPolygon
      : correctPolygonWinding(correctedPolygon, state.polygons);
  });

  level.polygons = normalizedPolygons;

  const objects = [
    {
      type: ObjectType.Start,
      position: correctPositionPrecision(state.start),
      gravity: Gravity.None,
      animation: 1,
    },
    ...state.apples.map((apple) => ({
      type: ObjectType.Apple,
      position: correctPositionPrecision(apple.position),
      gravity: Gravity.None,
      animation: 1,
    })),
    ...state.killers.map((pos) => ({
      type: ObjectType.Killer,
      position: correctPositionPrecision(pos),
      gravity: Gravity.None,
      animation: 1,
    })),
    ...state.flowers.map((pos) => ({
      type: ObjectType.Exit,
      position: correctPositionPrecision(pos),
      gravity: Gravity.None,
      animation: 1,
    })),
  ];

  level.objects = objects;
  level.integrity = level.calculateIntegrity();

  return level;
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
