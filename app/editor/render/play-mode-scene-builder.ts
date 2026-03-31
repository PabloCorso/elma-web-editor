import { Clip } from "~/editor/elma-types";
import { FRAME_INDEX_TO_TIME } from "~/editor/play-mode/engine/core/constants";
import type { GameState } from "~/editor/play-mode/engine/game/game-loop";
import type { LevelData, Polygon } from "~/editor/play-mode/engine/level/level";
import { DEFAULT_OBJECT_RENDER_DISTANCE } from "~/editor/render/render-constants";
import {
  getGrassEdgeIndices,
  getViewportWorldRectFromCenter,
  rectContainsPointWithMargin,
  rectsIntersect,
  WORLD_CULL_MARGIN,
  type WorldRect,
} from "~/editor/render/world-geometry";
import type {
  PlayModePolygonSceneItem,
  PlayModeRenderVisibility,
  PlayModeScene,
  PlayModeSceneDrawItem,
  PlayModeViewport,
} from "./play-mode-scene";

type LevelRenderCache = {
  polygons: Array<{
    polygon: Polygon;
    bounds: WorldRect;
    grassEdgeIndices: number[];
  }>;
};

const levelRenderCache = new WeakMap<LevelData, LevelRenderCache>();
const VOLT_ARM_ANIMATION_FRAMES = 28;
const VOLT_ARM_ANIMATION_DURATION =
  VOLT_ARM_ANIMATION_FRAMES * FRAME_INDEX_TO_TIME;

export function buildPlayModeScene({
  state,
  viewport,
  visibility,
  resolvePictureDimensions,
}: {
  state: GameState;
  viewport: PlayModeViewport;
  visibility: PlayModeRenderVisibility;
  resolvePictureDimensions?: (picture: {
    name?: string;
    texture?: string;
    mask?: string;
  }) => { width: number; height: number } | null;
}): PlayModeScene {
  const worldRect = getViewportWorldRectFromCenter(viewport);
  const cache = getLevelRenderCache(state.level);
  const polygons = cache.polygons
    .filter((entry) => rectsIntersect(entry.bounds, worldRect))
    .map<PlayModePolygonSceneItem>(({ polygon, grassEdgeIndices }) => ({
      polygon,
      grassEdgeIndices,
    }));

  return {
    clearColor: "#1a1a2e",
    level: state.level,
    viewport,
    visibility,
    polygons,
    drawItems: getDrawItemQueue(
      state,
      visibility,
      worldRect,
      resolvePictureDimensions,
    ),
  };
}

function getDrawItemQueue(
  state: GameState,
  visibility: Pick<
    PlayModeRenderVisibility,
    "showObjects" | "showPictures" | "showTextures" | "showObjectAnimations"
  >,
  worldRect: WorldRect,
  resolvePictureDimensions?: (picture: {
    name?: string;
    texture?: string;
    mask?: string;
  }) => { width: number; height: number } | null,
): PlayModeSceneDrawItem[] {
  const pictures =
    visibility.showPictures || visibility.showTextures
      ? state.level.sprites
          .filter((sprite) =>
            sprite.textureName && sprite.maskName
              ? visibility.showTextures
              : visibility.showPictures,
          )
          .filter((sprite) =>
            isSpriteVisible(sprite, worldRect, resolvePictureDimensions),
          )
          .map((sprite) => ({
            type: "picture" as const,
            source: sprite,
            pictureName: sprite.pictureName,
            maskName: sprite.maskName,
            textureName: sprite.textureName,
            clipping: sprite.clipping,
            distance: sprite.distance,
            position: {
              x: sprite.r.x,
              y: sprite.r.y,
            },
          }))
      : [];

  const objects = visibility.showObjects
    ? state.level.objects
        .filter((obj) => obj.active)
        .filter((obj) => obj.type !== "start")
        .filter((obj) =>
          rectContainsPointWithMargin(
            worldRect,
            obj.r.x,
            -obj.r.y,
            WORLD_CULL_MARGIN,
          ),
        )
        .map((obj) => ({
          type: "object" as const,
          objectType: obj.type as "food" | "killer" | "exit",
          property: obj.property,
          animation: obj.animation,
          clip: Clip.Unclipped,
          distance: DEFAULT_OBJECT_RENDER_DISTANCE,
          position: {
            x: obj.r.x,
            y: -obj.r.y,
          },
        }))
    : [];

  return [...pictures, ...objects, buildBikeSceneItem(state)].sort(
    (a, b) => b.distance - a.distance,
  );
}

function buildBikeSceneItem(state: GameState): PlayModeSceneDrawItem {
  const motor = state.motor;
  const rawVoltProgress =
    state.lastVoltDirection == null
      ? 0
      : (state.gameTime - state.lastVoltTime) / VOLT_ARM_ANIMATION_DURATION;
  const voltProgress = Math.max(0, Math.min(rawVoltProgress, 1));

  return {
    fallback: {
      bike: {
        x: motor.bike.r.x,
        y: -motor.bike.r.y,
      },
      leftWheel: {
        x: motor.leftWheel.r.x,
        y: -motor.leftWheel.r.y,
      },
      rightWheel: {
        x: motor.rightWheel.r.x,
        y: -motor.rightWheel.r.y,
      },
      head: {
        x: motor.headR.x,
        y: -motor.headR.y,
      },
      flipped: motor.flippedBike,
      rotation: motor.bike.rotation,
    },
    type: "bike",
    distance: DEFAULT_OBJECT_RENDER_DISTANCE,
    start: {
      x: motor.leftWheel.r.x,
      y: -motor.leftWheel.r.y,
    },
    coords: {
      bikeR: (motor.bike.rotation * 10000) / (Math.PI * 2),
      turn: motor.flippedBike ? 1 : 0,
      leftX: (motor.leftWheel.r.x - motor.bike.r.x) * 1000,
      leftY: (motor.leftWheel.r.y - motor.bike.r.y) * 1000,
      leftR: (motor.leftWheel.rotation * 250) / (Math.PI * 2),
      rightX: (motor.rightWheel.r.x - motor.bike.r.x) * 1000,
      rightY: (motor.rightWheel.r.y - motor.bike.r.y) * 1000,
      rightR: (motor.rightWheel.rotation * 250) / (Math.PI * 2),
      // The original replay renderer's head coords are the rider anchor
      // near the torso/neck, not the physics head collision center.
      headX: (motor.bodyR.x - motor.bike.r.x) * 1000,
      headY: (motor.bodyR.y - motor.bike.r.y) * 1000,
      voltDirection:
        voltProgress > 0 ? state.lastVoltDirection : null,
      voltProgress,
    },
  };
}

function getLevelRenderCache(level: LevelData): LevelRenderCache {
  const cached = levelRenderCache.get(level);
  if (cached) return cached;

  const cache: LevelRenderCache = {
    polygons: level.polygons.map((polygon) => ({
      polygon,
      bounds: getPolygonBounds(polygon),
      grassEdgeIndices: polygon.isGrass
        ? getGrassEdgeIndices(polygon.vertices)
        : [],
    })),
  };
  levelRenderCache.set(level, cache);
  return cache;
}

function getPolygonBounds(polygon: Polygon): WorldRect {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const vertex of polygon.vertices) {
    if (vertex.x < minX) minX = vertex.x;
    if (vertex.y < minY) minY = vertex.y;
    if (vertex.x > maxX) maxX = vertex.x;
    if (vertex.y > maxY) maxY = vertex.y;
  }

  return { minX, minY, maxX, maxY };
}

function isSpriteVisible(
  sprite: LevelData["sprites"][number],
  worldRect: WorldRect,
  resolvePictureDimensions?: (picture: {
    name?: string;
    texture?: string;
    mask?: string;
  }) => { width: number; height: number } | null,
) {
  const dimensions = resolvePictureDimensions?.({
    name: sprite.pictureName,
    texture: sprite.textureName,
    mask: sprite.maskName,
  });
  if (!dimensions) return true;

  return rectsIntersect(
    {
      minX: sprite.r.x,
      minY: sprite.r.y,
      maxX: sprite.r.x + dimensions.width,
      maxY: sprite.r.y + dimensions.height,
    },
    worldRect,
  );
}
