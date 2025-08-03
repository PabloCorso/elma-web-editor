import type { Position } from "elmajs";
import { getCanvasCoordinates, screenToWorld } from "./coordinate-utils";

export type EventContext = {
  worldPos: Position;
  screenX: number;
  screenY: number;
  isCtrlKey: boolean;
  isShiftKey: boolean;
  isMetaKey: boolean;
};

export function getEventContext(
  event: MouseEvent,
  canvas: HTMLCanvasElement,
  viewPortOffset: Position,
  zoom: number
): EventContext {
  const coords = getCanvasCoordinates(event, canvas);
  const worldPos = screenToWorld(coords.x, coords.y, viewPortOffset, zoom);

  return {
    worldPos,
    screenX: coords.x,
    screenY: coords.y,
    isCtrlKey: event.ctrlKey,
    isShiftKey: event.shiftKey,
    isMetaKey: event.metaKey,
  };
}

export function isUserTyping(): boolean {
  const activeElement = document.activeElement;
  if (!activeElement) return false;

  return (
    activeElement.tagName === "INPUT" ||
    activeElement.tagName === "TEXTAREA" ||
    activeElement.tagName === "SELECT" ||
    (activeElement as HTMLElement).contentEditable === "true"
  );
}
