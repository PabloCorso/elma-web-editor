import { Tool } from "./tool-interface";
import type { EventContext } from "../utils/event-handler";
import type { StoreApi } from "zustand/vanilla";
import type { EditorState } from "../editor-state";

export class AppleTool extends Tool {
  readonly id = "apple";
  readonly name = "Apple";
  readonly shortcut = "A";

  constructor(store: StoreApi<EditorState>) {
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
  readonly id = "killer";
  readonly name = "Killer";
  readonly shortcut = "K";

  constructor(store: StoreApi<EditorState>) {
    super(store);
  }

  onPointerDown(_event: PointerEvent, context: EventContext): boolean {
    const state = this.store.getState();
    state.actions.addKiller(context.worldPos);
    return true;
  }
}

export class FlowerTool extends Tool {
  readonly id = "flower";
  readonly name = "Flower";
  readonly shortcut = "F";

  constructor(store: StoreApi<EditorState>) {
    super(store);
  }

  onPointerDown(_event: PointerEvent, context: EventContext): boolean {
    const state = this.store.getState();
    state.actions.addFlower(context.worldPos);
    return true;
  }
}
