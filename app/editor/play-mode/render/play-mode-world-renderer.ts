import { standardSprites } from "~/components/standard-sprites";
import { LgrAssets } from "~/components/lgr-assets";
import { colors, GRASS_FILL_DEPTH } from "~/editor/constants";
import { drawKuski } from "~/editor/draw-kuski";
import { drawGravityArrow, drawObject } from "~/editor/draw-object";
import { drawPicture } from "~/editor/draw-picture";
import { Clip, Gravity } from "~/editor/elma-types";
import { getMaskedTextureCanvas } from "~/editor/render/canvas-picture-cache";
import { getObjectSprite } from "~/editor/render/object-assets";
import { PICTURE_SCALE } from "~/editor/render/picture-metrics";
import type {
  PlayModePolygonSceneItem,
  PlayModeRenderVisibility,
  PlayModeScene,
  PlayModeSceneDrawItem,
} from "~/editor/play-mode/render/play-mode-scene";
import {
  buildGroundPath,
  buildPolygonPath,
  buildViewportPathFromCenter,
  fillGrassEdges,
} from "~/editor/render/world-geometry";
import type { ObjectProperty, Polygon } from "~/editor/play-mode/engine/level";

export function renderPlayModeScene(
  ctx: CanvasRenderingContext2D,
  scene: PlayModeScene,
  lgrAssets: LgrAssets | null,
) {
  const skyPath = buildPolygonPath(
    scene.polygons.map(({ polygon }) => polygon),
  );
  const viewportPath = buildViewportPathFromCenter(scene.viewport);
  const groundPath = buildGroundPath(viewportPath, skyPath);

  drawGroundFill(
    ctx,
    lgrAssets,
    scene.level.foregroundName,
    groundPath,
    scene.visibility,
  );
  drawPolygons(
    ctx,
    scene.polygons,
    lgrAssets,
    scene.level.backgroundName,
    skyPath,
    groundPath,
    scene.viewport.zoom,
    scene.visibility,
  );

  for (const item of scene.drawItems) {
    ctx.save();

    if (item.type === "picture") {
      if (item.clipping === Clip.Sky) {
        ctx.clip(skyPath, "evenodd");
      } else if (item.clipping === Clip.Ground) {
        ctx.clip(groundPath, "evenodd");
      }
    } else if (item.type === "bike") {
      const kuskiSprites = lgrAssets?.getKuskiSprites();
      const hasKuskiSprites = kuskiSprites
        ? standardSprites.kuski.every((spriteName) => kuskiSprites[spriteName])
        : false;
      if (kuskiSprites && hasKuskiSprites) {
        drawKuski({
          ctx,
          lgrSprites: kuskiSprites,
          start: item.start,
          coords: item.coords,
        });
      } else {
        drawBikeFallback(ctx, item);
      }
      ctx.restore();
      continue;
    } else if (item.clip === Clip.Sky) {
      ctx.clip(skyPath, "evenodd");
    } else if (item.clip === Clip.Ground) {
      ctx.clip(groundPath, "evenodd");
    }

    drawItem(ctx, lgrAssets, item, scene.visibility);
    ctx.restore();
  }
}

function drawBikeFallback(
  ctx: CanvasRenderingContext2D,
  item: Extract<PlayModeSceneDrawItem, { type: "bike" }>,
) {
  const { leftWheel, rightWheel, bike, head, flipped, rotation } =
    item.fallback;
  const headRadius = 0.238;
  const torsoToHeadX = head.x - bike.x;
  const torsoToHeadY = head.y - bike.y;
  const torsoToHeadLength = Math.hypot(torsoToHeadX, torsoToHeadY) || 1;
  const neckX = head.x - (torsoToHeadX / torsoToHeadLength) * headRadius * 0.9;
  const neckY = head.y - (torsoToHeadY / torsoToHeadLength) * headRadius * 0.9;

  drawWheelFallback(
    ctx,
    leftWheel.x,
    leftWheel.y,
    0.4,
    (item.coords.leftR * Math.PI * 2) / 250,
  );
  drawWheelFallback(
    ctx,
    rightWheel.x,
    rightWheel.y,
    0.4,
    (item.coords.rightR * Math.PI * 2) / 250,
  );

  ctx.beginPath();
  ctx.moveTo(leftWheel.x, leftWheel.y);
  ctx.lineTo(bike.x, bike.y);
  ctx.lineTo(rightWheel.x, rightWheel.y);
  ctx.strokeStyle = "#cccccc";
  ctx.lineWidth = 0.04;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(bike.x, bike.y);
  ctx.lineTo(neckX, neckY);
  ctx.strokeStyle = "#ffaa00";
  ctx.lineWidth = 0.05;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(head.x, head.y, headRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#ffcc88";
  ctx.fill();

  const facingDirection = flipped ? 1 : -1;
  const bikeAxisX = Math.cos(rotation);
  const bikeAxisY = -Math.sin(rotation);
  const bikeUpX = -Math.sin(rotation);
  const bikeUpY = -Math.cos(rotation);
  const eyeX =
    head.x +
    bikeAxisX * headRadius * 0.58 * facingDirection +
    bikeUpX * headRadius * 0.08;
  const eyeY =
    head.y +
    bikeAxisY * headRadius * 0.58 * facingDirection +
    bikeUpY * headRadius * 0.08;

  ctx.beginPath();
  ctx.arc(eyeX, eyeY, headRadius * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = "#2b1d14";
  ctx.fill();
}

function drawWheelFallback(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  rotation: number,
) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "#00cc00";
  ctx.lineWidth = 0.03;
  ctx.stroke();

  for (let spokeIndex = 0; spokeIndex < 4; spokeIndex += 1) {
    const spokeAngle = rotation + (spokeIndex * Math.PI) / 2;
    const spokeEndX = x + Math.cos(spokeAngle) * radius;
    const spokeEndY = y - Math.sin(spokeAngle) * radius;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(spokeEndX, spokeEndY);
    ctx.stroke();
  }
}

function drawItem(
  ctx: CanvasRenderingContext2D,
  lgrAssets: LgrAssets | null,
  item: PlayModeSceneDrawItem,
  visibility: Pick<PlayModeRenderVisibility, "showObjectAnimations">,
) {
  if (item.type === "bike") return;

  if (item.type === "picture") {
    if (!lgrAssets) return;

    if (item.textureName && item.maskName) {
      const textureSprite = lgrAssets.getSprite(item.textureName);
      const maskSprite = lgrAssets.getSprite(item.maskName);
      if (!textureSprite || !maskSprite) return;

      const cachedPicture = getMaskedTextureCanvas({
        cacheKey: item.source,
        textureSprite,
        maskSprite,
        position: item.position,
      });
      if (!cachedPicture) return;

      ctx.save();
      const prevImageSmoothing = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        cachedPicture,
        0,
        0,
        cachedPicture.width,
        cachedPicture.height,
        item.position.x,
        item.position.y,
        maskSprite.width * PICTURE_SCALE,
        maskSprite.height * PICTURE_SCALE,
      );
      ctx.imageSmoothingEnabled = prevImageSmoothing;
      ctx.restore();
      return;
    }

    const sprite = item.pictureName
      ? lgrAssets.getSprite(item.pictureName)
      : null;
    if (!sprite) return;
    drawPicture({
      ctx,
      sprite,
      position: item.position,
    });
    return;
  }

  if (!lgrAssets) return;

  if (item.objectType === "food") {
    const sprite = getObjectSprite(lgrAssets, {
      kind: "food",
      animation: item.animation,
    });
    if (!sprite) return;
    drawObject({
      ctx,
      sprite,
      position: item.position,
      animate: visibility.showObjectAnimations,
    });
    drawGravityArrow({
      ctx,
      position: item.position,
      gravity: gravityFromProperty(item.property),
    });
    return;
  }

  if (item.objectType === "killer") {
    const sprite = getObjectSprite(lgrAssets, { kind: "killer" });
    if (!sprite) return;
    drawObject({
      ctx,
      sprite,
      position: item.position,
      animate: visibility.showObjectAnimations,
    });
    return;
  }

  if (item.objectType === "exit") {
    const sprite = getObjectSprite(lgrAssets, { kind: "exit" });
    if (!sprite) return;
    drawObject({
      ctx,
      sprite,
      position: item.position,
      animate: visibility.showObjectAnimations,
    });
  }
}

function getTexturePattern(
  ctx: CanvasRenderingContext2D,
  lgrAssets: LgrAssets | null,
  textureName: string,
) {
  if (!lgrAssets) return null;

  const textureSprite = lgrAssets.getSprite(textureName);
  if (!textureSprite) return null;

  const pattern = ctx.createPattern(textureSprite, "repeat");
  if (!pattern) return null;

  pattern.setTransform(new DOMMatrix().scale(PICTURE_SCALE, PICTURE_SCALE));
  return pattern;
}

function getFlatTextureColor(textureName: string, fallback: string) {
  const textureColor = colors[textureName as keyof typeof colors];
  return textureColor ?? fallback;
}

function drawGroundFill(
  ctx: CanvasRenderingContext2D,
  lgrAssets: LgrAssets | null,
  groundName: string,
  groundPath: Path2D,
  visibility: Pick<PlayModeRenderVisibility, "useGroundSkyTextures">,
) {
  const groundPattern = visibility.useGroundSkyTextures
    ? getTexturePattern(ctx, lgrAssets, groundName)
    : null;
  const groundColor = getFlatTextureColor(groundName, colors.ground);

  ctx.save();
  ctx.fillStyle = groundPattern ?? groundColor;
  ctx.fill(groundPath, "evenodd");
  ctx.restore();
}

function drawPolygons(
  ctx: CanvasRenderingContext2D,
  polygons: PlayModePolygonSceneItem[],
  lgrAssets: LgrAssets | null,
  backgroundName: string,
  skyPath: Path2D,
  groundPath: Path2D,
  zoom: number,
  visibility: Pick<
    PlayModeRenderVisibility,
    "showPolygons" | "showPolygonBounds" | "useGroundSkyTextures"
  >,
) {
  if (!visibility.showPolygons && !visibility.showPolygonBounds) return;

  const skyFill = visibility.useGroundSkyTextures
    ? getTexturePattern(ctx, lgrAssets, backgroundName)
    : null;
  const skyColor = getFlatTextureColor(backgroundName, colors.sky);

  if (visibility.showPolygons) {
    ctx.save();
    ctx.fillStyle = skyFill ?? skyColor;
    ctx.fill(skyPath, "evenodd");
    ctx.restore();
  }

  for (const { polygon, grassEdgeIndices } of polygons) {
    if (polygon.vertices.length < 3) continue;

    if (polygon.isGrass) {
      if (visibility.showPolygons) {
        drawGrassFill(ctx, polygon, groundPath, zoom);
      }
      if (!visibility.showPolygonBounds) continue;
      ctx.strokeStyle = colors.grass;
      ctx.lineWidth = 1 / zoom;
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";
      ctx.beginPath();
      for (const i of grassEdgeIndices) {
        const from = polygon.vertices[i]!;
        const to = polygon.vertices[(i + 1) % polygon.vertices.length]!;
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
      }
      ctx.stroke();
      continue;
    }

    if (!visibility.showPolygonBounds) continue;
    ctx.strokeStyle = colors.edges;
    ctx.lineWidth = 1 / zoom;
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";
    ctx.beginPath();
    ctx.moveTo(polygon.vertices[0]!.x, polygon.vertices[0]!.y);
    for (let i = 1; i < polygon.vertices.length; i++) {
      ctx.lineTo(polygon.vertices[i]!.x, polygon.vertices[i]!.y);
    }
    ctx.lineTo(polygon.vertices[0]!.x, polygon.vertices[0]!.y);
    ctx.stroke();
  }
}

function drawGrassFill(
  ctx: CanvasRenderingContext2D,
  polygon: Polygon,
  groundPath: Path2D,
  zoom: number,
) {
  fillGrassEdges({
    ctx,
    vertices: polygon.vertices,
    groundPath,
    zoom,
    depth: GRASS_FILL_DEPTH,
    fillStyle: colors.grass,
  });
}

function gravityFromProperty(property: ObjectProperty) {
  switch (property) {
    case "gravity_up":
      return Gravity.Up;
    case "gravity_down":
      return Gravity.Down;
    case "gravity_left":
      return Gravity.Left;
    case "gravity_right":
      return Gravity.Right;
    default:
      return Gravity.None;
  }
}
