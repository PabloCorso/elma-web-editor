import { Tool } from "./tool-interface";
import type { EventContext } from "../helpers/event-handler";
import type { EditorStore } from "../editor-store";
import { defaultTools } from "./default-tools";

export class KillerTool extends Tool {
  readonly meta = defaultTools.killer;

  constructor(store: EditorStore) {
    super(store);
  }

  onPointerDown(_event: PointerEvent, context: EventContext): boolean {
    const { state } = this.getState();
    state.actions.addKiller(context.worldPos);
    return true;
  }

  getDrafts() {
    const { state } = this.getState();
    if (!state.mouseOnCanvas) return {};
    return { killers: [state.mousePosition] };
  }
}
