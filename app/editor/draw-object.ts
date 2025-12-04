import { Gravity, OBJECT_DIAMETER, type Position } from "elmajs";

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

const arrowRotations = {
  [Gravity.Up]: 0,
  [Gravity.Down]: Math.PI,
  [Gravity.Left]: -Math.PI / 2,
  [Gravity.Right]: Math.PI / 2,
};

// SVG caret path: scaled and centered from viewBox="0 0 256 256"
// Original polyline: "48 160 128 80 208 160" from <CaretUpIcon />
// Centered at 128,120 with scale to fit the given size
function createArrowPath(size: number) {
  const scale = size / ((208 - 48) / 2);
  // Translate to center (128, 120) and scale
  const path = new Path2D();
  path.moveTo(-80 * scale, 40 * scale); // 48,160 centered
  path.lineTo(0, -40 * scale); // 128,80 centered
  path.lineTo(80 * scale, 40 * scale); // 208,160 centered
  return path;
}

export function drawGravityArrow({
  ctx,
  position,
  gravity,
  opacity = 1,
  size = OBJECT_DIAMETER / 6,
}: {
  ctx: CanvasRenderingContext2D;
  position: Position;
  gravity: Gravity;
  opacity?: number;
  size?: number;
}) {
  if (gravity === Gravity.None) return;

  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.rotate(arrowRotations[gravity] ?? 0);

  ctx.globalAlpha = opacity;
  ctx.strokeStyle = "#fde047";
  ctx.lineWidth = 0.08;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.stroke(createArrowPath(size));
  ctx.restore();
}
