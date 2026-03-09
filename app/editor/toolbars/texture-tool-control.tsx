import { PictureIcon } from "~/components/sprite-icon";
import {
  useEditorActions,
  useEditorToolState,
} from "~/editor/use-editor-store";
import {
  ToolControlButton,
  ToolMenu,
  type ToolControlButtonProps,
} from "./tool";
import { defaultTools } from "~/editor/tools/default-tools";
import { useTextureMaskSprites } from "~/components/use-lgr-assets";
import { standardSprites } from "~/components/standard-sprites";
import { Mask } from "~/editor/elma-types";
import {
  defaultTextureState,
  type TextureToolState,
} from "~/editor/tools/texture-tool";
import { Toolbar } from "~/components/ui/toolbar";

export function TextureToolControl(props: ToolControlButtonProps) {
  const textureTool = useEditorToolState<TextureToolState>(
    defaultTools.texture.id,
  );
  const { setToolState } = useEditorActions();
  const textureSprites = useTextureMaskSprites();
  const selectedTexture = textureTool?.texture ?? defaultTextureState.texture;
  const selectedMask = textureTool?.mask ?? standardSprites.textureMasks[0];
  const selectedTextureSprite = textureSprites.find(
    ({ texture, mask }) =>
      texture.texture === selectedTexture && mask === selectedMask,
  );
  return (
    <>
      <ToolControlButton {...defaultTools.texture} {...props}>
        <PictureIcon
          className={getTexturePreviewClassName(selectedMask)}
          src={selectedTextureSprite?.maskedSrc ?? selectedTextureSprite?.src}
        />
      </ToolControlButton>
      <ToolMenu id={defaultTools.texture.id} className="pointer-events-none">
        <div className="pointer-events-auto max-h-full overflow-y-auto">
          <Toolbar orientation="vertical" className="p-2">
            <ul className="flex flex-col gap-2">
              {standardSprites.textureMasks.map((mask) => (
                <li key={mask}>
                  <ul className="flex flex-col gap-2">
                    {textureSprites
                      .filter((sprite) => sprite.mask === mask)
                      .map(({ texture, mask: textureMask, ...sprite }) => (
                        <li key={`${textureMask}-${texture.texture}`}>
                          <button
                            className="inline-flex shrink-0 cursor-pointer items-center hover:bg-primary-hover/80 active:bg-primary-active/80 justify-center gap-2 rounded text-sm font-bold transition-colors h-12 w-12"
                            onClick={() => {
                              setToolState<TextureToolState>(
                                defaultTools.texture.id,
                                {
                                  ...texture,
                                  mask: textureMask,
                                },
                              );
                            }}
                            title={`${texture.texture} (${textureMask})`}
                          >
                            <PictureIcon
                              className={getTexturePreviewClassName(
                                textureMask,
                              )}
                              src={sprite.maskedSrc ?? sprite.src}
                            />
                          </button>
                        </li>
                      ))}
                  </ul>
                </li>
              ))}
            </ul>
          </Toolbar>
        </div>
      </ToolMenu>
    </>
  );
}

function getTexturePreviewClassName(mask: Mask | "") {
  return mask === Mask.Litt ? "h-3 w-3" : "h-full w-full";
}
