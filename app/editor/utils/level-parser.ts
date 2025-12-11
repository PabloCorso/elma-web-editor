import {
  Clip,
  ElmaLevel,
  Gravity,
  ObjectType,
  type Apple,
  type Level,
  type Position,
} from "../elma-types";
import type { EditorState } from "../editor-state";
import {
  correctPolygonWinding,
  correctPolygonPrecision,
  correctVertexPrecision as correctPositionPrecision,
} from "../polygon-utils";

export type ImportResult = {
  success: boolean;
  data?: Level;
  error?: string;
};

export const defaultLevel: Level = {
  levelName: "",
  polygons: [
    {
      vertices: [
        { x: 2.5, y: 2.5 },
        { x: 47.5, y: 2.5 },
        { x: 47.5, y: 27.5 },
        { x: 2.5, y: 27.5 },
      ],
      grass: false,
    },
  ],
  apples: [{ position: { x: 25, y: 25 }, animation: 1, gravity: Gravity.None }],
  killers: [],
  flowers: [{ x: 45, y: 25 }],
  start: { x: 5, y: 25 },
  pictures: [],
};

export async function levelFromFile(file: File) {
  if (!file.name.toLowerCase().endsWith(".lev")) {
    throw new Error(
      `Invalid file type ${file.name}. Please upload a .lev file.`
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const level = await parseLevFile(arrayBuffer);
  if (!level.levelName) {
    level.levelName = file.name.replace(".lev", "");
  }

  return level;
}

export async function getBuiltinLevel(filename: string) {
  const response = await fetch(`/assets/lev/${filename}`);
  const file = await response.arrayBuffer();
  const level = await parseLevFile(file);
  if (!level.levelName) {
    level.levelName = filename.replace(".lev", "");
  }

  return level;
}

async function parseLevFile(data: ArrayBuffer) {
  const elmaLevel = ElmaLevel.from(data);

  const apples: Apple[] = [];
  const killers: Position[] = [];
  const flowers: Position[] = [];
  let start: Position = { x: 5, y: 25 };

  elmaLevel.objects.forEach((obj) => {
    const position = { x: obj.position.x, y: obj.position.y };

    switch (obj.type) {
      case ObjectType.Exit:
        flowers.push(position);
        break;
      case ObjectType.Apple:
        apples.push({ position, animation: 1, gravity: Gravity.None });
        break;
      case ObjectType.Killer:
        killers.push(position);
        break;
      case ObjectType.Start:
        start = position;
        break;
    }
  });

  const level: Level = {
    levelName: elmaLevel.name,
    polygons: elmaLevel.polygons,
    apples,
    killers,
    flowers,
    start,
    pictures: elmaLevel.pictures,
  };
  return level;
}

export function elmaLevelFromEditorState(state: EditorState) {
  if (!state.polygons || state.polygons.length === 0) {
    throw new Error(
      "No polygons found in level. Please add some geometry before downloading."
    );
  }

  const level = new ElmaLevel();
  level.name = state.levelName || "Untitled";

  const normalizedPolygons = state.polygons.map((polygon) => {
    const correctedPolygon = correctPolygonPrecision(polygon);
    return polygon.grass
      ? correctedPolygon
      : correctPolygonWinding(correctedPolygon, state.polygons);
  });

  level.polygons = normalizedPolygons;

  level.objects = [
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

  level.pictures = state.pictures.map((picture) => ({
    name: picture.name,
    texture: "",
    mask: "",
    position: correctPositionPrecision(picture.position),
    distance: 999,
    clip: Clip.Sky,
    grass: false,
    vertices: [],
  }));

  level.integrity = level.calculateIntegrity();

  return level;
}
