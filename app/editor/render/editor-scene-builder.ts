import type { EditorState } from "~/editor/editor-state";
import { DRAFT_PREVIEW_OPACITY } from "~/editor/constants";
import { Clip } from "~/editor/elma-types";
import type { SelectToolState } from "~/editor/tools/select-tool";
import type { VertexToolState } from "~/editor/tools/vertex-tool";
import {
  type EditorHoverableWorldItem,
  type EditorPolygonSceneItem,
  type EditorWorldDrawItem,
  type EditorWorldScene,
} from "./editor-scene";
import { DEFAULT_OBJECT_RENDER_DISTANCE } from "./render-constants";
import { getGrassEdgeIndices } from "./world-geometry";

const DEFAULT_DISTANCE_AND_CLIP = {
  distance: DEFAULT_OBJECT_RENDER_DISTANCE,
  clip: Clip.Unclipped,
} as const;

export function buildEditorWorldScene(state: EditorState): EditorWorldScene {
  const scenePolygons = getScenePolygons(state);

  return {
    ground: state.ground,
    sky: state.sky,
    animateSprites: state.animateSprites,
    visibility: {
      useGroundSkyTextures: state.levelVisibility.useGroundSkyTextures,
      showObjectAnimations: state.levelVisibility.showObjectAnimations,
      showObjects: state.levelVisibility.showObjects,
      showPictures: state.levelVisibility.showPictures,
      showTextures: state.levelVisibility.showTextures,
      showPolygons: state.levelVisibility.showPolygons,
      showPolygonBounds: state.levelVisibility.showPolygonBounds,
      showObjectBounds: state.levelVisibility.showObjectBounds,
    },
    viewport: {
      width: 0,
      height: 0,
      offsetX: state.viewPortOffset.x,
      offsetY: state.viewPortOffset.y,
      zoom: state.zoom,
    },
    polygons: scenePolygons.map<EditorPolygonSceneItem>((polygon) => ({
      polygon,
      grassEdgeIndices: polygon.grass
        ? getGrassEdgeIndices(polygon.vertices)
        : [],
    })),
    drawItems: getDrawItemQueue(state),
  };
}

export function getEditorHoverableItems(
  state: EditorState,
): EditorHoverableWorldItem[] {
  const items = getDrawItemQueue(state);
  return items.map((item) => {
    if (item.type === "picture") {
      return {
        kind: "picture",
        picture: item,
      };
    }

    return {
      kind: "object",
      type: item.type,
      position: item.position,
    };
  });
}

function getDrawItemQueue(state: EditorState): EditorWorldDrawItem[] {
  const activeTool = state.actions.getActiveTool();
  const drafts = activeTool?.getDrafts?.() ?? {};
  const selectState = state.actions.getToolState<SelectToolState>("select");
  const {
    showObjects,
    showPictures,
    showTextures,
    showObjectBounds,
    showPictureBounds,
    showTextureBounds,
  } = state.levelVisibility;
  const showAnyObjects = showObjects || showObjectBounds;
  const showAnyPictures =
    showPictures || showTextures || showPictureBounds || showTextureBounds;

  return [
    ...(showAnyPictures
      ? state.pictures.map((picture) => ({
          type: "picture" as const,
          ...picture,
        }))
      : []),
    ...(drafts.pictures ?? []).map((picture) => ({
      type: "picture" as const,
      ...picture,
      draft: true,
      opacity: DRAFT_PREVIEW_OPACITY,
      showBounds: true,
    })),
    ...(showAnyObjects
      ? state.killers.map((killer) => ({
          type: "killer" as const,
          ...DEFAULT_DISTANCE_AND_CLIP,
          position: killer,
          selected: isSelectedObject(selectState, killer),
        }))
      : []),
    ...(drafts.killers ?? []).map((killer) => ({
      type: "killer" as const,
      ...DEFAULT_DISTANCE_AND_CLIP,
      position: killer,
      selected: false,
      draft: true,
      opacity: DRAFT_PREVIEW_OPACITY,
    })),
    ...(showAnyObjects
      ? state.apples.map((apple) => ({
          ...apple,
          type: "apple" as const,
          ...DEFAULT_DISTANCE_AND_CLIP,
          selected: isSelectedObject(selectState, apple.position),
        }))
      : []),
    ...(drafts.apples ?? []).map((apple) => ({
      ...apple,
      type: "apple" as const,
      ...DEFAULT_DISTANCE_AND_CLIP,
      selected: false,
      draft: true,
      opacity: DRAFT_PREVIEW_OPACITY,
    })),
    ...(showAnyObjects
      ? state.flowers.map((flower) => ({
          type: "flower" as const,
          ...DEFAULT_DISTANCE_AND_CLIP,
          position: flower,
          selected: isSelectedObject(selectState, flower),
        }))
      : []),
    ...(drafts.flowers ?? []).map((flower) => ({
      type: "flower" as const,
      ...DEFAULT_DISTANCE_AND_CLIP,
      position: flower,
      selected: false,
      draft: true,
      opacity: DRAFT_PREVIEW_OPACITY,
    })),
    ...(showAnyObjects
      ? [
          {
            type: "start" as const,
            ...DEFAULT_DISTANCE_AND_CLIP,
            position: state.start,
            selected: isSelectedObject(selectState, state.start),
          },
        ]
      : []),
  ].sort((a, b) => b.distance - a.distance);
}

function getScenePolygons(state: EditorState) {
  const activeTool = state.actions.getActiveTool();
  const draftPolygons = activeTool?.getDrafts?.()?.polygons || [];
  const vertexToolState =
    state.actions.getToolState<VertexToolState>("vertex");
  const scenePolygons = vertexToolState?.editingPolygon
    ? state.polygons.filter(
        (polygon) => polygon !== vertexToolState.editingPolygon,
      )
    : state.polygons;
  return [...scenePolygons, ...draftPolygons];
}

function isSelectedObject(
  selectState: SelectToolState | undefined,
  position: { x: number; y: number },
) {
  return (selectState?.selectedObjects ?? []).some(
    (selected) => selected.x === position.x && selected.y === position.y,
  );
}
