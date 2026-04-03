import type { BikeCoords } from "~/editor/draw-kuski";
import type { LevelVisibilitySettings } from "~/editor/level-visibility";
import type {
  LevelData,
  ObjectProperty,
  Polygon,
} from "~/editor/play-mode/engine/level";

export type PlayModeRenderVisibility = Pick<
  LevelVisibilitySettings,
  | "useGroundSkyTextures"
  | "showObjectAnimations"
  | "showObjects"
  | "showPictures"
  | "showTextures"
  | "showPolygons"
  | "showPolygonBounds"
>;

export type PlayModeViewport = {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  zoom: number;
};

export type PlayModePolygonSceneItem = {
  polygon: Polygon;
  grassEdgeIndices: number[];
};

export type PlayModeScenePictureItem = {
  type: "picture";
  source: LevelData["sprites"][number];
  pictureName: string;
  maskName: string;
  textureName: string;
  clipping: number;
  distance: number;
  position: { x: number; y: number };
};

export type PlayModeSceneObjectItem = {
  type: "object";
  objectType: "food" | "killer" | "exit";
  property: ObjectProperty;
  animation: number;
  clip: number;
  distance: number;
  position: { x: number; y: number };
};

export type PlayModeSceneBikeItem = {
  type: "bike";
  distance: number;
  start: { x: number; y: number };
  coords: BikeCoords;
  fallback: {
    bike: { x: number; y: number };
    leftWheel: { x: number; y: number };
    rightWheel: { x: number; y: number };
    head: { x: number; y: number };
    flipped: boolean;
    rotation: number;
  };
};

export type PlayModeSceneDrawItem =
  | PlayModeScenePictureItem
  | PlayModeSceneObjectItem
  | PlayModeSceneBikeItem;

export type PlayModeScene = {
  clearColor: string;
  level: LevelData;
  viewport: PlayModeViewport;
  visibility: PlayModeRenderVisibility;
  polygons: PlayModePolygonSceneItem[];
  drawItems: PlayModeSceneDrawItem[];
};
