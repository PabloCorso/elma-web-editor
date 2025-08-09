import type { EventContext } from "../utils/event-handler";
import type { StoreApi } from "zustand/vanilla";
import type { EditorState } from "../editor-store";

export abstract class Tool {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly shortcut?: string;

  constructor(protected store: StoreApi<EditorState>) {}

  // Helper method for getting state snapshot when needed
  protected getState() {
    return this.store.getState();
  }

  // Optional: easy subscribe helper for subclasses
  protected subscribe<T>(
    selector: (s: EditorState) => T,
    listener: (curr: T, prev: T) => void
  ) {
    let prev = selector(this.store.getState());
    return this.store.subscribe((state) => {
      const curr = selector(state);
      if (curr !== prev) {
        listener(curr, prev);
        prev = curr;
      }
    });
  }

  // Event handling - return true if event was consumed
  onPointerDown?(event: PointerEvent, context: EventContext): boolean;
  onPointerMove?(event: PointerEvent, context: EventContext): boolean;
  onPointerUp?(event: PointerEvent, context: EventContext): boolean;
  onKeyDown?(event: KeyboardEvent, context: EventContext): boolean;
  onRightClick?(event: MouseEvent, context: EventContext): boolean;

  // Rendering
  onRender?(ctx: CanvasRenderingContext2D): void;
  onRenderOverlay?(ctx: CanvasRenderingContext2D): void;

  // Lifecycle
  onActivate?(): void;
  onDeactivate?(): void;
}
