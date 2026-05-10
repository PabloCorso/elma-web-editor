import type { LgrAssets } from "~/components/lgr-assets";
import {
  ELMA_PIXEL_SCALE,
  ELMA_PIXELS_PER_WORLD_UNIT,
  colors,
  GRASS_FILL_DEPTH,
  GRASS_BASELINE_PX,
  QGRASS_TOP_EXTRA_PX,
} from "~/editor/constants";
import { getBitmapWorldDimensions } from "./picture-metrics";
import { fillGrassEdges } from "./world-geometry";

type Point = { x: number; y: number };

type GrassVariant = {
  sprite: ImageBitmap;
  isUp: boolean;
  widthPx: number;
  heightPx: number;
  widthWorld: number;
  heightWorld: number;
  fallPx: number;
  bordersPx: number[];
};

type GrassPlacement = {
  xPx: number;
  topYPx: number;
  variant: GrassVariant;
};

type PolygonHeightmap = {
  xOriginPx: number;
  x0Px: number;
  yByXPx: number[];
  lengthPx: number;
  yAtLocalXPx: (xPx: number) => number | undefined;
};

const grassBordersCache = new WeakMap<ImageBitmap, number[]>();

function scaleQgrass(qgrass: ImageBitmap, scale: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(qgrass.width * scale);
  canvas.height = Math.floor(qgrass.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.imageSmoothingEnabled = true; // Enable smoothing to reduce pixelation
  ctx.drawImage(qgrass, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function drawGrassPolygon({
  ctx,
  lgrAssets,
  vertices,
  groundPath,
  useGrassAssets,
}: {
  ctx: CanvasRenderingContext2D;
  lgrAssets: LgrAssets | null;
  vertices: Point[];
  groundPath: Path2D;
  useGrassAssets: boolean;
}) {
  if (
    lgrAssets &&
    useGrassAssets &&
    drawGrassPolygonWithAssets({ ctx, lgrAssets, vertices, groundPath })
  ) {
    return;
  }

  fillGrassEdges({
    ctx,
    vertices,
    groundPath,
    zoom: ELMA_PIXELS_PER_WORLD_UNIT,
    depth: GRASS_FILL_DEPTH,
    fillStyle: colors.grass,
  });
}

export function createGrassPolygonHeightmap(
  vertices: Point[],
): PolygonHeightmap | null {
  if (vertices.length < 3) return null;

  const xOriginPx = Math.floor(
    Math.min(
      ...vertices.map((vertex) => vertex.x * ELMA_PIXELS_PER_WORLD_UNIT),
    ),
  );

  let longestEdgeIndex = 0;
  let longestHorizontalSpan = 0;
  for (let i = 0; i < vertices.length; i += 1) {
    const j = (i + 1) % vertices.length;
    const span = Math.abs(vertices[i]!.x - vertices[j]!.x);
    if (span > longestHorizontalSpan) {
      longestHorizontalSpan = span;
      longestEdgeIndex = i;
    }
  }

  if (longestHorizontalSpan < 0.0001) {
    return null;
  }

  let v1 = longestEdgeIndex;
  let v2 = (v1 + 1) % vertices.length;
  const polygonIsCounterclockwise = vertices[v1]!.x >= vertices[v2]!.x;

  let x0Px = -1;
  let currentXPx = -1;
  const yByXPx: number[] = [];

  for (let i = 0; i < vertices.length - 1; i += 1) {
    if (polygonIsCounterclockwise) {
      v1 = (v1 + 1) % vertices.length;
      v2 = (v2 + 1) % vertices.length;
    } else {
      v1 = (v1 - 1 + vertices.length) % vertices.length;
      v2 = (v2 - 1 + vertices.length) % vertices.length;
    }

    const leftVertexIndex = polygonIsCounterclockwise ? v1 : v2;
    const rightVertexIndex = polygonIsCounterclockwise ? v2 : v1;

    currentXPx = appendGrassLineHeightmap(
      vertices[leftVertexIndex]!,
      vertices[rightVertexIndex]!,
      xOriginPx,
      x0Px,
      currentXPx,
      yByXPx,
    );

    if (x0Px < 0 && yByXPx.length > 0) {
      x0Px = toLocalPixel(vertices[leftVertexIndex]!.x, xOriginPx);
    }
  }

  if (x0Px < 0 || yByXPx.length === 0) {
    return null;
  }

  const lengthPx = currentXPx - x0Px + 1;

  return {
    xOriginPx,
    x0Px,
    yByXPx,
    lengthPx,
    yAtLocalXPx(xPx) {
      const index = xPx - x0Px;
      if (index < 0 || index >= lengthPx) return undefined;
      return yByXPx[index];
    },
  };
}

function drawGrassPolygonWithAssets({
  ctx,
  lgrAssets,
  vertices,
  groundPath,
}: {
  ctx: CanvasRenderingContext2D;
  lgrAssets: LgrAssets;
  vertices: Point[];
  groundPath: Path2D;
}) {
  const { qgrass, variants } = getGrassVariants(lgrAssets);
  if (variants.length < 2) return false;

  const placements = calculateGrassPlacements(vertices, variants);
  if (placements.length === 0) return false;

  const composedCanvas = composeGrassCanvas({ placements, qgrass });
  if (!composedCanvas) return false;

  const previousImageSmoothing = ctx.imageSmoothingEnabled;
  ctx.save();
  ctx.clip(groundPath, "evenodd");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    composedCanvas.canvas,
    0,
    0,
    composedCanvas.canvas.width,
    composedCanvas.canvas.height,
    composedCanvas.minXPx * ELMA_PIXEL_SCALE,
    composedCanvas.minYPx * ELMA_PIXEL_SCALE,
    composedCanvas.canvas.width * ELMA_PIXEL_SCALE,
    composedCanvas.canvas.height * ELMA_PIXEL_SCALE,
  );

  ctx.restore();
  ctx.imageSmoothingEnabled = previousImageSmoothing;
  return true;
}

function calculateGrassPlacements(
  vertices: Point[],
  variants: GrassVariant[],
): GrassPlacement[] {
  const heightmap = createGrassPolygonHeightmap(vertices);
  if (!heightmap) return [];

  let curXPx = heightmap.x0Px;
  let curYPx = heightmap.yAtLocalXPx(curXPx);
  if (curYPx == null) return [];

  const placements: GrassPlacement[] = [];

  while (curXPx < heightmap.x0Px + heightmap.lengthPx) {
    let bestDistance = Number.POSITIVE_INFINITY;
    let bestVariant: GrassVariant | null = null;

    for (const variant of variants) {
      const targetXPx = curXPx + variant.widthPx;
      const targetYPx =
        targetXPx >= heightmap.x0Px + heightmap.lengthPx
          ? heightmap.yByXPx[heightmap.lengthPx - 1]!
          : heightmap.yAtLocalXPx(targetXPx)!;
      const distance = Math.abs(targetYPx - (curYPx + variant.fallPx));
      if (distance < bestDistance) {
        bestDistance = distance;
        bestVariant = variant;
      }
    }

    if (!bestVariant) {
      curXPx += 1;
      const nextYPx = heightmap.yAtLocalXPx(curXPx);
      if (nextYPx != null) {
        curYPx = nextYPx;
      }
      continue;
    }

    const topYPx =
      curYPx - Math.ceil((bestVariant.heightPx - bestVariant.fallPx) / 2);
    placements.push({
      xPx: heightmap.xOriginPx + Math.floor(curXPx),
      topYPx: Math.floor(topYPx),
      variant: bestVariant,
    });

    curXPx += bestVariant.widthPx;
    curYPx += bestVariant.fallPx;
  }

  return placements;
}

function getGrassVariants(lgrAssets: LgrAssets) {
  const { qgrass, variants } = lgrAssets.getGrassSprites();

  return {
    qgrass,
    variants: variants.map(({ sprite, isUp }) => {
      const { width: widthWorld, height: heightWorld } =
        getBitmapWorldDimensions(sprite);
      const fallPx = (sprite.height - GRASS_BASELINE_PX) * (isUp ? -1 : 1);

      return {
        sprite,
        isUp,
        widthPx: sprite.width,
        heightPx: sprite.height,
        widthWorld,
        heightWorld,
        fallPx,
        bordersPx: getGrassBorders(sprite),
      };
    }),
  };
}

function getGrassBorders(sprite: ImageBitmap) {
  const cached = grassBordersCache.get(sprite);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = sprite.width;
  canvas.height = sprite.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const borders: number[] = [];

  if (!ctx) {
    for (let x = 0; x < sprite.width; x += 1) {
      borders.push(sprite.height);
    }
    grassBordersCache.set(sprite, borders);
    return borders;
  }

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, 0, 0);
  const { data } = ctx.getImageData(0, 0, sprite.width, sprite.height);

  for (let x = 0; x < sprite.width; x += 1) {
    let y = 0;
    for (; y < sprite.height; y += 1) {
      const alphaIndex = 4 * (y * sprite.width + x) + 3;
      if ((data[alphaIndex] ?? 0) !== 0) break;
    }
    borders.push(y);
  }

  grassBordersCache.set(sprite, borders);
  return borders;
}

function composeGrassCanvas({
  placements,
  qgrass,
}: {
  placements: GrassPlacement[];
  qgrass: ImageBitmap | null;
}) {
  let minXPx = Number.POSITIVE_INFINITY;
  let minYPx = Number.POSITIVE_INFINITY;
  let maxXPx = Number.NEGATIVE_INFINITY;
  let maxYPx = Number.NEGATIVE_INFINITY;

  for (const placement of placements) {
    minXPx = Math.min(minXPx, placement.xPx);
    minYPx = Math.min(minYPx, placement.topYPx - QGRASS_TOP_EXTRA_PX);
    maxXPx = Math.max(maxXPx, placement.xPx + placement.variant.widthPx);
    maxYPx = Math.max(maxYPx, placement.topYPx + placement.variant.heightPx);
  }

  const widthPx = Math.max(1, maxXPx - minXPx);
  const heightPx = Math.max(1, maxYPx - minYPx);
  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const canvasCtx = canvas.getContext("2d");
  if (!canvasCtx) return null;

  canvasCtx.imageSmoothingEnabled = false;
  canvasCtx.fillStyle = colors.grass;
  canvasCtx.fillRect(0, 0, widthPx, heightPx);

  if (qgrass) {
    // Scale down qgrass to reduce pixelation
    const scale = ELMA_PIXELS_PER_WORLD_UNIT / 100; // guessed scale that looks okay
    const scaledQgrass = scaleQgrass(qgrass, scale);
    const qgrassPattern = canvasCtx.createPattern(scaledQgrass, "repeat");
    if (qgrassPattern) {
      const mod = (value: number, modulus: number) =>
        ((value % modulus) + modulus) % modulus;
      const offsetX = -mod(minXPx, scaledQgrass.width);
      const offsetY = -mod(minYPx, scaledQgrass.height);

      canvasCtx.save();
      canvasCtx.translate(offsetX, offsetY);
      canvasCtx.fillStyle = qgrassPattern;
      canvasCtx.fillRect(
        0,
        0,
        widthPx + scaledQgrass.width,
        heightPx + scaledQgrass.height,
      );
      canvasCtx.restore();
    }
  }

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = widthPx;
  maskCanvas.height = heightPx;
  const maskCtx = maskCanvas.getContext("2d");
  if (!maskCtx) return null;
  maskCtx.imageSmoothingEnabled = false;
  maskCtx.fillStyle = "#ffffff";

  for (const placement of placements) {
    drawLocalGrassTextureMask(maskCtx, placement, minXPx, minYPx);
  }

  canvasCtx.globalCompositeOperation = "destination-in";
  canvasCtx.drawImage(maskCanvas, 0, 0);
  canvasCtx.globalCompositeOperation = "source-over";

  for (const placement of placements) {
    canvasCtx.drawImage(
      placement.variant.sprite,
      placement.xPx - minXPx,
      placement.topYPx - minYPx,
    );
  }

  return {
    canvas,
    minXPx,
    minYPx,
  };
}

function drawLocalGrassTextureMask(
  ctx: CanvasRenderingContext2D,
  placement: GrassPlacement,
  minXPx: number,
  minYPx: number,
) {
  const xPx = placement.xPx - minXPx;
  const topYPx = placement.topYPx - minYPx;
  const maskTopYPx = topYPx - QGRASS_TOP_EXTRA_PX;

  for (let i = 0; i < placement.variant.bordersPx.length; i += 1) {
    const borderYPx = topYPx + placement.variant.bordersPx[i]! + 1;
    ctx.fillRect(xPx + i, maskTopYPx, 1, borderYPx - maskTopYPx);
  }
}

function appendGrassLineHeightmap(
  from: Point,
  to: Point,
  xOriginPx: number,
  x0Px: number,
  currentXPx: number,
  yByXPx: number[],
) {
  const x1Px = toLocalPixel(from.x, xOriginPx);
  const y1Px = toPixel(from.y);
  const x2Px = toLocalPixel(to.x, xOriginPx);
  const y2Px = toPixel(to.y);

  if (x1Px > x2Px) {
    return currentXPx;
  }

  let nextCurrentXPx = currentXPx;
  let nextX0Px = x0Px;

  if (nextCurrentXPx < 0) {
    nextCurrentXPx = x1Px;
    nextX0Px = x1Px;
    yByXPx[0] = y1Px;
  }

  if (x1Px >= x2Px) {
    return nextCurrentXPx;
  }

  if (nextCurrentXPx < x1Px - 1) {
    return nextCurrentXPx;
  }

  for (let xPx = x1Px; xPx <= x2Px; xPx += 1) {
    if (xPx < nextCurrentXPx) {
      continue;
    }

    const t = (xPx - x1Px) / (x2Px - x1Px);
    const yPx = Math.trunc(y1Px + (y2Px - y1Px) * t);
    yByXPx[xPx - nextX0Px] = yPx;
    nextCurrentXPx = xPx;
  }

  return nextCurrentXPx;
}

function toPixel(value: number) {
  return Math.trunc(value * ELMA_PIXELS_PER_WORLD_UNIT);
}

function toLocalPixel(value: number, originPx: number) {
  return Math.trunc(value * ELMA_PIXELS_PER_WORLD_UNIT - originPx);
}
