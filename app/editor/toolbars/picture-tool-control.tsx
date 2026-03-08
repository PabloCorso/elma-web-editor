import {
  useEditorActions,
  useEditorActiveTool,
  useEditorToolState,
} from "~/editor/use-editor-store";
import { PictureIcon } from "~/components/sprite-icon";
import { ToolControlButton, type ToolControlButtonProps } from "./tool";
import { defaultTools } from "~/editor/tools/default-tools";
import { useLgrSprite, usePictureSprites } from "~/components/use-lgr-assets";
import {
  defaultPictureState,
  type PictureToolState,
} from "~/editor/tools/picture-tool";
import { Portal } from "@radix-ui/react-portal";
import { Toolbar } from "~/components/ui/toolbar";

export function PictureToolControl(props: ToolControlButtonProps) {
  const pictureTool = useEditorToolState<PictureToolState>(
    defaultTools.picture.id,
  );
  const { setToolState } = useEditorActions();

  const sprite = useLgrSprite(pictureTool?.name ?? defaultPictureState.name);
  const pictureSprites = usePictureSprites();

  const activeTool = useEditorActiveTool();
  const isActive = activeTool?.meta.id === defaultTools.picture.id;
  return (
    <>
      <ToolControlButton {...defaultTools.picture} {...props}>
        <PictureIcon src={sprite.src} />
      </ToolControlButton>
      {isActive && (
        <Portal className="pointer-events-none fixed left-20 top-20 bottom-16 flex items-center">
          <div className="pointer-events-auto max-h-full overflow-y-auto">
            <Toolbar orientation="vertical" className="p-2">
              <ul className="flex flex-col gap-2">
                {pictureSprites.map(({ picture, ...sprite }) => (
                  <li key={picture.name}>
                    <button
                      className="inline-flex shrink-0 cursor-pointer items-center hover:bg-primary-hover/80 active:bg-primary-active/80 justify-center gap-2 rounded text-sm font-bold transition-colors h-12 w-12"
                      onClick={() => {
                        setToolState<PictureToolState>(
                          defaultTools.picture.id,
                          picture,
                        );
                      }}
                    >
                      <PictureIcon className="w-full h-full" src={sprite.src} />
                    </button>
                  </li>
                ))}
              </ul>
            </Toolbar>
          </div>
        </Portal>
      )}
    </>
  );
}
