import type { EventContext } from "./utils/event-handler";
import type { Store } from "./useStore";

export interface Tool {
  id: string;
  name: string;
  shortcut?: string;

  // Event handling - return true if event was consumed
  onPointerDown?(event: PointerEvent, context: EventContext): boolean;
  onPointerMove?(event: PointerEvent, context: EventContext): boolean;
  onPointerUp?(event: PointerEvent, context: EventContext): boolean;
  onKeyDown?(event: KeyboardEvent, context: EventContext): boolean;
  onRightClick?(event: MouseEvent, context: EventContext): boolean;

  // Rendering
  onRender?(ctx: CanvasRenderingContext2D, state: Store): void;
  onRenderOverlay?(ctx: CanvasRenderingContext2D, state: Store): void;

  // Lifecycle
  onActivate?(): void;
  onDeactivate?(): void;
}

export interface ToolContext {
  store: Store;
  canvas: HTMLCanvasElement;
}
