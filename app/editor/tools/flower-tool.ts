import { Tool } from "./tool-interface";
import type { EventContext } from "../helpers/event-handler";
import type { EditorStore } from "../editor-store";
import { defaultTools } from "./default-tools";
import type { LgrAssets } from "~/components/lgr-assets";
import { drawObject } from "../draw-object";
import { DRAFT_PREVIEW_OPACITY } from "../constants";

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

  onRender(ctx: CanvasRenderingContext2D, lgrAssets: LgrAssets) {
    const drafts = this.getDrafts();
    const flowerSprite = lgrAssets.getFlowerSprite();
    if (flowerSprite) {
      drafts.flowers?.forEach((flower) => {
        drawObject({
          ctx,
          sprite: flowerSprite,
          position: flower,
          opacity: DRAFT_PREVIEW_OPACITY,
        });
      });
    }
  }

  getDrafts() {
    const { state } = this.getState();
    if (!state.mouseOnCanvas) return {};
    return { flowers: [state.mousePosition] };
  }
}
