import type { Position } from "~/editor/elma-types";
import { PICTURE_SCALE } from "./picture-metrics";

const binaryMaskCache = new WeakMap<ImageBitmap, HTMLCanvasElement>();
const scratchCanvasCache = new Map<
  string,
  { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }
>();
const maskedTextureCanvasCache = new WeakMap<object, HTMLCanvasElement>();

export function getMaskedTextureCanvas({
  cacheKey,
  textureSprite,
  maskSprite,
  position,
}: {
  cacheKey?: object;
  textureSprite: ImageBitmap;
  maskSprite: ImageBitmap;
  position: Position;
}) {
  if (typeof document === "undefined") return null;

  if (cacheKey) {
    const cached = maskedTextureCanvasCache.get(cacheKey);
    if (cached) return cached;
  }

  const scratch = getScratchCanvas(
    maskSprite.width,
    maskSprite.height,
    !cacheKey,
  );
  if (!scratch) return null;
  const { canvas, ctx } = scratch;

  const pattern = ctx.createPattern(textureSprite, "repeat");
  if (!pattern) return null;

  pattern.setTransform(
    new DOMMatrix().translate(
      -position.x / PICTURE_SCALE,
      -position.y / PICTURE_SCALE,
    ),
  );

  ctx.fillStyle = pattern;
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(
    getBinaryMaskCanvas(maskSprite),
    0,
    0,
    maskSprite.width,
    maskSprite.height,
  );
  ctx.globalCompositeOperation = "source-over";

  if (cacheKey) {
    maskedTextureCanvasCache.set(cacheKey, canvas);
  }

  return canvas;
}

function getBinaryMaskCanvas(maskSprite: ImageBitmap) {
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

function getScratchCanvas(width: number, height: number, fresh: boolean) {
  if (fresh) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = false;
    return { canvas, ctx };
  }

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
