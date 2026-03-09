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
import { useLgrSprite, useTextureSprites } from "~/components/use-lgr-assets";
import { standardSprites } from "~/components/standard-sprites";
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

  const sprite = useLgrSprite(
    textureTool?.texture ?? defaultTextureState.texture,
  );
  const textureSprites = useTextureSprites();
  const selectedTextureSprite = textureSprites.find(
    ({ texture }) =>
      texture.texture === (textureTool?.texture ?? defaultTextureState.texture),
  );
  return (
    <>
      <ToolControlButton {...defaultTools.texture} {...props}>
        <PictureIcon src={selectedTextureSprite?.maskedSrc ?? sprite.src} />
      </ToolControlButton>
      <ToolMenu id={defaultTools.texture.id} className="pointer-events-none">
        <div className="pointer-events-auto max-h-full overflow-y-auto">
          <Toolbar orientation="vertical" className="p-2">
            <ul className="flex flex-col gap-2">
              {textureSprites.map(({ texture, ...sprite }) => (
                <li key={texture.texture}>
                  <button
                    className="inline-flex shrink-0 cursor-pointer items-center hover:bg-primary-hover/80 active:bg-primary-active/80 justify-center gap-2 rounded text-sm font-bold transition-colors h-12 w-12"
                    onClick={() => {
                      setToolState<TextureToolState>(defaultTools.texture.id, {
                        ...texture,
                        mask: standardSprites.textureMasks[0],
                      });
                    }}
                  >
                    <PictureIcon
                      className="w-full h-full"
                      src={sprite.maskedSrc ?? sprite.src}
                    />
                  </button>
                </li>
              ))}
            </ul>
          </Toolbar>
        </div>
      </ToolMenu>
    </>
  );
}
