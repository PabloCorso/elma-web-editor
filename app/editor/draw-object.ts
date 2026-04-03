import { uiColors } from "./constants";
import { Gravity, type Position } from "./elma-types";
import { getObjectBoundsRadius, getObjectFrame } from "./render/object-assets";

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
  const frame = getObjectFrame(sprite, { animate });

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(
    sprite,
    frame.sourceX,
    frame.sourceY,
    frame.sourceWidth,
    frame.sourceHeight,
    position.x - frame.targetWidth / 2,
    position.y - frame.targetHeight / 2,
    frame.targetWidth,
    frame.targetHeight,
  );
  ctx.restore();
}

export function drawObjectBounds({
  ctx,
  position,
  lineWidth = 0.02,
}: {
  ctx: CanvasRenderingContext2D;
  position: Position;
  lineWidth?: number;
}) {
  ctx.save();
  ctx.strokeStyle = uiColors.objectBounds;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(position.x, position.y, getObjectBoundsRadius(), 0, Math.PI * 2);
  ctx.stroke();
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
  size = (getObjectBoundsRadius() * 2) / 6,
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
  ctx.strokeStyle = uiColors.gravityArrow;
  ctx.lineWidth = 0.08;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.stroke(createArrowPath(size));
  ctx.restore();
}
