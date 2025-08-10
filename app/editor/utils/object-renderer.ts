import type { Position } from "elmajs";
import { SpriteManager } from "../sprite-manager";
import { colors } from "../constants";

export type ObjectRenderConfig = {
  spriteName: string;
  fallbackColor: string;
  spriteWidth: number;
  spriteHeight: number;
  circleRadius: number;
};

export class ObjectRenderer {
  private spriteManager: SpriteManager;

  constructor(spriteManager: SpriteManager) {
    this.spriteManager = spriteManager;
  }

  renderObject(
    ctx: CanvasRenderingContext2D,
    object: Position,
    config: ObjectRenderConfig,
    showSprites: boolean,
    animateSprites: boolean
  ) {
    if (this.spriteManager.isLoaded() && showSprites) {
      this.renderSprite(ctx, object, config, animateSprites);
    } else {
      this.renderFallback(ctx, object, config);
    }
  }

  renderObjects(
    ctx: CanvasRenderingContext2D,
    objects: Position[],
    config: ObjectRenderConfig,
    showSprites: boolean,
    animateSprites: boolean
  ) {
    objects.forEach((object) => {
      this.renderObject(ctx, object, config, showSprites, animateSprites);
    });
  }

  private renderSprite(
    ctx: CanvasRenderingContext2D,
    object: Position,
    config: ObjectRenderConfig,
    animateSprites: boolean
  ) {
    if (animateSprites) {
      this.spriteManager.drawSprite(
        ctx,
        config.spriteName,
        object.x,
        object.y,
        config.spriteWidth,
        config.spriteHeight,
        Date.now()
      );
    } else {
      this.spriteManager.drawStaticSprite(
        ctx,
        config.spriteName,
        object.x,
        object.y,
        config.spriteWidth,
        config.spriteHeight,
        0
      );
    }
  }

  private renderFallback(
    ctx: CanvasRenderingContext2D,
    object: Position,
    config: ObjectRenderConfig
  ) {
    ctx.fillStyle = config.fallbackColor;
    ctx.beginPath();
    ctx.arc(object.x, object.y, config.circleRadius, 0, 2 * Math.PI);
    ctx.fill();
  }

  static readonly CONFIGS: Record<string, ObjectRenderConfig> = {
    start: {
      spriteName: "kuski",
      fallbackColor: colors.start,
      spriteWidth: 0.8 * 3.2, // Maintain aspect ratio: 60.34/55.64 ≈ 1.08
      spriteHeight: 0.8 * 3.0, // Base size
      circleRadius: 0.4,
    },
    flower: {
      spriteName: "qexit",
      fallbackColor: colors.flower,
      spriteWidth: 0.8,
      spriteHeight: 0.8,
      circleRadius: 0.4,
    },
    apple: {
      spriteName: "qfood1",
      fallbackColor: colors.apple,
      spriteWidth: 0.8,
      spriteHeight: 0.8,
      circleRadius: 0.4,
    },
    killer: {
      spriteName: "qkiller",
      fallbackColor: colors.killer,
      spriteWidth: 0.8,
      spriteHeight: 0.8,
      circleRadius: 0.4,
    },
  };
}
