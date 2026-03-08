import type { Position } from "./elma-types";
import { uiColors, uiStrokeWidths } from "./constants";

export const PICTURE_SCALE = 1 / 48;
const binaryMaskCache = new WeakMap<ImageBitmap, HTMLCanvasElement>();
const scratchCanvasCache = new Map<
  string,
  { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }
>();

export function drawPicture({
  ctx,
  sprite,
  position,
  opacity = 1,
  showBounds = false,
  boundsLineWidth = uiStrokeWidths.boundsIdleScreen,
}: {
  ctx: CanvasRenderingContext2D;
  sprite: ImageBitmap;
  position: Position;
  opacity?: number;
  showBounds?: boolean;
  boundsLineWidth?: number;
}) {
  const worldWidth = sprite.width * PICTURE_SCALE;
  const worldHeight = sprite.height * PICTURE_SCALE;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(
    sprite,
    0,
    0,
    sprite.width,
    sprite.height,
    position.x,
    position.y,
    worldWidth,
    worldHeight,
  );

  if (showBounds) {
    ctx.strokeStyle = uiColors.pictureBounds;
    ctx.lineWidth = boundsLineWidth;
    ctx.strokeRect(position.x, position.y, worldWidth, worldHeight);
  }

  ctx.restore();
}

export function drawPictureBounds({
  ctx,
  position,
  width,
  height,
  boundsLineWidth = uiStrokeWidths.boundsIdleScreen,
}: {
  ctx: CanvasRenderingContext2D;
  position: Position;
  width: number;
  height: number;
  boundsLineWidth?: number;
}) {
  ctx.save();
  ctx.strokeStyle = uiColors.pictureBounds;
  ctx.lineWidth = boundsLineWidth;
  ctx.strokeRect(
    position.x,
    position.y,
    width * PICTURE_SCALE,
    height * PICTURE_SCALE,
  );
  ctx.restore();
}

export function drawMaskedTexturePicture({
  ctx,
  textureSprite,
  maskSprite,
  position,
  opacity = 1,
  showBounds = false,
  boundsLineWidth = uiStrokeWidths.boundsIdleScreen,
}: {
  ctx: CanvasRenderingContext2D;
  textureSprite: ImageBitmap;
  maskSprite: ImageBitmap;
  position: Position;
  opacity?: number;
  showBounds?: boolean;
  boundsLineWidth?: number;
}) {
  const worldWidth = maskSprite.width * PICTURE_SCALE;
  const worldHeight = maskSprite.height * PICTURE_SCALE;

  if (typeof document === "undefined") return;
  const scratch = getScratchCanvas(maskSprite.width, maskSprite.height);
  if (!scratch) return;
  const { canvas: tempCanvas, ctx: tempCtx } = scratch;

  const pattern = tempCtx.createPattern(textureSprite, "repeat");
  if (!pattern) return;

  // Align texture to world coordinates so adjacent instances blend seamlessly.
  pattern.setTransform(
    new DOMMatrix().translate(
      -position.x / PICTURE_SCALE,
      -position.y / PICTURE_SCALE,
    ),
  );

  tempCtx.fillStyle = pattern;
  tempCtx.globalCompositeOperation = "source-over";
  tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
  tempCtx.globalCompositeOperation = "destination-in";
  const binaryMask = createBinaryMaskCanvas(maskSprite);
  tempCtx.drawImage(binaryMask, 0, 0, maskSprite.width, maskSprite.height);

  ctx.save();
  const prevImageSmoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = opacity;
  ctx.drawImage(
    tempCanvas,
    0,
    0,
    tempCanvas.width,
    tempCanvas.height,
    position.x,
    position.y,
    worldWidth,
    worldHeight,
  );

  if (showBounds) {
    ctx.strokeStyle = uiColors.pictureBounds;
    ctx.lineWidth = boundsLineWidth;
    ctx.strokeRect(position.x, position.y, worldWidth, worldHeight);
  }

  ctx.imageSmoothingEnabled = prevImageSmoothing;
  ctx.restore();
}

function createBinaryMaskCanvas(maskSprite: ImageBitmap) {
  const cached = binaryMaskCache.get(maskSprite);
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
  binaryMaskCache.set(maskSprite, maskCanvas);
  return maskCanvas;
}

function getScratchCanvas(width: number, height: number) {
  const cacheKey = `${width}x${height}`;
  const cached = scratchCanvasCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = false;
  const scratch = { canvas, ctx };
  scratchCanvasCache.set(cacheKey, scratch);
  return scratch;
}
