import type { LgrAssets } from "~/components/lgr-assets";
import type { EditorStore } from "../editor-store";
import type { EventContext } from "../utils/event-handler";
import { defaultTools } from "./default-tools";
import { Tool } from "./tool-interface";
import type { Picture } from "../editor.types";
import { drawPicture } from "../draw-picture";

export type PictureToolState = Pick<Picture, "name">;

export const defaultPictureState: PictureToolState = {
  name: "barrel",
};

export class PictureTool extends Tool {
  readonly meta = defaultTools.picture;

  constructor(store: EditorStore) {
    super(store);
  }

  private getPictureState() {
    const state = this.store.getState();
    return (state.toolState.picture as PictureToolState) || defaultPictureState;
  }

  onPointerDown(_event: PointerEvent, context: EventContext): boolean {
    const state = this.store.getState();
    const toolState = state.toolState.picture as PictureToolState | undefined;
    if (!toolState?.name) return false;

    const position = context.worldPos;
    state.actions.addPicture({ name: toolState.name, position });
    return true;
  }

  onRender(ctx: CanvasRenderingContext2D, lgrAssets: LgrAssets) {
    const state = this.store.getState();
    const toolState = state.toolState.picture as PictureToolState | undefined;
    if (!toolState?.name || !state.mouseOnCanvas) return {};

    const sprite = lgrAssets.getSprite(toolState.name);
    if (sprite) {
      drawPicture({ ctx, sprite, position: state.mousePosition, opacity: 0.5 });
    }
  }

  onActivate() {
    const state = this.store.getState();
    const toolState = state.toolState.picture as PictureToolState | undefined;
    if (!toolState) {
      state.actions.setToolState(this.meta.id, this.getPictureState());
    }
  }
}
