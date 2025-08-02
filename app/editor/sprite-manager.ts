import qfood1Url from "../assets/elma/qfood1.png";
import qexitUrl from "../assets/elma/QEXIT.png";
import qkillerUrl from "../assets/elma/QKILLER.png";
import kuskiUrl from "../assets/kuski.png";

export interface SpriteFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpriteAnimation {
  frames: SpriteFrame[];
  frameDuration: number; // milliseconds per frame
}

export class SpriteManager {
  private sprites: Map<string, HTMLImageElement> = new Map();
  private animations: Map<string, SpriteAnimation> = new Map();

  constructor() {
    this.loadSprites();
  }

  private async loadSprites() {
    // Load qfood1.png (apple sprite sheet)
    const qfood1 = new Image();
    qfood1.src = qfood1Url;
    await new Promise((resolve) => {
      qfood1.onload = resolve;
    });
    this.sprites.set("qfood1", qfood1);

    // Load QEXIT.png (flower sprite sheet)
    const qexit = new Image();
    qexit.src = qexitUrl;
    await new Promise((resolve) => {
      qexit.onload = resolve;
    });
    this.sprites.set("qexit", qexit);

    // Load QKILLER.png (killer sprite sheet)
    const qkiller = new Image();
    qkiller.src = qkillerUrl;
    await new Promise((resolve) => {
      qkiller.onload = resolve;
    });
    this.sprites.set("qkiller", qkiller);

    // Load kuski.png (complete bike with rider)
    const kuski = new Image();
    kuski.src = kuskiUrl;
    await new Promise((resolve) => {
      kuski.onload = resolve;
    });
    this.sprites.set("kuski", kuski);

    // Set up apple animation from qfood1
    // Assuming each frame is 40x40 pixels
    const frameWidth = 40;
    const frameHeight = 40;
    const totalFramesApple = Math.floor(qfood1.width / frameWidth);
    const totalFramesFlower = Math.floor(qexit.width / frameWidth);
    const totalFramesKiller = Math.floor(qkiller.width / frameWidth);

    const appleFrames: SpriteFrame[] = [];
    for (let i = 0; i < totalFramesApple; i++) {
      appleFrames.push({
        x: i * frameWidth,
        y: 0,
        width: frameWidth,
        height: frameHeight,
      });
    }

    const flowerFrames: SpriteFrame[] = [];
    for (let i = 0; i < totalFramesFlower; i++) {
      flowerFrames.push({
        x: i * frameWidth,
        y: 0,
        width: frameWidth,
        height: frameHeight,
      });
    }

    this.animations.set("qfood1", {
      frames: appleFrames,
      frameDuration: 34, // 34ms per frame based on possible Elma timing (1.15s for full rotation)
    });

    this.animations.set("qexit", {
      frames: flowerFrames,
      frameDuration: 34, // 34ms per frame for flower animation
    });

    const killerFrames: SpriteFrame[] = [];
    for (let i = 0; i < totalFramesKiller; i++) {
      killerFrames.push({
        x: i * frameWidth,
        y: 0,
        width: frameWidth,
        height: frameHeight,
      });
    }

    this.animations.set("qkiller", {
      frames: killerFrames,
      frameDuration: 34, // 34ms per frame for killer animation
    });
  }

  public drawSprite(
    ctx: CanvasRenderingContext2D,
    spriteName: string,
    x: number,
    y: number,
    width: number,
    height: number,
    time: number = Date.now()
  ) {
    const sprite = this.sprites.get(spriteName);
    const animation = this.animations.get(spriteName);

    if (!sprite) {
      console.warn(`Sprite ${spriteName} not found`);
      return;
    }

    if (animation) {
      // Animated sprite
      const frameIndex = Math.floor(
        (time % (animation.frames.length * animation.frameDuration)) /
          animation.frameDuration
      );
      const frame = animation.frames[frameIndex];

      // Add bouncing effect for apples and flowers
      const bounceOffset =
        spriteName === "qfood1" || spriteName === "qexit" ? Math.sin(time * 0.006) * 1.5 : 0;

      ctx.drawImage(
        sprite,
        frame.x,
        frame.y,
        frame.width,
        frame.height,
        x - width / 2,
        y - height / 2 + bounceOffset,
        width,
        height
      );
    } else {
      // Static sprite - draw the first frame
      ctx.drawImage(
        sprite,
        0,
        0,
        40,
        40, // Assuming 40x40 is the standard frame size
        x - width / 2,
        y - height / 2,
        width,
        height
      );
    }
  }

  public isLoaded(): boolean {
    return this.sprites.size > 0;
  }

    public drawStaticSprite(
    ctx: CanvasRenderingContext2D,
    spriteName: string,
    x: number,
    y: number,
    width: number,
    height: number,
    frameIndex: number = 0
  ) {
    const sprite = this.sprites.get(spriteName);
    const animation = this.animations.get(spriteName);
    
    if (!sprite) {
      console.warn(`Sprite ${spriteName} not found`);
      return;
    }

    if (animation && animation.frames[frameIndex]) {
      const frame = animation.frames[frameIndex];
      ctx.drawImage(
        sprite,
        frame.x,
        frame.y,
        frame.width,
        frame.height,
        x - width / 2,
        y - height / 2,
        width,
        height
      );
    } else {
      // For kuski (bike), position left wheel centered on the position
      if (spriteName === "kuski") {
        // Based on Figma: wheel is 19.59x19.59 at bottom-left of 60.34x55.64 image
        // So wheel center is at (19.59/2, 55.64 - 19.59/2) = (9.795, 45.845) from bottom-left
        // This means we need to offset the image by this amount to center the wheel
        const wheelCenterX = (19.59 / 2) / 60.34; // 0.1624 of image width
        const wheelCenterY = (55.64 - 19.59 / 2) / 55.64; // 0.824 of image height
        
        const offsetX = width * wheelCenterX;
        const offsetY = height * wheelCenterY;
        
        ctx.drawImage(
          sprite,
          0,
          0,
          sprite.width,
          sprite.height,
          x - offsetX,
          y - offsetY,
          width,
          height
        );
      } else {
        // Fallback to centered positioning for other sprites
        ctx.drawImage(
          sprite,
          0,
          0,
          40,
          40,
          x - width / 2,
          y - height / 2,
          width,
          height
        );
      }
    }
  }
}
