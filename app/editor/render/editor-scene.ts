import type { LevelVisibilitySettings } from "~/editor/level-visibility";
import type {
  Apple,
  Clip,
  Picture,
  Polygon,
  Position,
} from "../elma-types";

export type EditorWorldViewport = {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  zoom: number;
};

export type EditorWorldVisibility = Pick<
  LevelVisibilitySettings,
  | "useGroundSkyTextures"
  | "showObjectAnimations"
  | "showObjects"
  | "showPictures"
  | "showTextures"
  | "showPolygons"
  | "showPolygonBounds"
  | "showObjectBounds"
>;

export type EditorPolygonSceneItem = {
  polygon: Polygon;
  grassEdgeIndices: number[];
};

export type EditorPictureSceneItem = Picture & {
  type: "picture";
  draft?: boolean;
  opacity?: number;
  showBounds?: boolean;
};

export type EditorKillerSceneItem = {
  type: "killer";
  position: Position;
  distance: number;
  clip: Clip;
  selected: boolean;
  draft?: boolean;
  opacity?: number;
};

export type EditorFlowerSceneItem = {
  type: "flower";
  position: Position;
  distance: number;
  clip: Clip;
  selected: boolean;
  draft?: boolean;
  opacity?: number;
};

export type EditorStartSceneItem = {
  type: "start";
  position: Position;
  distance: number;
  clip: Clip;
  selected: boolean;
  opacity?: number;
};

export type EditorAppleSceneItem = Apple & {
  type: "apple";
  distance: number;
  clip: Clip;
  selected: boolean;
  draft?: boolean;
  opacity?: number;
};

export type EditorWorldDrawItem =
  | EditorPictureSceneItem
  | EditorKillerSceneItem
  | EditorFlowerSceneItem
  | EditorStartSceneItem
  | EditorAppleSceneItem;

export type EditorWorldScene = {
  ground: string;
  sky: string;
  animateSprites: boolean;
  visibility: EditorWorldVisibility;
  viewport: EditorWorldViewport;
  polygons: EditorPolygonSceneItem[];
  drawItems: EditorWorldDrawItem[];
};

export type EditorHoverableWorldItem =
  | {
      kind: "object";
      type: "apple" | "killer" | "flower" | "start";
      position: Position;
    }
  | {
      kind: "picture";
      picture: Picture;
    };
