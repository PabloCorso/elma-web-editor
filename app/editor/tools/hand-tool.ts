import { Tool } from "./tool-interface";
import type { EventContext } from "../utils/event-handler";
import type { EditorStore } from "../editor-store";
import { defaultTools } from "./default-tools";

export type HandToolState = { isDragging: boolean };

export class HandTool extends Tool {
  readonly meta = defaultTools.hand;
  private lastX = 0;
  private lastY = 0;

  constructor(store: EditorStore) {
    super(store);
  }

  onDeactivate(): void {
    this.clear();
  }

  clear(): void {
    const state = this.store.getState();
    state.actions.setToolState<HandToolState>("hand", { isDragging: false });
    this.lastX = 0;
    this.lastY = 0;
  }

  onPointerDown(event: PointerEvent): boolean {
    const state = this.store.getState();
    state.actions.setToolState<HandToolState>("hand", { isDragging: true });
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    return true;
  }

  onPointerMove(event: PointerEvent): boolean {
    const state = this.store.getState();
    const toolState = state.actions.getToolState<HandToolState>("hand");
    if (!toolState?.isDragging) {
      return false;
    }

    const deltaX = event.clientX - this.lastX;
    const deltaY = event.clientY - this.lastY;

    state.actions.setCamera(
      state.viewPortOffset.x + deltaX,
      state.viewPortOffset.y + deltaY
    );

    this.lastX = event.clientX;
    this.lastY = event.clientY;

    return true;
  }

  onPointerUp(_event: PointerEvent, _context: EventContext): boolean {
    const state = this.store.getState();
    state.actions.setToolState<HandToolState>("hand", { isDragging: false });
    return true;
  }
}
