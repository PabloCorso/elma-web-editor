// Original code at https://github.com/elmadev/recplayer

import { standardSprites } from "~/components/standard-sprites";
import {
  debugColors,
  ELMA_PIXEL_SCALE,
  OBJECT_DIAMETER,
  uiColors,
} from "./constants";

function hypot(a: number, b: number) {
  return Math.sqrt(a * a + b * b);
}

function worldUnitsFromElmaPixels(pixels: number) {
  return pixels * ELMA_PIXEL_SCALE;
}

function worldUnitsFromThirdElmaPixels(pixels: number) {
  return worldUnitsFromElmaPixels(pixels) / 3;
}

function elmaPixelsFromWorldUnits(worldUnits: number) {
  return worldUnits / ELMA_PIXEL_SCALE;
}

// (x1, y1)–(x2, y2): line to draw image along
// bx: length of image used before (x1, y1)
// br: length of image used after (x2, y2)
// by: proportional (of ih) y offset within the image the line is conceptually along
// ih: image height
function skewimage(
  ctx: CanvasRenderingContext2D,
  img: ImageBitmap,
  bx: number,
  by: number,
  br: number,
  ih: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  box?: boolean,
) {
  const o = x2 - x1,
    a = y2 - y1;
  ctx.save();
  ctx.translate(x1, y1);
  ctx.rotate(Math.atan2(a, o));
  ctx.translate(-bx, -by * ih);
  ctx.scale(bx + br + hypot(o, a), ih);
  ctx.drawImage(img, 0, 0, 1, 1);
  if (box) {
    ctx.strokeStyle = debugColors.kuskiBounds;
    ctx.lineWidth = 0.02;
    ctx.strokeRect(0, 0, 1, 1);
  }
  ctx.restore();
}

function limb(
  cwInner: boolean,
  fstParams: { length: number; bx: number; by: number; br: number; ih: number },
  sndParams: { length: number; bx: number; by: number; br: number; ih: number },
) {
  return function (
    ctx: CanvasRenderingContext2D,
    fstImg: ImageBitmap,
    x1: number,
    y1: number,
    sndImg: ImageBitmap,
    x2: number,
    y2: number,
  ) {
    const dist = hypot(x2 - x1, y2 - y1);
    let fstLen = fstParams.length;
    const sndLen = sndParams.length;

    const prod =
      (dist + fstLen + sndLen) *
      (dist - fstLen + sndLen) *
      (dist + fstLen - sndLen) *
      (-dist + fstLen + sndLen);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    let jointangle = 0;
    if (prod >= 0 && dist < fstLen + sndLen) {
      // law of sines
      const circumr = (dist * fstLen * sndLen) / Math.sqrt(prod);
      jointangle = Math.asin(sndLen / (2 * circumr));
    } else fstLen = (fstLen / (fstLen + sndLen)) * dist;

    if (cwInner) jointangle *= -1;

    const jointx = x1 + fstLen * Math.cos(angle + jointangle);
    const jointy = y1 + fstLen * Math.sin(angle + jointangle);

    skewimage(
      ctx,
      fstImg,
      fstParams.bx,
      fstParams.by,
      fstParams.br,
      fstParams.ih,
      jointx,
      jointy,
      x1,
      y1,
    );
    skewimage(
      ctx,
      sndImg,
      sndParams.bx,
      sndParams.by,
      sndParams.br,
      sndParams.ih,
      x2,
      y2,
      jointx,
      jointy,
    );
  };
}

const legLimb = limb(
  false,
  {
    length: worldUnitsFromElmaPixels(26.25),
    bx: 0,
    by: 0.6,
    br: worldUnitsFromElmaPixels(6),
    ih: worldUnitsFromThirdElmaPixels(39.4),
  },
  {
    length: 1 - worldUnitsFromElmaPixels(26.25),
    bx: worldUnitsFromThirdElmaPixels(5),
    by: 0.45,
    br: worldUnitsFromElmaPixels(4),
    ih: worldUnitsFromThirdElmaPixels(60),
  },
);

const armLimb = limb(
  true,
  {
    length: 0.3234,
    bx: worldUnitsFromThirdElmaPixels(12.2),
    by: 0.5,
    br: worldUnitsFromThirdElmaPixels(13),
    ih: worldUnitsFromThirdElmaPixels(-32),
  },
  {
    length: 0.3444,
    bx: worldUnitsFromElmaPixels(3),
    by: 0.5,
    br: worldUnitsFromThirdElmaPixels(13.2),
    ih: worldUnitsFromThirdElmaPixels(22.8),
  },
);

function wheel(
  ctx: CanvasRenderingContext2D,
  lgrSprites: Record<string, ImageBitmap>,
  wheelX: number,
  wheelY: number,
  wheelR: number,
) {
  ctx.save();
  ctx.translate(wheelX, -wheelY);
  ctx.rotate(-wheelR);
  ctx.scale(worldUnitsFromElmaPixels(38.4), worldUnitsFromElmaPixels(38.4));
  ctx.translate(-0.5, -0.5);
  ctx.drawImage(lgrSprites.q1wheel, 0, 0, 1, 1);
  ctx.restore();
}

export const defaultBikeCoords = {
  bikeR: 10000,
  turn: 0, // 0 = left, 1 = right
  leftX: -849.4,
  leftY: -600.6,
  leftR: 0.42,
  rightX: 849,
  rightY: -600,
  rightR: 0.42,
  headX: 0,
  headY: 439,
  voltDirection: null as "right" | "left" | null,
  voltProgress: 0,
};

export type BikeCoords = typeof defaultBikeCoords;

type BikeRenderArgs = {
  ctx: CanvasRenderingContext2D;
  lgrSprites: Record<string, ImageBitmap>;
  start: { x: number; y: number };
  shirt?: any;
  position?: { x: number; y: number };
  scale?: number;
  coords?: BikeCoords;
};

export type KuskiSelectionCircle = {
  x: number;
  y: number;
  radius: number;
};

export type KuskiSelectionTriangle = [
  { x: number; y: number },
  { x: number; y: number },
  { x: number; y: number },
];

function rotatePoint(point: { x: number; y: number }, radians: number) {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
}

function transformBikeLocalPoint({
  point,
  bikeR,
  turn,
}: {
  point: { x: number; y: number };
  bikeR: number;
  turn: number;
}) {
  const mirroredX = turn ? -point.x : point.x;
  return rotatePoint({ x: mirroredX, y: point.y }, -bikeR);
}

export function drawKuskiBounds({
  ctx,
  start,
  lineWidth = 0.02,
  coords = defaultBikeCoords,
}: {
  ctx: CanvasRenderingContext2D;
  start: { x: number; y: number };
  lineWidth?: number;
  coords?: BikeCoords;
}) {
  const selectionCircles = getKuskiSelectionCircles({ start, coords });
  ctx.save();
  ctx.strokeStyle = uiColors.objectBounds;
  ctx.lineWidth = lineWidth;
  selectionCircles.forEach((circle) => {
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.restore();
}

export function getKuskiSelectionCircles({
  start,
  coords = defaultBikeCoords,
}: {
  start: { x: number; y: number };
  coords?: BikeCoords;
}): KuskiSelectionCircle[] {
  const bikeR = (coords.bikeR * Math.PI * 2) / 10000;
  const turn = coords.turn;
  const leftX = coords.leftX / 1000;
  const leftY = coords.leftY / 1000;
  const rightX = coords.rightX / 1000;
  const rightY = coords.rightY / 1000;
  const headX = coords.headX / 1000;
  const headY = coords.headY / 1000;

  const backX = !turn ? rightX : leftX;
  const backY = !turn ? rightY : leftY;
  const frontX = turn ? rightX : leftX;
  const frontY = turn ? rightY : leftY;

  const backCenter = {
    x: start.x - leftX + backX,
    y: start.y + leftY - backY,
  };
  const frontCenter = {
    x: start.x - leftX + frontX,
    y: start.y + leftY - frontY,
  };

  const headRadius = hypot(headX, headY);
  const headAngle =
    Math.atan2(-headY, turn ? -headX : headX) + (turn ? -bikeR : bikeR);
  const wx = headRadius * Math.cos(headAngle);
  const wy = headRadius * Math.sin(headAngle);

  // Head sprite is drawn at (-15.5, -42) Elma pixels with a 23px square size,
  // so its center is offset by (-4, -30.5) Elma pixels from the translated head origin.
  const headCenterInRotatedSpace = {
    x: wx - worldUnitsFromElmaPixels(4),
    y: wy - worldUnitsFromElmaPixels(30.5),
  };
  const headOffset = transformBikeLocalPoint({
    point: headCenterInRotatedSpace,
    bikeR,
    turn,
  });
  const headCenter = {
    x: start.x - leftX + headOffset.x,
    y: start.y + leftY + headOffset.y,
  };

  const wheelRadius = OBJECT_DIAMETER / 2;
  const headBoundsRadius = worldUnitsFromElmaPixels(11.5);
  return [
    { x: backCenter.x, y: backCenter.y, radius: wheelRadius },
    { x: frontCenter.x, y: frontCenter.y, radius: wheelRadius },
    { x: headCenter.x, y: headCenter.y, radius: headBoundsRadius },
  ];
}

export function getKuskiSelectionTriangle({
  start,
  coords = defaultBikeCoords,
}: {
  start: { x: number; y: number };
  coords?: BikeCoords;
}): KuskiSelectionTriangle {
  const circles = getKuskiSelectionCircles({
    start,
    coords,
  });
  const centroid = circles.reduce(
    (acc, circle) => ({
      x: acc.x + circle.x / circles.length,
      y: acc.y + circle.y / circles.length,
    }),
    { x: 0, y: 0 },
  );

  const expandedPoints = circles.map((circle) => {
    const dx = circle.x - centroid.x;
    const dy = circle.y - centroid.y;
    const distance = Math.hypot(dx, dy) || 1;
    return {
      x: circle.x + (dx / distance) * circle.radius,
      y: circle.y + (dy / distance) * circle.radius,
    };
  });

  return [expandedPoints[0], expandedPoints[1], expandedPoints[2]];
}

function triangleSign(
  point: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  return (point.x - b.x) * (a.y - b.y) - (a.x - b.x) * (point.y - b.y);
}

function isPointInTriangle(
  point: { x: number; y: number },
  triangle: KuskiSelectionTriangle,
) {
  const [a, b, c] = triangle;
  const d1 = triangleSign(point, a, b);
  const d2 = triangleSign(point, b, c);
  const d3 = triangleSign(point, c, a);
  const hasNegative = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPositive = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNegative && hasPositive);
}

export function isPointInKuskiSelectionBounds({
  point,
  start,
  coords = defaultBikeCoords,
}: {
  point: { x: number; y: number };
  start: { x: number; y: number };
  coords?: BikeCoords;
}) {
  const selectionCircles = getKuskiSelectionCircles({ start, coords });
  if (
    selectionCircles.some((circle) => {
      const dx = point.x - circle.x;
      const dy = point.y - circle.y;
      return Math.hypot(dx, dy) <= circle.radius;
    })
  ) {
    return true;
  }

  return isPointInTriangle(point, getKuskiSelectionTriangle({ start, coords }));
}

export function drawKuski({
  ctx,
  lgrSprites,
  shirt,
  start,
  position = { x: 0, y: 0 },
  scale = 1,
  coords = defaultBikeCoords,
}: BikeRenderArgs) {
  // Check if all required sprites are loaded
  if (!standardSprites.kuski.every((sprite) => lgrSprites[sprite])) {
    return; // Skip rendering if assets aren't ready
  }

  ctx.save();
  ctx.translate(
    scale * (-position.x + start.x),
    scale * (-position.y + start.y),
  );
  ctx.scale(scale, scale);
  ctx.beginPath();

  const bikeR = (coords.bikeR * Math.PI * 2) / 10000;
  const turn = coords.turn;
  const leftX = coords.leftX / 1000;
  const leftY = coords.leftY / 1000;
  ctx.translate(-leftX, leftY);

  const leftR = (coords.leftR * Math.PI * 2) / 250;
  const rightX = coords.rightX / 1000;
  const rightY = coords.rightY / 1000;
  const rightR = (coords.rightR * Math.PI * 2) / 250;
  const headX = coords.headX / 1000;
  const headY = coords.headY / 1000;

  const backX = !turn ? rightX : leftX;
  const backY = !turn ? rightY : leftY;
  const backR = !turn ? rightR : leftR;
  const frontX = turn ? rightX : leftX;
  const frontY = turn ? rightY : leftY;
  const frontR = turn ? rightR : leftR;

  wheel(ctx, lgrSprites, backX, backY, backR);
  wheel(ctx, lgrSprites, frontX, frontY, frontR);

  ctx.save();
  ctx.rotate(-bikeR);
  if (turn) ctx.scale(-1, 1);

  let wx, wy, a, r;
  const hbarsX = -21.5,
    hbarsY = -17;
  ctx.save();
  ctx.scale(ELMA_PIXEL_SCALE, ELMA_PIXEL_SCALE);

  // front suspension
  wx = turn ? rightX : leftX;
  wy = turn ? -rightY : -leftY;
  a = Math.atan2(wy, (turn ? -1 : 1) * wx) + (turn ? -1 : 1) * bikeR;
  r = hypot(wx, wy);
  skewimage(
    ctx,
    lgrSprites.q1susp1,
    2,
    0.5,
    5,
    6,
    elmaPixelsFromWorldUnits(r * Math.cos(a)),
    elmaPixelsFromWorldUnits(r * Math.sin(a)),
    hbarsX,
    hbarsY,
  );

  // rear suspension
  wx = turn ? leftX : rightX;
  wy = turn ? -leftY : -rightY;
  a = Math.atan2(wy, (turn ? -1 : 1) * wx) + (turn ? -1 : 1) * bikeR;
  r = hypot(wx, wy);
  // Original rear suspension call kept for reference with Elma-pixel coordinates.
  skewimage(
    ctx,
    lgrSprites.q1susp2,
    0,
    0.5,
    5,
    6,
    9,
    20,
    elmaPixelsFromWorldUnits(r * Math.cos(a)),
    elmaPixelsFromWorldUnits(r * Math.sin(a)),
  );
  ctx.restore();

  ctx.save(); // bike
  ctx.translate(worldUnitsFromElmaPixels(-43), worldUnitsFromElmaPixels(-12));
  ctx.rotate(-Math.PI * 0.197);
  ctx.scale(
    worldUnitsFromElmaPixels(0.215815 * 380),
    worldUnitsFromElmaPixels(0.215815 * 301),
  );
  ctx.drawImage(lgrSprites.q1bike, 0, 0, 1, 1);
  ctx.restore();

  ctx.save(); // kuski
  r = hypot(headX, headY);
  a = Math.atan2(-headY, turn ? -headX : headX) + (turn ? -bikeR : bikeR);
  wx = r * Math.cos(a);
  wy = r * Math.sin(a);
  ctx.translate(wx, wy);

  ctx.save(); // head
  ctx.translate(worldUnitsFromElmaPixels(-15.5), worldUnitsFromElmaPixels(-42));
  ctx.scale(worldUnitsFromElmaPixels(23), worldUnitsFromElmaPixels(23));
  ctx.drawImage(lgrSprites.q1head, 0, 0, 1, 1);
  ctx.restore();

  const bumx = worldUnitsFromElmaPixels(19.5),
    bumy = 0;
  const pedalx = -wx + worldUnitsFromThirdElmaPixels(10.2),
    pedaly = -wy + worldUnitsFromThirdElmaPixels(65);
  legLimb(
    ctx,
    lgrSprites.q1thigh,
    bumx,
    bumy,
    lgrSprites.q1leg,
    pedalx,
    pedaly,
  );

  ctx.save(); // torso
  ctx.translate(worldUnitsFromElmaPixels(17), worldUnitsFromElmaPixels(9.25));
  ctx.rotate(Math.PI + 2 / 3);
  ctx.scale(
    worldUnitsFromThirdElmaPixels(100),
    worldUnitsFromThirdElmaPixels(58),
  );
  if (shirt && shirt.getImage()) {
    // assumes shirts are rotated as on EOL site
    ctx.translate(0.5, 0.5);
    ctx.rotate(Math.PI / 2);
    ctx.translate(-0.5, -0.5);
    shirt.draw(ctx);
  } else {
    ctx.drawImage(lgrSprites.q1body, 0, 0, 1, 1);
  }

  ctx.restore();

  const shoulderx = 0,
    shouldery = worldUnitsFromElmaPixels(-17.5);
  const handlex = -wx - worldUnitsFromThirdElmaPixels(64.5),
    handley = -wy - worldUnitsFromThirdElmaPixels(59.6);
  let handx = handlex,
    handy = handley;

  const voltProgress = coords.voltProgress ?? 0;
  const voltDirection = coords.voltDirection;
  if (voltProgress > 0 && voltDirection) {
    const sameDirection = (voltDirection === "right" ? 1 : 0) === turn;
    const animx = shoulderx;
    const animy = shouldery;
    let dangle: number;
    let ascale: number;
    let easedProgress = voltProgress;

    if (sameDirection) {
      if (easedProgress >= 0.25) {
        easedProgress = 0.25 - (0.25 * (easedProgress - 0.25)) / 0.75;
      }
      dangle = 10.8 * easedProgress;
      ascale = 1 - 1.2 * easedProgress;
    } else {
      if (easedProgress >= 0.2) {
        easedProgress = 0.2 - (0.2 * (easedProgress - 0.2)) / 0.8;
      }
      dangle = -8 * easedProgress;
      ascale = 1 + 0.75 * easedProgress;
    }

    const at = Math.atan2(handley - animy, handlex - animx) + dangle;
    const dist = ascale * hypot(handley - animy, handlex - animx);
    handx = animx + dist * Math.cos(at);
    handy = animy + dist * Math.sin(at);
  }

  armLimb(
    ctx,
    lgrSprites.q1up_arm,
    shoulderx,
    shouldery,
    lgrSprites.q1forarm,
    handx,
    handy,
  );

  ctx.restore();
  ctx.restore();
  ctx.restore();
}
