import type { Position } from "./elma-types";
import { uiColors, uiStrokeWidths } from "./constants";

const PICTURE_SCALE = 1 / 48;

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
    worldHeight
  );

  if (showBounds) {
    ctx.strokeStyle = uiColors.pictureBounds;
    ctx.lineWidth = boundsLineWidth;
    ctx.strokeRect(position.x, position.y, worldWidth, worldHeight);
  }

  ctx.restore();
}
