import type { EventContext } from "../utils/event-handler";
import type { Polygon, Position } from "elmajs";
import type { EditorStore } from "../editor-store";
import type { Apple, Picture } from "../editor.types";
import type { DefaultToolMeta } from "./default-tools";
import type { LgrAssets } from "~/components/lgr-assets";

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
  onRender?(ctx: CanvasRenderingContext2D, lgrAssets: LgrAssets): void;
  onRenderOverlay?(ctx: CanvasRenderingContext2D, lgrAssets: LgrAssets): void;

  // Draft elements for previewing while using the tool
  getDrafts?(): {
    polygons?: Polygon[];
    apples?: Apple[];
    killers?: Position[];
    flowers?: Position[];
    pictures?: Picture[];
  };

  // Lifecycle
  onActivate?(): void;
  onDeactivate?(): void;
  clear?(): void;
}
