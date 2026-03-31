import type { LgrAssets } from "~/components/lgr-assets";
import {
  colors,
  GRASS_FILL_DEPTH,
  uiColors,
  uiStrokeWidths,
} from "~/editor/constants";
import { drawKuski, drawKuskiBounds } from "~/editor/draw-kuski";
import {
  drawGravityArrow,
  drawObject,
  drawObjectBounds,
} from "~/editor/draw-object";
import { drawPicture } from "~/editor/draw-picture";
import { getMaskedTextureCanvas } from "~/editor/render/canvas-picture-cache";
import { PICTURE_SCALE } from "~/editor/render/picture-metrics";
import { getObjectSprite } from "~/editor/render/object-assets";
import type { EditorWorldScene } from "./editor-scene";
import {
  buildGroundPath,
  buildPolygonPath,
  buildViewportPathFromOffset,
  fillGrassEdges,
} from "./world-geometry";

export function renderEditorWorldScene({
  ctx,
  scene,
  lgrAssets,
}: {
  ctx: CanvasRenderingContext2D;
  scene: EditorWorldScene;
  lgrAssets: LgrAssets;
}) {
  const skyPath = buildPolygonPath(
    scene.polygons.map(({ polygon }) => polygon),
  );
  const viewportPath = buildViewportPathFromOffset(scene.viewport);
  const groundPath = scene.visibility.showPolygons
    ? buildGroundPath(viewportPath, skyPath)
    : viewportPath;

  drawGroundFill(ctx, lgrAssets, scene.ground, groundPath, scene.visibility);
  drawPolygons(ctx, scene, lgrAssets, skyPath, groundPath);

  for (const item of scene.drawItems) {
    if (item.type === "picture" && item.draft) {
      renderDraftPicturePreview({
        ctx,
        scene,
        lgrAssets,
        item,
        skyPath,
        groundPath,
      });
      continue;
    }

    ctx.save();

    if (item.clip === 2) {
      ctx.clip(skyPath, "evenodd");
    } else if (item.clip === 1) {
      ctx.clip(groundPath, "evenodd");
    }

    drawItem(ctx, scene, lgrAssets, item);
    ctx.restore();
  }
}

function renderDraftPicturePreview({
  ctx,
  scene,
  lgrAssets,
  item,
  skyPath,
  groundPath,
}: {
  ctx: CanvasRenderingContext2D;
  scene: EditorWorldScene;
  lgrAssets: LgrAssets;
  item: Extract<EditorWorldScene["drawItems"][number], { type: "picture" }>;
  skyPath: Path2D;
  groundPath: Path2D;
}) {
  const baseOpacity = item.opacity ?? 1;
  const unclippedOpacity = item.clip === 0 ? baseOpacity : baseOpacity * 0.35;

  ctx.save();
  drawItem(ctx, scene, lgrAssets, item, {
    opacity: unclippedOpacity,
    showBounds: true,
  });
  ctx.restore();

  if (item.clip === 0) {
    return;
  }

  ctx.save();
  if (item.clip === 2) {
    ctx.clip(skyPath, "evenodd");
  } else if (item.clip === 1) {
    ctx.clip(groundPath, "evenodd");
  }
  drawItem(ctx, scene, lgrAssets, item, {
    opacity: baseOpacity,
    showBounds: false,
  });
  ctx.restore();
}

function getTexturePattern(
  ctx: CanvasRenderingContext2D,
  lgrAssets: LgrAssets,
  textureName: string,
) {
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
  lgrAssets: LgrAssets,
  groundName: string,
  groundPath: Path2D,
  visibility: EditorWorldScene["visibility"],
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
  scene: EditorWorldScene,
  lgrAssets: LgrAssets,
  skyPath: Path2D,
  groundPath: Path2D,
) {
  const { showPolygons, showPolygonBounds, useGroundSkyTextures } =
    scene.visibility;
  if (!showPolygons && !showPolygonBounds) return;

  const skyFill = useGroundSkyTextures
    ? getTexturePattern(ctx, lgrAssets, scene.sky)
    : null;
  const skyColor = getFlatTextureColor(scene.sky, colors.sky);

  if (showPolygons) {
    ctx.save();
    ctx.fillStyle = skyFill ?? skyColor;
    ctx.fill(skyPath, "evenodd");
    ctx.restore();
  }

  for (const { polygon, grassEdgeIndices } of scene.polygons) {
    if (polygon.vertices.length < 3) continue;

    if (polygon.grass) {
      if (showPolygons) {
        fillGrassEdges({
          ctx,
          vertices: polygon.vertices,
          groundPath,
          zoom: scene.viewport.zoom,
          depth: GRASS_FILL_DEPTH,
          fillStyle: colors.grass,
        });
      }
      if (!showPolygonBounds) continue;
      ctx.strokeStyle = colors.grass;
      ctx.lineWidth = 1 / scene.viewport.zoom;
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";
      ctx.beginPath();
      for (const index of grassEdgeIndices) {
        const from = polygon.vertices[index]!;
        const to = polygon.vertices[(index + 1) % polygon.vertices.length]!;
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
      }
      ctx.stroke();
      continue;
    }

    if (!showPolygonBounds) continue;
    ctx.strokeStyle = colors.edges;
    ctx.lineWidth = 1 / scene.viewport.zoom;
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";
    ctx.beginPath();
    ctx.moveTo(polygon.vertices[0]!.x, polygon.vertices[0]!.y);
    for (let i = 1; i < polygon.vertices.length; i += 1) {
      ctx.lineTo(polygon.vertices[i]!.x, polygon.vertices[i]!.y);
    }
    ctx.lineTo(polygon.vertices[0]!.x, polygon.vertices[0]!.y);
    ctx.stroke();
  }
}

function drawItem(
  ctx: CanvasRenderingContext2D,
  scene: EditorWorldScene,
  lgrAssets: LgrAssets,
  item: EditorWorldScene["drawItems"][number],
  pictureOptions?: {
    opacity?: number;
    showBounds?: boolean;
  },
) {
  const objectBoundsLineWidth =
    item.type === "picture"
      ? 0
      : item.selected
        ? uiStrokeWidths.boundsSelectedScreen / scene.viewport.zoom
        : uiStrokeWidths.boundsIdleScreen / scene.viewport.zoom;
  const forceVisible = item.type !== "start" && item.draft === true;

  if (item.type === "picture") {
    const pictureOpacity = pictureOptions?.opacity ?? item.opacity;
    const showBounds = pictureOptions?.showBounds ?? item.showBounds;

    if (item.texture && item.mask) {
      if (!scene.visibility.showTextures && !forceVisible) return;
      const textureSprite = lgrAssets.getSprite(item.texture);
      const maskSprite = lgrAssets.getSprite(item.mask);
      if (!maskSprite || !textureSprite) return;
      const maskedCanvas = getMaskedTextureCanvas({
        cacheKey: item,
        textureSprite,
        maskSprite,
        position: item.position,
      });
      if (!maskedCanvas) return;

      const prevImageSmoothing = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = pictureOpacity ?? 1;
      ctx.drawImage(
        maskedCanvas,
        0,
        0,
        maskedCanvas.width,
        maskedCanvas.height,
        item.position.x,
        item.position.y,
        maskSprite.width * PICTURE_SCALE,
        maskSprite.height * PICTURE_SCALE,
      );
      if (showBounds) {
        ctx.strokeStyle = uiColors.pictureBounds;
        ctx.lineWidth = uiStrokeWidths.boundsIdleScreen / scene.viewport.zoom;
        ctx.strokeRect(
          item.position.x,
          item.position.y,
          maskSprite.width * PICTURE_SCALE,
          maskSprite.height * PICTURE_SCALE,
        );
      }
      ctx.imageSmoothingEnabled = prevImageSmoothing;
      return;
    }

    if (!scene.visibility.showPictures && !forceVisible) return;
    const sprite = item.name ? lgrAssets.getSprite(item.name) : null;
    if (!sprite) return;

    drawPicture({
      ctx,
      sprite,
      position: item.position,
      opacity: pictureOpacity,
      showBounds,
      boundsLineWidth: uiStrokeWidths.boundsIdleScreen / scene.viewport.zoom,
    });
    return;
  }

  if (item.type === "apple") {
    const shouldShowBounds = scene.visibility.showObjectBounds || item.selected;
    if (!scene.visibility.showObjects && !shouldShowBounds && !forceVisible) {
      return;
    }
    const sprite = getObjectSprite(lgrAssets, {
      kind: "apple",
      animation: item.animation,
    });
    if (scene.visibility.showObjects || forceVisible) {
      if (!sprite) return;
      drawObject({
        ctx,
        sprite,
        position: item.position,
        animate: scene.animateSprites && scene.visibility.showObjectAnimations,
        opacity: item.opacity,
      });
      drawGravityArrow({ ctx, position: item.position, gravity: item.gravity });
    }
    if (shouldShowBounds) {
      drawObjectBounds({
        ctx,
        position: item.position,
        lineWidth: objectBoundsLineWidth,
      });
    }
    return;
  }

  if (item.type === "killer") {
    const shouldShowBounds = scene.visibility.showObjectBounds || item.selected;
    if (!scene.visibility.showObjects && !shouldShowBounds && !forceVisible) {
      return;
    }
    const sprite = getObjectSprite(lgrAssets, { kind: "killer" });
    if (scene.visibility.showObjects || forceVisible) {
      if (!sprite) return;
      drawObject({
        ctx,
        sprite,
        position: item.position,
        animate: scene.animateSprites && scene.visibility.showObjectAnimations,
        opacity: item.opacity,
      });
    }
    if (shouldShowBounds) {
      drawObjectBounds({
        ctx,
        position: item.position,
        lineWidth: objectBoundsLineWidth,
      });
    }
    return;
  }

  if (item.type === "flower") {
    const shouldShowBounds = scene.visibility.showObjectBounds || item.selected;
    if (!scene.visibility.showObjects && !shouldShowBounds && !forceVisible) {
      return;
    }
    const sprite = getObjectSprite(lgrAssets, { kind: "flower" });
    if (scene.visibility.showObjects || forceVisible) {
      if (!sprite) return;
      drawObject({
        ctx,
        sprite,
        position: item.position,
        animate: scene.animateSprites && scene.visibility.showObjectAnimations,
        opacity: item.opacity,
      });
    }
    if (shouldShowBounds) {
      drawObjectBounds({
        ctx,
        position: item.position,
        lineWidth: objectBoundsLineWidth,
      });
    }
    return;
  }

  const shouldShowBounds = scene.visibility.showObjectBounds || item.selected;
  if (!scene.visibility.showObjects && !shouldShowBounds) return;
  if (scene.visibility.showObjects) {
    drawKuski({
      ctx,
      lgrSprites: lgrAssets.getKuskiSprites(),
      start: item.position,
    });
  }
  if (shouldShowBounds) {
    drawKuskiBounds({
      ctx,
      start: item.position,
      lineWidth: objectBoundsLineWidth,
    });
  }
}
