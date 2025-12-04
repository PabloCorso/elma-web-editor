import { Tool } from "./tool-interface";
import type { EventContext } from "../utils/event-handler";
import type { EditorStore } from "../editor-store";
import { defaultTools } from "./default-tools";
import { Gravity } from "elmajs";
import type { Apple, AppleAnimation } from "../editor.types";

export type AppleToolState = { animation: AppleAnimation; gravity: Gravity };

export const defaultAppleState: AppleToolState = {
  animation: 1,
  gravity: Gravity.None,
};

export class AppleTool extends Tool {
  readonly meta = defaultTools.apple;

  constructor(store: EditorStore) {
    super(store);
  }

  private getAppleState() {
    const state = this.store.getState();
    return (state.toolState.apple as AppleToolState) || defaultAppleState;
  }

  onActivate() {
    const state = this.store.getState();
    const toolState = state.toolState.apple as AppleToolState | undefined;
    if (!toolState) {
      state.actions.setToolState(this.meta.id, this.getAppleState());
    }
  }

  onPointerDown(_event: PointerEvent, context: EventContext): boolean {
    const state = this.store.getState();
    const position = context.worldPos;
    state.actions.addApple({ position, ...this.getAppleState() });
    return true;
  }

  onKeyDown(event: KeyboardEvent) {
    const state = this.store.getState();
    switch (event.key.toUpperCase()) {
      case "W":
        state.actions.setToolState(this.meta.id, { gravity: Gravity.Up });
        return true;
      case "A":
        state.actions.setToolState(this.meta.id, { gravity: Gravity.Down });
        return true;
      case "S":
        state.actions.setToolState(this.meta.id, { gravity: Gravity.Left });
        return true;
      case "D":
        state.actions.setToolState(this.meta.id, { gravity: Gravity.Right });
        return true;
      case "E":
        state.actions.setToolState(this.meta.id, { gravity: Gravity.None });
        return true;
      case "1":
        state.actions.setToolState(this.meta.id, { animation: 1 });
        return true;
      case "2":
        state.actions.setToolState(this.meta.id, { animation: 2 });
        return true;
      default:
        return false;
    }
  }

  getDrafts() {
    const state = this.store.getState();
    const position = state.mousePosition;
    const apple: Apple = { position, ...this.getAppleState() };
    return { apples: [apple] };
  }
}

export class KillerTool extends Tool {
  readonly meta = defaultTools.killer;

  constructor(store: EditorStore) {
    super(store);
  }

  onPointerDown(_event: PointerEvent, context: EventContext): boolean {
    const state = this.store.getState();
    state.actions.addKiller(context.worldPos);
    return true;
  }

  getDrafts() {
    const state = this.store.getState();
    return { killers: [state.mousePosition] };
  }
}

export class FlowerTool extends Tool {
  readonly meta = defaultTools.flower;

  constructor(store: EditorStore) {
    super(store);
  }

  onPointerDown(_event: PointerEvent, context: EventContext): boolean {
    const state = this.store.getState();
    state.actions.addFlower(context.worldPos);
    return true;
  }

  getDrafts() {
    const state = this.store.getState();
    return { flowers: [state.mousePosition] };
  }
}
