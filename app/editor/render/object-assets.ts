import type { LgrAssets } from "~/components/lgr-assets";
import {
  OBJECT_DIAMETER,
  OBJECT_FPS,
  OBJECT_FRAME_PX,
} from "~/editor/constants";

export type ObjectSpriteKind =
  | "apple"
  | "flower"
  | "killer"
  | "food"
  | "exit";

export function getObjectSprite(
  lgrAssets: LgrAssets,
  {
    kind,
    animation = 1,
  }: {
    kind: ObjectSpriteKind;
    animation?: number;
  },
) {
  if (kind === "apple" || kind === "food") {
    return lgrAssets.getAppleSprite(animation > 1 ? 2 : 1);
  }

  if (kind === "flower" || kind === "exit") {
    return lgrAssets.getFlowerSprite();
  }

  return lgrAssets.getKillerSprite();
}

export function getObjectFrame(
  sprite: ImageBitmap,
  {
    animate = false,
    now = performance.now(),
  }: {
    animate?: boolean;
    now?: number;
  } = {},
) {
  const sourceWidth = OBJECT_FRAME_PX;
  const sourceHeight = Math.min(OBJECT_FRAME_PX, sprite.height);
  const frames = Math.max(1, Math.floor(sprite.width / sourceWidth));
  const frameIndex = animate
    ? Math.floor((now / 1000) * OBJECT_FPS) % frames
    : 0;

  const targetHeight = OBJECT_DIAMETER;
  const targetWidth = (sourceWidth / sourceHeight) * targetHeight;

  return {
    sourceX: frameIndex * sourceWidth,
    sourceY: 0,
    sourceWidth,
    sourceHeight,
    targetWidth,
    targetHeight,
  };
}

export function getObjectBoundsRadius() {
  return OBJECT_DIAMETER / 2;
}
