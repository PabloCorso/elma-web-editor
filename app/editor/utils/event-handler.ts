import type { Position } from "elmajs";
import { CoordinateUtils } from "./coordinate-utils";

export type EventContext = {
  worldPos: Position;
  screenX: number;
  screenY: number;
  isCtrlKey: boolean;
  isShiftKey: boolean;
  isMetaKey: boolean;
};

export type TouchContext = {
  touch1?: Touch;
  touch2?: Touch;
  isMultiTouch: boolean;
};

export class EventHandler {
  static getEventContext(
    event: MouseEvent | Touch,
    canvas: HTMLCanvasElement,
    viewPortOffset: Position,
    zoom: number
  ): EventContext {
    const coords = CoordinateUtils.getCanvasCoordinates(event, canvas);
    const worldPos = CoordinateUtils.screenToWorld(
      coords.x,
      coords.y,
      viewPortOffset,
      zoom
    );

    return {
      worldPos,
      screenX: coords.x,
      screenY: coords.y,
      isCtrlKey: "ctrlKey" in event ? event.ctrlKey : false,
      isShiftKey: "shiftKey" in event ? event.shiftKey : false,
      isMetaKey: "metaKey" in event ? event.metaKey : false,
    };
  }

  static getTouchContext(touches: TouchList): TouchContext {
    return {
      touch1: touches[0] || undefined,
      touch2: touches[1] || undefined,
      isMultiTouch: touches.length === 2,
    };
  }

  static getTouchDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.hypot(dx, dy);
  }

  static getTouchMidpoint(
    touch1: Touch,
    touch2: Touch
  ): { clientX: number; clientY: number } {
    return {
      clientX: (touch1.clientX + touch2.clientX) / 2,
      clientY: (touch1.clientY + touch2.clientY) / 2,
    };
  }

  static isUserTyping(): boolean {
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    return (
      activeElement.tagName === "INPUT" ||
      activeElement.tagName === "TEXTAREA" ||
      activeElement.tagName === "SELECT" ||
      (activeElement as HTMLElement).contentEditable === "true"
    );
  }
}
