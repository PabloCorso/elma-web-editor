import { Tool } from "./tool-interface";
import type { EventContext } from "../utils/event-handler";
import type { EditorStore } from "../editor-store";
import { defaultTools } from "./default-tools";

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
}
