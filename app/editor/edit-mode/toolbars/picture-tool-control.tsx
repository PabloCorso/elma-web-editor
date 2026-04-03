import {
  useEditorActions,
  useEditorToolState,
} from "~/editor/use-editor-store";
import { PictureIcon } from "~/components/sprite-icon";
import {
  ToolControlButton,
  ToolControlMenu,
  type ToolControlButtonProps,
} from "./tool";
import { defaultTools } from "~/editor/edit-mode/tools/default-tools";
import { useLgrSprite, usePictureSprites } from "~/components/use-lgr-assets";
import {
  defaultPictureState,
  type PictureToolState,
} from "~/editor/edit-mode/tools/picture-tool";
import { Toolbar } from "~/components/ui/toolbar";

export function PictureToolControl(props: ToolControlButtonProps) {
  const pictureTool = useEditorToolState<PictureToolState>(
    defaultTools.picture.id,
  );
  const { setToolState } = useEditorActions();

  const sprite = useLgrSprite(pictureTool?.name ?? defaultPictureState.name);
  const pictureSprites = usePictureSprites();
  return (
    <ToolControlMenu
      id={defaultTools.picture.id}
      button={
        <ToolControlButton
          isLoading={!sprite.src}
          {...defaultTools.picture}
          {...props}
        >
          <PictureIcon src={sprite.src} />
        </ToolControlButton>
      }
    >
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
    </ToolControlMenu>
  );
}
