import type { Tool } from "../tool-interface";
import type { EventContext } from "../utils/event-handler";
import { useStore } from "../useStore";

export class AppleTool implements Tool {
  id = "apple";
  name = "Apple";
  shortcut = "A";

  onActivate(): void {
    // Object tools don't need to clear anything on activate
  }

  onPointerDown(event: PointerEvent, context: EventContext): boolean {
    useStore.getState().addObject('apples', context.worldPos);
    return true;
  }
}

export class KillerTool implements Tool {
  id = "killer";
  name = "Killer";
  shortcut = "K";

  onActivate(): void {
    // Object tools don't need to clear anything on activate
  }

  onPointerDown(event: PointerEvent, context: EventContext): boolean {
    useStore.getState().addObject('killers', context.worldPos);
    return true;
  }
}

export class FlowerTool implements Tool {
  id = "flower";
  name = "Flower";
  shortcut = "F";

  onActivate(): void {
    // Object tools don't need to clear anything on activate
  }

  onPointerDown(event: PointerEvent, context: EventContext): boolean {
    useStore.getState().addObject('flowers', context.worldPos);
    return true;
  }
} 