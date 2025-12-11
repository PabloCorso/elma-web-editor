import { Tool } from "./tool-interface";
import type { EventContext } from "../helpers/event-handler";
import type { EditorStore } from "../editor-store";
import { defaultTools } from "./default-tools";

export type HandToolState = { isDragging: boolean };

export class HandTool extends Tool<HandToolState> {
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
    const { setToolState } = this.getState();
    setToolState({ isDragging: false });
    this.lastX = 0;
    this.lastY = 0;
  }

  onPointerDown(event: PointerEvent): boolean {
    const { setToolState } = this.getState();
    setToolState({ isDragging: true });
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    return true;
  }

  onPointerMove(event: PointerEvent): boolean {
    const { state, toolState } = this.getState();
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
    const { setToolState } = this.getState();
    setToolState({ isDragging: false });
    return true;
  }
}
