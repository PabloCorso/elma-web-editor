import type { EventContext } from "../helpers/event-handler";
import type { EditorStore } from "../editor-store";
import type { Apple, Picture, Polygon, Position } from "../elma-types";
import type { DefaultToolMeta } from "./default-tools";
import type { LgrAssets } from "~/components/lgr-assets";

export type ToolState<T = unknown> = Record<string, T>;

export abstract class Tool<T extends ToolState = ToolState> {
  abstract readonly meta: DefaultToolMeta;

  constructor(protected store: EditorStore) {}

  protected getState() {
    const state = this.store.getState();
    const toolState = state.actions.getToolState<T>(this.meta.id);
    const setToolState = (toolStatePatch: Partial<T>) => {
      state.actions.setToolState<T>(this.meta.id, toolStatePatch);
    };
    return { state, toolState, setToolState };
  }

  // Lifecycle
  onActivate?(variant?: string): void;
  onDeactivate?(): void;
  clear?(): void;

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
}
