import type { Position } from "./elma-types";
import { uiColors, uiStrokeWidths } from "./constants";
import {
  getBitmapWorldDimensions,
  PICTURE_SCALE,
} from "./render/picture-metrics";
import { getMaskedTextureCanvas } from "./render/canvas-picture-cache";

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
  const { width: worldWidth, height: worldHeight } =
    getBitmapWorldDimensions(sprite);

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
  const { width: worldWidth, height: worldHeight } =
    getBitmapWorldDimensions(maskSprite);
  const tempCanvas = getMaskedTextureCanvas({
    textureSprite,
    maskSprite,
    position,
  });
  if (!tempCanvas) return;

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
