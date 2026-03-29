import { LgrAssets } from "~/components/lgr-assets";
import { colors, ELMA_PIXEL_SCALE, GRASS_FILL_DEPTH } from "~/editor/constants";
import { drawGravityArrow, drawObject } from "~/editor/draw-object";
import { drawPicture, PICTURE_SCALE } from "~/editor/draw-picture";
import { Clip, Gravity } from "~/editor/elma-types";
import type { LevelVisibilitySettings } from "~/editor/level-visibility";
import type {
  GameObject,
  LevelData,
  ObjectProperty,
  Polygon,
} from "~/editor/play-mode/engine/level/level";

export const DEFAULT_OBJECT_RENDER_DISTANCE = 500;
const GRASS_TINY_CANVAS_UNIT_PX = 1;
const MIN_ZOOM_EPSILON = 0.0001;
const GRASS_VERTICAL_EDGE_THRESHOLD = 0.05;
const GRASS_COLLINEAR_DOT_THRESHOLD = 0.98;
const WORLD_CULL_MARGIN = 2;

type WorldRect = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type PolygonMetadata = {
  polygon: Polygon;
  bounds: WorldRect;
  grassEdgeIndices: number[];
};

type LevelRenderCache = {
  polygons: PolygonMetadata[];
};

const levelRenderCache = new WeakMap<LevelData, LevelRenderCache>();
const maskedPictureCache = new WeakMap<
  LevelData["sprites"][number],
  HTMLCanvasElement
>();

type RenderItem =
  | {
      type: "picture";
      source: LevelData["sprites"][number];
      pictureName: string;
      maskName: string;
      textureName: string;
      clipping: number;
      distance: number;
      position: { x: number; y: number };
    }
  | {
      type: "object";
      objectType: GameObject["type"];
      property: ObjectProperty;
      animation: number;
      clip: Clip;
      distance: number;
      position: { x: number; y: number };
    }
  | {
      type: "bike";
      distance: number;
      render: () => void;
    };

export function renderPlayModeWorld({
  ctx,
  level,
  lgrAssets,
  viewport,
  visibility,
  extraItems,
}: {
  ctx: CanvasRenderingContext2D;
  level: LevelData;
  lgrAssets: LgrAssets | null;
  viewport: {
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    zoom: number;
  };
  visibility: Pick<
    LevelVisibilitySettings,
    | "useGroundSkyTextures"
    | "showObjectAnimations"
    | "showObjects"
    | "showPictures"
    | "showTextures"
    | "showPolygons"
    | "showPolygonBounds"
  >;
  extraItems?: RenderItem[];
}) {
  const worldRect = getViewportWorldRect(viewport);
  const cache = getLevelRenderCache(level);
  const visiblePolygons = cache.polygons.filter((entry) =>
    rectsIntersect(entry.bounds, worldRect),
  );
  const skyPath = buildPolygonPath(visiblePolygons);
  const viewportPath = buildViewportPath(viewport);
  const groundPath = buildGroundPath(viewportPath, skyPath);

  drawGroundFill(ctx, lgrAssets, level.foregroundName, groundPath, visibility);
  drawPolygons(
    ctx,
    visiblePolygons,
    lgrAssets,
    level.backgroundName,
    skyPath,
    groundPath,
    viewport.zoom,
    visibility,
  );

  const queue = getDrawItemQueue(
    level,
    lgrAssets,
    visibility,
    worldRect,
    extraItems ?? [],
  );
  for (const item of queue) {
    ctx.save();

    if (item.type === "picture") {
      if (item.clipping === Clip.Sky) {
        ctx.clip(skyPath, "evenodd");
      } else if (item.clipping === Clip.Ground) {
        ctx.clip(groundPath, "evenodd");
      }
    } else if (item.type === "bike") {
      item.render();
      ctx.restore();
      continue;
    } else if (item.clip === Clip.Sky) {
      ctx.clip(skyPath, "evenodd");
    } else if (item.clip === Clip.Ground) {
      ctx.clip(groundPath, "evenodd");
    }

    drawItem(ctx, lgrAssets, item, visibility);
    ctx.restore();
  }
}

function getDrawItemQueue(
  level: LevelData,
  lgrAssets: LgrAssets | null,
  visibility: Pick<
    LevelVisibilitySettings,
    "showObjects" | "showPictures" | "showTextures"
  >,
  worldRect: WorldRect,
  extraItems: RenderItem[],
): RenderItem[] {
  const pictures =
    visibility.showPictures || visibility.showTextures
      ? level.sprites
          .filter((sprite) =>
            sprite.textureName && sprite.maskName
              ? visibility.showTextures
              : visibility.showPictures,
          )
          .filter((sprite) => isSpriteVisible(sprite, lgrAssets, worldRect))
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
    ? level.objects
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
          objectType: obj.type,
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

  return [...pictures, ...objects, ...extraItems].sort(
    (a, b) => b.distance - a.distance,
  );
}

function drawItem(
  ctx: CanvasRenderingContext2D,
  lgrAssets: LgrAssets | null,
  item: RenderItem,
  visibility: Pick<LevelVisibilitySettings, "showObjectAnimations">,
) {
  if (item.type === "bike") {
    item.render();
    return;
  }

  if (item.type === "picture") {
    if (!lgrAssets) return;

    if (item.textureName && item.maskName) {
      const textureSprite = lgrAssets.getSprite(item.textureName);
      const maskSprite = lgrAssets.getSprite(item.maskName);
      if (!textureSprite || !maskSprite) return;

      const cachedPicture = getCachedMaskedPictureCanvas(
        item.source,
        textureSprite,
        maskSprite,
      );
      if (!cachedPicture) return;

      ctx.save();
      const prevImageSmoothing = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        cachedPicture,
        0,
        0,
        cachedPicture.width,
        cachedPicture.height,
        item.position.x,
        item.position.y,
        maskSprite.width * PICTURE_SCALE,
        maskSprite.height * PICTURE_SCALE,
      );
      ctx.imageSmoothingEnabled = prevImageSmoothing;
      ctx.restore();
      return;
    }

    const sprite = item.pictureName
      ? lgrAssets.getSprite(item.pictureName)
      : null;
    if (!sprite) return;
    drawPicture({
      ctx,
      sprite,
      position: item.position,
    });
    return;
  }

  if (!lgrAssets) return;

  if (item.objectType === "food") {
    const sprite = lgrAssets.getAppleSprite(item.animation > 1 ? 2 : 1);
    if (!sprite) return;
    drawObject({
      ctx,
      sprite,
      position: item.position,
      animate: visibility.showObjectAnimations,
    });
    drawGravityArrow({
      ctx,
      position: item.position,
      gravity: gravityFromProperty(item.property),
    });
    return;
  }

  if (item.objectType === "killer") {
    const sprite = lgrAssets.getKillerSprite();
    if (!sprite) return;
    drawObject({
      ctx,
      sprite,
      position: item.position,
      animate: visibility.showObjectAnimations,
    });
    return;
  }

  if (item.objectType === "exit") {
    const sprite = lgrAssets.getFlowerSprite();
    if (!sprite) return;
    drawObject({
      ctx,
      sprite,
      position: item.position,
      animate: visibility.showObjectAnimations,
    });
  }
}

function buildPolygonPath(polygons: PolygonMetadata[]): Path2D {
  const path = new Path2D();

  for (const { polygon } of polygons) {
    if (polygon.vertices.length < 3 || polygon.isGrass) continue;

    path.moveTo(polygon.vertices[0]!.x, polygon.vertices[0]!.y);
    for (let i = 1; i < polygon.vertices.length; i++) {
      path.lineTo(polygon.vertices[i]!.x, polygon.vertices[i]!.y);
    }
    path.closePath();
  }

  return path;
}

function buildViewportPath(viewport: {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  zoom: number;
}) {
  const halfWidth = viewport.width / (2 * viewport.zoom);
  const halfHeight = viewport.height / (2 * viewport.zoom);
  const path = new Path2D();

  path.rect(
    viewport.centerX - halfWidth,
    viewport.centerY - halfHeight,
    halfWidth * 2,
    halfHeight * 2,
  );

  return path;
}

function getViewportWorldRect(viewport: {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  zoom: number;
}): WorldRect {
  const halfWidth = viewport.width / (2 * viewport.zoom);
  const halfHeight = viewport.height / (2 * viewport.zoom);

  return {
    minX: viewport.centerX - halfWidth - WORLD_CULL_MARGIN,
    maxX: viewport.centerX + halfWidth + WORLD_CULL_MARGIN,
    minY: viewport.centerY - halfHeight - WORLD_CULL_MARGIN,
    maxY: viewport.centerY + halfHeight + WORLD_CULL_MARGIN,
  };
}

function buildGroundPath(viewportPath: Path2D, skyPath: Path2D) {
  const path = new Path2D();
  path.addPath(viewportPath);
  path.addPath(skyPath);
  return path;
}

function getTexturePattern(
  ctx: CanvasRenderingContext2D,
  lgrAssets: LgrAssets | null,
  textureName: string,
) {
  if (!lgrAssets) return null;

  const textureSprite = lgrAssets.getSprite(textureName);
  if (!textureSprite) return null;

  const pattern = ctx.createPattern(textureSprite, "repeat");
  if (!pattern) return null;

  pattern.setTransform(new DOMMatrix().scale(PICTURE_SCALE, PICTURE_SCALE));
  return pattern;
}

function getFlatTextureColor(textureName: string, fallback: string) {
  const textureColor = colors[textureName as keyof typeof colors];
  return textureColor ?? fallback;
}

function drawGroundFill(
  ctx: CanvasRenderingContext2D,
  lgrAssets: LgrAssets | null,
  groundName: string,
  groundPath: Path2D,
  visibility: Pick<LevelVisibilitySettings, "useGroundSkyTextures">,
) {
  const groundPattern = visibility.useGroundSkyTextures
    ? getTexturePattern(ctx, lgrAssets, groundName)
    : null;
  const groundColor = getFlatTextureColor(groundName, colors.ground);

  ctx.save();
  ctx.fillStyle = groundPattern ?? groundColor;
  ctx.fill(groundPath, "evenodd");
  ctx.restore();
}

function drawPolygons(
  ctx: CanvasRenderingContext2D,
  polygons: PolygonMetadata[],
  lgrAssets: LgrAssets | null,
  backgroundName: string,
  skyPath: Path2D,
  groundPath: Path2D,
  zoom: number,
  visibility: Pick<
    LevelVisibilitySettings,
    "showPolygons" | "showPolygonBounds" | "useGroundSkyTextures"
  >,
) {
  if (!visibility.showPolygons && !visibility.showPolygonBounds) return;

  const skyFill = visibility.useGroundSkyTextures
    ? getTexturePattern(ctx, lgrAssets, backgroundName)
    : null;
  const skyColor = getFlatTextureColor(backgroundName, colors.sky);

  if (visibility.showPolygons) {
    ctx.save();
    ctx.fillStyle = skyFill ?? skyColor;
    ctx.fill(skyPath, "evenodd");
    ctx.restore();
  }

  for (const { polygon, grassEdgeIndices } of polygons) {
    if (polygon.vertices.length < 3) continue;

    if (polygon.isGrass) {
      if (visibility.showPolygons) {
        drawGrassFill(ctx, polygon, groundPath, zoom);
      }
      if (!visibility.showPolygonBounds) continue;
      ctx.strokeStyle = colors.grass;
      ctx.lineWidth = 1 / zoom;
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";
      ctx.beginPath();
      for (const i of grassEdgeIndices) {
        const from = polygon.vertices[i]!;
        const to = polygon.vertices[(i + 1) % polygon.vertices.length]!;
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
      }
      ctx.stroke();
      continue;
    }

    if (!visibility.showPolygonBounds) continue;
    ctx.strokeStyle = colors.edges;
    ctx.lineWidth = 1 / zoom;
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";
    ctx.beginPath();
    ctx.moveTo(polygon.vertices[0]!.x, polygon.vertices[0]!.y);
    for (let i = 1; i < polygon.vertices.length; i++) {
      ctx.lineTo(polygon.vertices[i]!.x, polygon.vertices[i]!.y);
    }
    ctx.lineTo(polygon.vertices[0]!.x, polygon.vertices[0]!.y);
    ctx.stroke();
  }
}

function getGrassEdgeIndices(vertices: { x: number; y: number }[]) {
  const n = vertices.length;
  if (n < 2) return [];

  let longestEdgeIndex = -1;
  let longestEdgeLength = -1;
  for (let i = 0; i < n; i++) {
    const from = vertices[i]!;
    const to = vertices[(i + 1) % n]!;
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    if (length > longestEdgeLength) {
      longestEdgeLength = length;
      longestEdgeIndex = i;
    }
  }

  return [...Array(n).keys()].filter((i) => i !== longestEdgeIndex);
}

function drawGrassFill(
  ctx: CanvasRenderingContext2D,
  polygon: Polygon,
  groundPath: Path2D,
  zoom: number,
) {
  const depth = GRASS_FILL_DEPTH;
  const joinOverlap = ELMA_PIXEL_SCALE;
  const tinyCanvasUnit =
    GRASS_TINY_CANVAS_UNIT_PX / Math.max(zoom, MIN_ZOOM_EPSILON);
  const minTwoSidedOvershoot = tinyCanvasUnit;
  const verticalGapFix = tinyCanvasUnit;
  const verticalThreshold = GRASS_VERTICAL_EDGE_THRESHOLD;
  const collinearDotThreshold = GRASS_COLLINEAR_DOT_THRESHOLD;
  const n = polygon.vertices.length;
  const grassEdgeIndices = getGrassEdgeIndices(polygon.vertices);
  const grassEdgesSet = new Set(grassEdgeIndices);

  ctx.save();
  ctx.clip(groundPath, "evenodd");
  ctx.fillStyle = colors.grass;

  for (const i of grassEdgeIndices) {
    const from = polygon.vertices[i]!;
    const to = polygon.vertices[(i + 1) % n]!;
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    if (length === 0) continue;

    const prevEdgeIndex = (i - 1 + n) % n;
    const nextEdgeIndex = (i + 1) % n;
    const hasPrevGrass = grassEdgesSet.has(prevEdgeIndex);
    const hasNextGrass = grassEdgesSet.has(nextEdgeIndex);
    const edgeDir = {
      x: (to.x - from.x) / length,
      y: (to.y - from.y) / length,
    };
    const edgeOverlap = Math.min(joinOverlap, length * 0.25);
    const prevFrom = polygon.vertices[prevEdgeIndex]!;
    const prevTo = polygon.vertices[i]!;
    const prevLength = Math.hypot(prevTo.x - prevFrom.x, prevTo.y - prevFrom.y);
    const nextFrom = polygon.vertices[(i + 1) % n]!;
    const nextTo = polygon.vertices[(i + 2) % n]!;
    const nextLength = Math.hypot(nextTo.x - nextFrom.x, nextTo.y - nextFrom.y);

    let fromX = from.x;
    let fromY = from.y;
    let toX = to.x;
    let toY = to.y;
    let fromExtend = 0;
    let toExtend = 0;

    if (hasPrevGrass && prevLength > 0) {
      const prevDir = {
        x: (prevTo.x - prevFrom.x) / prevLength,
        y: (prevTo.y - prevFrom.y) / prevLength,
      };
      const dot = prevDir.x * edgeDir.x + prevDir.y * edgeDir.y;
      if (dot >= collinearDotThreshold) {
        fromExtend = edgeOverlap;
      }
    }

    if (hasNextGrass && nextLength > 0) {
      const nextDir = {
        x: (nextTo.x - nextFrom.x) / nextLength,
        y: (nextTo.y - nextFrom.y) / nextLength,
      };
      const dot = edgeDir.x * nextDir.x + edgeDir.y * nextDir.y;
      if (dot >= collinearDotThreshold) {
        toExtend = edgeOverlap;
      }
    }

    if (hasPrevGrass && hasNextGrass) {
      toExtend = Math.max(
        toExtend,
        Math.min(minTwoSidedOvershoot, length * 0.25),
      );
    }

    fromX -= edgeDir.x * fromExtend;
    fromY -= edgeDir.y * fromExtend;
    toX += edgeDir.x * toExtend;
    toY += edgeDir.y * toExtend;

    if (Math.abs(edgeDir.x) <= verticalThreshold) {
      const fix = edgeDir.y < 0 ? verticalGapFix : -verticalGapFix;
      fromX += fix;
      toX += fix;
    }

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.lineTo(toX, toY - depth);
    ctx.lineTo(fromX, fromY - depth);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
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

function rectsIntersect(a: WorldRect, b: WorldRect) {
  return (
    a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY
  );
}

function rectContainsPointWithMargin(
  rect: WorldRect,
  x: number,
  y: number,
  margin: number,
) {
  return (
    x >= rect.minX - margin &&
    x <= rect.maxX + margin &&
    y >= rect.minY - margin &&
    y <= rect.maxY + margin
  );
}

function isSpriteVisible(
  sprite: LevelData["sprites"][number],
  lgrAssets: LgrAssets | null,
  worldRect: WorldRect,
) {
  const dimensions = getSpriteWorldDimensions(sprite, lgrAssets);
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

function getSpriteWorldDimensions(
  sprite: LevelData["sprites"][number],
  lgrAssets: LgrAssets | null,
) {
  if (!lgrAssets) return null;

  if (sprite.textureName && sprite.maskName) {
    const maskSprite = lgrAssets.getSprite(sprite.maskName);
    if (!maskSprite) return null;
    return {
      width: maskSprite.width * PICTURE_SCALE,
      height: maskSprite.height * PICTURE_SCALE,
    };
  }

  const pictureSprite = sprite.pictureName
    ? lgrAssets.getSprite(sprite.pictureName)
    : null;
  if (!pictureSprite) return null;

  return {
    width: pictureSprite.width * PICTURE_SCALE,
    height: pictureSprite.height * PICTURE_SCALE,
  };
}

function getCachedMaskedPictureCanvas(
  sprite: LevelData["sprites"][number],
  textureSprite: ImageBitmap,
  maskSprite: ImageBitmap,
) {
  const cached = maskedPictureCache.get(sprite);
  if (cached) return cached;
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = maskSprite.width;
  canvas.height = maskSprite.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = false;
  const pattern = ctx.createPattern(textureSprite, "repeat");
  if (!pattern) return null;

  pattern.setTransform(
    new DOMMatrix().translate(
      -sprite.r.x / PICTURE_SCALE,
      -sprite.r.y / PICTURE_SCALE,
    ),
  );

  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(createBinaryMaskCanvas(maskSprite), 0, 0);
  ctx.globalCompositeOperation = "source-over";

  maskedPictureCache.set(sprite, canvas);
  return canvas;
}

const binaryMaskCanvasCache = new WeakMap<ImageBitmap, HTMLCanvasElement>();

function createBinaryMaskCanvas(maskSprite: ImageBitmap) {
  const cached = binaryMaskCanvasCache.get(maskSprite);
  if (cached) return cached;

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = maskSprite.width;
  maskCanvas.height = maskSprite.height;
  const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true });
  if (!maskCtx) return maskCanvas;

  maskCtx.imageSmoothingEnabled = false;
  maskCtx.drawImage(maskSprite, 0, 0);

  const imageData = maskCtx.getImageData(
    0,
    0,
    maskCanvas.width,
    maskCanvas.height,
  );
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i + 3] = data[i + 3] > 0 ? 255 : 0;
  }
  maskCtx.putImageData(imageData, 0, 0);
  binaryMaskCanvasCache.set(maskSprite, maskCanvas);
  return maskCanvas;
}

function gravityFromProperty(property: ObjectProperty) {
  switch (property) {
    case "gravity_up":
      return Gravity.Up;
    case "gravity_down":
      return Gravity.Down;
    case "gravity_left":
      return Gravity.Left;
    case "gravity_right":
      return Gravity.Right;
    default:
      return Gravity.None;
  }
}
