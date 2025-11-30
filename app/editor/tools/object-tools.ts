import { Tool } from "./tool-interface";
import type { EventContext } from "../utils/event-handler";
import type { EditorStore } from "../editor-store";
import type { Polygon, Position } from "elmajs";
import type { Apple } from "../editor.types";

export class AppleTool extends Tool {
  readonly id = "apple";
  readonly name = "Apple";
  readonly shortcut = "A";

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

  // getDrafts() {
  //   const state = this.store.getState();
  //   const draftApple: Apple = {
  //     position: state.mousePosition,
  //     animation: 0,
  //     gravity: 0,
  //   };
  //   return { apples: [draftApple] };
  // }
}

export class KillerTool extends Tool {
  readonly id = "killer";
  readonly name = "Killer";
  readonly shortcut = "K";

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
  readonly id = "flower";
  readonly name = "Flower";
  readonly shortcut = "F";

  constructor(store: EditorStore) {
    super(store);
  }

  onPointerDown(_event: PointerEvent, context: EventContext): boolean {
    const state = this.store.getState();
    state.actions.addFlower(context.worldPos);
    return true;
  }
}
