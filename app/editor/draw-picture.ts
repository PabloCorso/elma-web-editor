import { type Position } from "elmajs";

const PICTURE_SCALE = 1 / 48;

export function drawPicture({
  ctx,
  sprite,
  position,
  opacity = 1,
}: {
  ctx: CanvasRenderingContext2D;
  sprite: ImageBitmap;
  position: Position;
  opacity?: number;
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
  ctx.restore();
}
