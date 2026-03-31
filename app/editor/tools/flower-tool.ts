import { Tool } from "./tool-interface";
import type { EventContext } from "../helpers/event-handler";
import type { EditorStore } from "../editor-store";
import { defaultTools } from "./default-tools";

export class FlowerTool extends Tool {
  readonly meta = defaultTools.flower;

  constructor(store: EditorStore) {
    super(store);
  }

  onPointerDown(_event: PointerEvent, context: EventContext): boolean {
    const { state } = this.getState();
    state.actions.addFlower(context.worldPos);
    return true;
  }

  getDrafts() {
    const { state } = this.getState();
    if (!state.mouseOnCanvas) return {};
    return { flowers: [state.mousePosition] };
  }
}
