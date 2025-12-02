import { OBJECT_DIAMETER, type Position } from "elmajs";

const OBJECT_FRAME_PX = 40; // width of a single frame in object sprite sheet
const OBJECT_FPS = 30; // animation speed for object sprites

export function drawObject({
  ctx,
  sprite,
  position,
  animate = false,
  opacity = 1,
}: {
  ctx: CanvasRenderingContext2D;
  sprite: ImageBitmap;
  position: Position;
  animate?: boolean;
  opacity?: number;
}) {
  const frameWidth = OBJECT_FRAME_PX;
  const frameHeight = Math.min(OBJECT_FRAME_PX, sprite.height);
  const frames = Math.max(1, Math.floor(sprite.width / frameWidth));
  const frameIndex = animate
    ? Math.floor((performance.now() / 1000) * OBJECT_FPS) % frames
    : 0;
  const sx = frameIndex * frameWidth;
  const sy = 0;

  const targetHeight = OBJECT_DIAMETER;
  const targetWidth = (frameWidth / frameHeight) * targetHeight;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(
    sprite,
    sx,
    sy,
    frameWidth,
    frameHeight,
    position.x - targetWidth / 2,
    position.y - targetHeight / 2,
    targetWidth,
    targetHeight
  );
  ctx.restore();
}
