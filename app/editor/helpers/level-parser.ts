import {
  Clip,
  ElmaLevel,
  Gravity,
  Mask,
  ObjectType,
  Texture,
  type Apple,
  type EditorLevel,
  type Position,
} from "../elma-types";
import type { EditorState } from "../editor-state";
import {
  correctPolygonWinding,
  correctPolygonPrecision,
  correctVertexPrecision as correctPositionPrecision,
} from "./polygon-helpers";

export type ImportResult = {
  success: boolean;
  data?: EditorLevel;
  error?: string;
};

const _defaultInternalEditorLevel = {
  polygons: [
    {
      vertices: [
        { x: -24, y: -8 },
        { x: 24, y: -8 },
        { x: 24, y: 2 },
        { x: -24, y: 2 },
      ],
    },
  ],
  flowers: [{ x: -2, y: 0.5 }],
  start: { x: 2, y: 0.5 },
};

 
const _defaultSmibuLevelEditorLevel = {
  polygons: [
    {
      vertices: [
        { x: 0, y: -50 },
        { x: 50, y: -50 },
        { x: 50, y: 0 },
        { x: 0, y: 0 },
      ],
    },
  ],
  flowers: [{ x: 37.5, y: -25 }],
  start: { x: 25, y: -25 },
};

export const defaultLevel: EditorLevel = {
  levelName: "",
  ground: Texture.Ground,
  sky: Texture.Sky,
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

export async function editorLevelFromFile(file: File) {
  if (!file.name.toLowerCase().endsWith(".lev")) {
    throw new Error(
      `Invalid file type ${file.name}. Please upload a .lev file.`,
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const level = await editorLevelFromBuffer(arrayBuffer);
  if (!level.levelName) {
    level.levelName = file.name.replace(".lev", "");
  }

  return level;
}

export async function getBuiltinLevel(filename: string) {
  const response = await fetch(`/assets/lev/${filename}`);
  const file = await response.arrayBuffer();
  const level = await editorLevelFromBuffer(file);
  if (!level.levelName) {
    level.levelName = filename.replace(".lev", "");
  }

  return level;
}

async function editorLevelFromBuffer(data: ArrayBuffer) {
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
        apples.push({
          position,
          animation: parseAppleAnimation(obj.animation),
          gravity: obj.gravity,
        });
        break;
      case ObjectType.Killer:
        killers.push(position);
        break;
      case ObjectType.Start:
        start = position;
        break;
    }
  });

  const level: EditorLevel = {
    levelName: elmaLevel.name,
    ground: elmaLevel.ground || Texture.Ground,
    sky: elmaLevel.sky || Texture.Sky,
    polygons: elmaLevel.polygons,
    apples,
    killers,
    flowers,
    start,
    pictures: elmaLevel.pictures.map((picture) => ({
      ...picture,
      mask: parseMask(picture.mask),
    })),
  };
  return level;
}

function parseMask(mask: string): Mask | "" {
  return Object.values(Mask).includes(mask as Mask) ? (mask as Mask) : "";
}

function parseAppleAnimation(animation: number): 1 | 2 {
  return animation === 2 ? 2 : 1;
}

export function elmaLevelFromEditorState(state: EditorState) {
  if (!state.polygons || state.polygons.length === 0) {
    throw new Error(
      "No polygons found in level. Please add some geometry before downloading.",
    );
  }

  const level = new ElmaLevel();
  level.name = state.levelName || "Untitled";
  level.ground = state.ground || Texture.Ground;
  level.sky = state.sky || Texture.Sky;

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
      gravity: apple.gravity,
      animation: apple.animation,
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
    name: picture.name ?? "",
    texture: picture.texture ?? "",
    mask: picture.mask ?? "",
    position: correctPositionPrecision(picture.position),
    distance: picture.distance ?? 999,
    clip: picture.clip ?? Clip.Sky,
    grass: false,
    vertices: [],
  }));

  level.integrity = level.calculateIntegrity();

  return level;
}
