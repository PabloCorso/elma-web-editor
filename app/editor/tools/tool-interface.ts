import type { EventContext } from "../utils/event-handler";
import type { StoreApi } from "zustand/vanilla";
import type { EditorState } from "../editor-store";
import type { Polygon } from "elmajs";

export type ToolState<T = unknown> = Record<string, T>;

export abstract class Tool {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly shortcut?: string;

  constructor(protected store: StoreApi<EditorState>) {}

  // Event handling - return true if event was consumed
  onPointerDown?(event: PointerEvent, context: EventContext): boolean;
  onPointerMove?(event: PointerEvent, context: EventContext): boolean;
  onPointerUp?(event: PointerEvent, context: EventContext): boolean;
  onKeyDown?(event: KeyboardEvent, context: EventContext): boolean;
  onRightClick?(event: MouseEvent, context: EventContext): boolean;

  // Rendering
  onRender?(ctx: CanvasRenderingContext2D): void;
  onRenderOverlay?(ctx: CanvasRenderingContext2D): void;

  // Temporary polygons for rendering calculations
  getTemporaryPolygons?(): Polygon[];

  // Lifecycle
  onActivate?(): void;
  onDeactivate?(): void;
  clear?(): void;
}
