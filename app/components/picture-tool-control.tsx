import {
  useEditorActions,
  useEditorActiveTool,
  useEditorToolState,
} from "~/editor/use-editor-store";
import { PictureIcon } from "./sprite-icon";
import { ToolControlButton, type ToolControlButtonProps } from "./tool";
import { defaultTools } from "~/editor/tools/default-tools";
import { useLgrSprite, usePictureSprites } from "./use-lgr-assets";
import {
  defaultPictureState,
  type PictureToolState,
} from "~/editor/tools/picture-tool";
import { Portal } from "@radix-ui/react-portal";

export function PictureToolControl(props: ToolControlButtonProps) {
  const pictureTool = useEditorToolState<PictureToolState>(
    defaultTools.picture.id
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
        <Portal className="fixed max-h-[80vh] left-20 shadow-lg inset-y-4 my-auto overflow-y-auto">
          <ul className="flex flex-col gap-2 border border-default bg-screen/80 p-2 rounded">
            {pictureSprites.map(({ name, ...sprite }) => (
              <li key={name}>
                <button
                  className="inline-flex shrink-0 cursor-pointer items-center hover:bg-primary-hover/80 active:bg-primary-active/80 justify-center gap-2 rounded text-sm font-bold transition-colors h-12 w-12"
                  onClick={() => {
                    setToolState<PictureToolState>(defaultTools.picture.id, {
                      name,
                    });
                  }}
                >
                  <PictureIcon className="w-full h-full" src={sprite.src} />
                </button>
              </li>
            ))}
          </ul>
        </Portal>
      )}
    </>
  );
}
