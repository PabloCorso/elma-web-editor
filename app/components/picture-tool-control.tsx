import { useEditorToolState } from "~/editor/use-editor-store";
import { PictureIcon } from "./sprite-icon";
import { ToolControlButton } from "./tool";
import { defaultTools } from "~/editor/tools/default-tools";
import { useLgrSprite } from "./use-lgr-assets";
import {
  defaultPictureState,
  type PictureToolState,
} from "~/editor/tools/picture-tool";

export function PictureToolControl() {
  const pictureTool = useEditorToolState<PictureToolState>(
    defaultTools.picture.id
  );

  const sprite = useLgrSprite(pictureTool?.name ?? defaultPictureState.name);
  return (
    <ToolControlButton {...defaultTools.picture}>
      <PictureIcon src={sprite.src} />
    </ToolControlButton>
  );
}
