import { Tool } from "./tool-interface";
import type { EventContext } from "../helpers/event-handler";
import type { EditorStore } from "../editor-store";
import { defaultTools } from "./default-tools";
import type { LgrAssets } from "~/components/lgr-assets";
import { drawObject } from "../draw-object";
import { DRAFT_PREVIEW_OPACITY } from "../constants";

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

  onRender(ctx: CanvasRenderingContext2D, lgrAssets: LgrAssets) {
    const drafts = this.getDrafts();
    const killerSprite = lgrAssets.getKillerSprite();
    if (killerSprite) {
      drafts.killers?.forEach((killer) => {
        drawObject({
          ctx,
          sprite: killerSprite,
          position: killer,
          opacity: DRAFT_PREVIEW_OPACITY,
        });
      });
    }
  }

  getDrafts() {
    const { state } = this.getState();
    if (!state.mouseOnCanvas) return {};
    return { killers: [state.mousePosition] };
  }
}
