import type { Position } from "elmajs";

export class CoordinateUtils {
  static screenToWorld(
    screenX: number,
    screenY: number,
    viewPortOffset: Position,
    zoom: number
  ): Position {
    return {
      x: (screenX - viewPortOffset.x) / zoom,
      y: (screenY - viewPortOffset.y) / zoom,
    };
  }

  static distance(pos1: Position, pos2: Position): number {
    return Math.sqrt(
      Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2)
    );
  }

  static isWithinThreshold(
    pos1: Position,
    pos2: Position,
    threshold: number,
    zoom: number
  ): boolean {
    return this.distance(pos1, pos2) <= threshold / zoom;
  }

  static getCanvasCoordinates(
    event: MouseEvent | Touch,
    canvas: HTMLCanvasElement
  ): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  static getScaledCanvasCoordinates(
    touch: Touch,
    canvas: HTMLCanvasElement
  ): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY,
    };
  }
} 