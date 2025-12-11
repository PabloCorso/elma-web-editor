import type { Position } from "../elma-types";
import { screenToWorld } from "./coordinate-utils";

export type EventContext = {
  worldPos: Position;
  screenX: number;
  screenY: number;
};

export function getCanvasCoordinates(
  event: MouseEvent,
  canvas: HTMLCanvasElement
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

export function getEventContext(
  event: MouseEvent,
  canvas: HTMLCanvasElement,
  viewPortOffset: Position,
  zoom: number
): EventContext {
  const coords = getCanvasCoordinates(event, canvas);
  const worldPos = screenToWorld(coords, viewPortOffset, zoom);

  return { worldPos, screenX: coords.x, screenY: coords.y };
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
