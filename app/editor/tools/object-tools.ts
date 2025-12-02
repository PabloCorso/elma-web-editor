import { Tool } from "./tool-interface";
import type { EventContext } from "../utils/event-handler";
import type { EditorStore } from "../editor-store";
import { defaultTools } from "./default-tools";
import { Gravity } from "elmajs";
import type { Apple } from "../editor.types";

export class AppleTool extends Tool {
  readonly meta = defaultTools.apple;

  constructor(store: EditorStore) {
    super(store);
  }

  onPointerDown(_event: PointerEvent, context: EventContext): boolean {
    const state = this.store.getState();
    state.actions.addApple({
      position: context.worldPos,
      animation: 0,
      gravity: 0,
    });
    return true;
  }

  getDrafts() {
    const state = this.store.getState();
    const apple: Apple = {
      position: state.mousePosition,
      animation: 1,
      gravity: Gravity.None,
    };
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
