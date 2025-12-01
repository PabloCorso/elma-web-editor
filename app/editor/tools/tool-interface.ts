import type { EventContext } from "../utils/event-handler";
import type { Polygon, Position } from "elmajs";
import type { EditorStore } from "../editor-store";
import type { Apple } from "../editor.types";
import type { DefaultToolMeta } from "./default-tools";

export type ToolState<T = unknown> = Record<string, T>;

export abstract class Tool {
  abstract readonly meta: DefaultToolMeta;

  constructor(protected store: EditorStore) {}

  // Event handling - return true if event was consumed
  onPointerDown?(event: PointerEvent, context: EventContext): boolean;
  onPointerMove?(event: PointerEvent, context: EventContext): boolean;
  onPointerUp?(event: PointerEvent, context: EventContext): boolean;
  onKeyDown?(event: KeyboardEvent, context: EventContext): boolean;
  onRightClick?(event: MouseEvent, context: EventContext): boolean;

  // Rendering
  onRender?(ctx: CanvasRenderingContext2D): void;
  onRenderOverlay?(ctx: CanvasRenderingContext2D): void;

  // Temporary elements for previewing while using the tool
  getDrafts?(): {
    polygons?: Polygon[];
    apples?: Apple[];
    killers?: Position[];
    flowers?: Position[];
  };

  // Lifecycle
  onActivate?(): void;
  onDeactivate?(): void;
  clear?(): void;
}
