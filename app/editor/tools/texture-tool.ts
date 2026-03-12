import type { LgrAssets } from "~/components/lgr-assets";
import { standardSprites } from "~/components/standard-sprites";
import type { EditorStore } from "../editor-store";
import type { Picture } from "../elma-types";
import { drawMaskedTexturePicture } from "../draw-picture";
import type { EventContext } from "../helpers/event-handler";
import { DRAFT_PREVIEW_OPACITY, uiStrokeWidths } from "../constants";
import { defaultTools } from "./default-tools";
import { Tool } from "./tool-interface";

export type TextureToolState = Pick<
  Picture,
  "texture" | "mask" | "distance" | "clip"
>;

export const defaultTextureState: TextureToolState = {
  ...standardSprites.textures[0],
  mask: standardSprites.textureMasks[0],
};

export class TextureTool extends Tool<TextureToolState> {
  readonly meta = defaultTools.texture;

  constructor(store: EditorStore) {
    super(store);
  }

  onActivate() {
    const { toolState, setToolState } = this.getState();
    if (!toolState) {
      setToolState(defaultTextureState);
    }
  }

  onPointerDown(_event: PointerEvent, context: EventContext): boolean {
    const { state, toolState } = this.getState();
    if (!toolState?.texture) return false;

    const position = context.worldPos;
    const defaults =
      standardSprites.textures.find(
        (texture) => texture.texture === toolState.texture,
      ) || defaultTextureState;
    const mask =
      toolState.mask || defaults.mask || standardSprites.textureMasks[0];

    state.actions.addPicture({
      ...defaults,
      name: "",
      texture: toolState.texture,
      mask,
      position,
    });

    return true;
  }

  onRender(ctx: CanvasRenderingContext2D, lgrAssets: LgrAssets) {
    const { state, toolState } = this.getState();
    if (!toolState?.texture || !state.mouseOnCanvas) return {};

    const textureSprite = lgrAssets.getSprite(toolState.texture);
    const maskName = toolState.mask || standardSprites.textureMasks[0];
    const maskSprite = maskName ? lgrAssets.getSprite(maskName) : null;

    if (textureSprite && maskSprite) {
      drawMaskedTexturePicture({
        ctx,
        textureSprite,
        maskSprite,
        position: state.mousePosition,
        opacity: DRAFT_PREVIEW_OPACITY,
        showBounds: true,
        boundsLineWidth: uiStrokeWidths.boundsIdleScreen / state.zoom,
      });
    }
  }
}
