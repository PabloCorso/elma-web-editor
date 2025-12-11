import type { LgrAssets } from "~/components/lgr-assets";
import type { EditorStore } from "../editor-store";
import type { EventContext } from "../helpers/event-handler";
import { defaultTools } from "./default-tools";
import { Tool } from "./tool-interface";
import { type Picture } from "../elma-types";
import { drawPicture } from "../draw-picture";
import { standardSprites } from "~/components/standard-sprites";

export type PictureToolState = Pick<Picture, "name" | "distance" | "clip">;

export const defaultPictureState: PictureToolState =
  standardSprites.pictures[0];

export class PictureTool extends Tool<PictureToolState> {
  readonly meta = defaultTools.picture;

  constructor(store: EditorStore) {
    super(store);
  }

  onActivate() {
    const { toolState, setToolState } = this.getState();
    if (!toolState) {
      setToolState(defaultPictureState);
    }
  }

  onPointerDown(_event: PointerEvent, context: EventContext): boolean {
    const { state, toolState } = this.getState();
    if (!toolState?.name) return false;

    const position = context.worldPos;
    const defaults =
      standardSprites.pictures.find((pic) => pic.name === toolState.name) ||
      defaultPictureState;
    state.actions.addPicture({ ...defaults, name: toolState.name, position });
    return true;
  }

  onRender(ctx: CanvasRenderingContext2D, lgrAssets: LgrAssets) {
    const { state, toolState } = this.getState();
    if (!toolState?.name || !state.mouseOnCanvas) return {};

    const sprite = lgrAssets.getSprite(toolState.name);
    if (sprite) {
      drawPicture({ ctx, sprite, position: state.mousePosition, opacity: 0.5 });
    }
  }
}
