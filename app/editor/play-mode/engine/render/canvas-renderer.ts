import { LgrAssets } from "~/components/lgr-assets";
import type { LevelVisibilitySettings } from "~/editor/level-visibility";
import {
  DEFAULT_OBJECT_RENDER_DISTANCE,
  renderPlayModeWorld,
} from "~/editor/render/play-mode-world-renderer";
import type { GameState } from "../game/game-loop";
import type { MotorState } from "../physics/motor-state";

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lgrAssets: LgrAssets | null;
  private pixelsPerMeter = 48;

  constructor(canvas: HTMLCanvasElement, lgrAssets: LgrAssets | null = null) {
    this.canvas = canvas;
    this.lgrAssets = lgrAssets;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context");
    this.ctx = ctx;
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  render(
    state: GameState,
    options?: {
      visibility?: Pick<
        LevelVisibilitySettings,
        | "useGroundSkyTextures"
        | "showObjectAnimations"
        | "showObjects"
        | "showPictures"
        | "showTextures"
        | "showPolygons"
        | "showPolygonBounds"
      >;
    },
  ): void {
    const { ctx, canvas } = this;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const cam = state.camera;
    const ppm = this.pixelsPerMeter * cam.zoom;

    // Clear
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(ppm, ppm);
    ctx.translate(-cam.x, cam.y);

    renderPlayModeWorld({
      ctx,
      level: state.level,
      lgrAssets: this.lgrAssets,
      viewport: {
        width,
        height,
        centerX: cam.x,
        centerY: -cam.y,
        zoom: ppm,
      },
      visibility: options?.visibility ?? {
        useGroundSkyTextures: false,
        showObjectAnimations: true,
        showObjects: true,
        showPictures: true,
        showTextures: true,
        showPolygons: true,
        showPolygonBounds: false,
      },
      extraItems: [
        {
          type: "bike",
          distance: DEFAULT_OBJECT_RENDER_DISTANCE,
          render: () => this.drawBike(state.motor),
        },
      ],
    });

    ctx.restore();
  }

  private drawBike(motor: MotorState): void {
    const ctx = this.ctx;
    const leftWheelY = -motor.leftWheel.r.y;
    const rightWheelY = -motor.rightWheel.r.y;
    const bikeY = -motor.bike.r.y;
    const headY = -motor.headR.y;
    const headRadius = 0.238;
    const torsoToHeadX = motor.headR.x - motor.bike.r.x;
    const torsoToHeadY = headY - bikeY;
    const torsoToHeadLength = Math.hypot(torsoToHeadX, torsoToHeadY) || 1;
    const neckX =
      motor.headR.x - (torsoToHeadX / torsoToHeadLength) * headRadius * 0.9;
    const neckY = headY - (torsoToHeadY / torsoToHeadLength) * headRadius * 0.9;

    // Draw wheels
    this.drawWheel(
      motor.leftWheel.r.x,
      leftWheelY,
      motor.leftWheel.radius,
      motor.leftWheel.rotation,
    );
    this.drawWheel(
      motor.rightWheel.r.x,
      rightWheelY,
      motor.rightWheel.radius,
      motor.rightWheel.rotation,
    );

    // Draw bike frame
    ctx.beginPath();
    ctx.moveTo(motor.leftWheel.r.x, leftWheelY);
    ctx.lineTo(motor.bike.r.x, bikeY);
    ctx.lineTo(motor.rightWheel.r.x, rightWheelY);
    ctx.strokeStyle = "#cccccc";
    ctx.lineWidth = 0.04;
    ctx.stroke();

    // Draw body/rider
    ctx.beginPath();
    ctx.moveTo(motor.bike.r.x, bikeY);
    ctx.lineTo(neckX, neckY);
    ctx.strokeStyle = "#ffaa00";
    ctx.lineWidth = 0.05;
    ctx.stroke();

    // Draw head
    ctx.beginPath();
    ctx.arc(motor.headR.x, headY, headRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#ffcc88";
    ctx.fill();

    const facingDirection = motor.flippedBike ? 1 : -1;
    const bikeAxisX = Math.cos(motor.bike.rotation);
    const bikeAxisY = -Math.sin(motor.bike.rotation);
    const bikeUpX = -Math.sin(motor.bike.rotation);
    const bikeUpY = -Math.cos(motor.bike.rotation);
    const eyeX =
      motor.headR.x +
      bikeAxisX * headRadius * 0.58 * facingDirection +
      bikeUpX * headRadius * 0.08;
    const eyeY =
      headY +
      bikeAxisY * headRadius * 0.58 * facingDirection +
      bikeUpY * headRadius * 0.08;
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, headRadius * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = "#2b1d14";
    ctx.fill();
  }

  private drawWheel(
    x: number,
    y: number,
    radius: number,
    rotation: number,
  ): void {
    const ctx = this.ctx;

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
}
