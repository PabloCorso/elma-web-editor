// Original code at https://github.com/elmadev/recplayer

import { standardSprites } from "~/components/standard-sprites";

function hypot(a: number, b: number) {
  return Math.sqrt(a * a + b * b);
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
  box?: boolean
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
    ctx.strokeStyle = "purple";
    ctx.lineWidth = 0.02;
    ctx.strokeRect(0, 0, 1, 1);
  }
  ctx.restore();
}

function limb(
  cwInner: boolean,
  fstParams: { length: number; bx: number; by: number; br: number; ih: number },
  sndParams: { length: number; bx: number; by: number; br: number; ih: number }
) {
  return function (
    ctx: CanvasRenderingContext2D,
    fstImg: ImageBitmap,
    x1: number,
    y1: number,
    sndImg: ImageBitmap,
    x2: number,
    y2: number
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
      y1
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
      jointy
    );
  };
}

const legLimb = limb(
  false,
  {
    length: 26.25 / 48,
    bx: 0,
    by: 0.6,
    br: 6 / 48,
    ih: 39.4 / 48 / 3,
  },
  {
    length: 1 - 26.25 / 48,
    bx: 5 / 48 / 3,
    by: 0.45,
    br: 4 / 48,
    ih: 60 / 48 / 3,
  }
);

const armLimb = limb(
  true,
  {
    length: 0.3234,
    bx: 12.2 / 48 / 3,
    by: 0.5,
    br: 13 / 48 / 3,
    ih: -32 / 48 / 3,
  },
  {
    length: 0.3444,
    bx: 3 / 48,
    by: 0.5,
    br: 13.2 / 48 / 3,
    ih: 22.8 / 48 / 3,
  }
);

function wheel(
  ctx: CanvasRenderingContext2D,
  lgrSprites: Record<string, ImageBitmap>,
  wheelX: number,
  wheelY: number,
  wheelR: number
) {
  ctx.save();
  ctx.translate(wheelX, -wheelY);
  ctx.rotate(-wheelR);
  ctx.scale(38.4 / 48, 38.4 / 48);
  ctx.translate(-0.5, -0.5);
  ctx.drawImage(lgrSprites.q1wheel, 0, 0, 1, 1);
  ctx.restore();
}

const defaultBikeCoords = {
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
};

type BikeRenderArgs = {
  ctx: CanvasRenderingContext2D;
  lgrSprites: Record<string, ImageBitmap>;
  start: { x: number; y: number };
  shirt?: any;
  position?: { x: number; y: number };
  scale?: number;
  coords?: typeof defaultBikeCoords;
};

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
  if (!standardSprites.kuski.every(sprite => lgrSprites[sprite])) {
    return; // Skip rendering if assets aren't ready
  }

  ctx.save();
  ctx.translate(
    scale * (-position.x + start.x),
    scale * (-position.y + start.y)
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
  ctx.scale(1 / 48, 1 / 48);

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
    48 * r * Math.cos(a),
    48 * r * Math.sin(a),
    hbarsX,
    hbarsY
  );

  // rear suspension
  wx = turn ? leftX : rightX;
  wy = turn ? -leftY : -rightY;
  a = Math.atan2(wy, (turn ? -1 : 1) * wx) + (turn ? -1 : 1) * bikeR;
  r = hypot(wx, wy);
  //skewimage(ctx, lgrSprites.q1susp2, 5, 0.5, 5, 6.5, 48*r*Math.cos(a), 48*r*Math.sin(a), 10, 20);
  skewimage(
    ctx,
    lgrSprites.q1susp2,
    0,
    0.5,
    5,
    6,
    9,
    20,
    48 * r * Math.cos(a),
    48 * r * Math.sin(a)
  );
  ctx.restore();

  ctx.save(); // bike
  ctx.translate(-43 / 48, -12 / 48);
  ctx.rotate(-Math.PI * 0.197);
  ctx.scale((0.215815 * 380) / 48, (0.215815 * 301) / 48);
  ctx.drawImage(lgrSprites.q1bike, 0, 0, 1, 1);
  ctx.restore();

  ctx.save(); // kuski
  r = hypot(headX, headY);
  a = Math.atan2(-headY, turn ? -headX : headX) + (turn ? -bikeR : bikeR);
  wx = r * Math.cos(a);
  wy = r * Math.sin(a);
  ctx.translate(wx, wy);

  ctx.save(); // head
  ctx.translate(-15.5 / 48, -42 / 48);
  ctx.scale(23 / 48, 23 / 48);
  ctx.drawImage(lgrSprites.q1head, 0, 0, 1, 1);
  ctx.restore();

  const bumx = 19.5 / 48,
    bumy = 0;
  const pedalx = -wx + 10.2 / 48 / 3,
    pedaly = -wy + 65 / 48 / 3;
  legLimb(
    ctx,
    lgrSprites.q1thigh,
    bumx,
    bumy,
    lgrSprites.q1leg,
    pedalx,
    pedaly
  );

  ctx.save(); // torso
  ctx.translate(17 / 48, 9.25 / 48);
  ctx.rotate(Math.PI + 2 / 3);
  ctx.scale(100 / 48 / 3, 58 / 48 / 3);
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

  const shoulderx = 0 / 48,
    shouldery = -17.5 / 48;
  const handlex = -wx - 64.5 / 48 / 3,
    handley = -wy - 59.6 / 48 / 3;
  const handx = handlex,
    handy = handley;

  armLimb(
    ctx,
    lgrSprites.q1up_arm,
    shoulderx,
    shouldery,
    lgrSprites.q1forarm,
    handx,
    handy
  );

  ctx.restore();
  ctx.restore();
  ctx.restore();
}
