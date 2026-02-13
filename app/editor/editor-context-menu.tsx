import {
  useEditorToolState,
  useEditor,
  useEditorActions,
  useEditorActiveTool,
} from "./use-editor-store";
import { SelectTool, type SelectToolState } from "./tools/select-tool";
import { defaultTools } from "./tools/default-tools";
import { worldToScreen } from "./helpers/coordinate-helpers";
import { OBJECT_DIAMETER } from "elmajs";
import { AppleToolbar } from "~/editor/toolbars/apple-tool-control";
import { OBJECT_FRAME_PX } from "./constants";

export function EditorContextMenu() {
  const { updateApple } = useEditorActions();
  const selectToolState = useEditorToolState<SelectToolState>(
    defaultTools.select.id
  );
  const selectTool = useEditorActiveTool<SelectTool>();
  const viewPortOffset = useEditor((state) => state.viewPortOffset);
  const zoom = useEditor((state) => state.zoom);

  const contextMenuType = selectToolState?.contextMenuType;
  if (!contextMenuType) return null;

  const selectedApple = selectToolState.selectedObjects[0];
  if (!selectedApple) return null;

  let position = { x: 0, y: 0 };
  const isAppleContextMenuActive =
    contextMenuType === "apple" &&
    selectToolState?.selectedObjects &&
    selectToolState.selectedObjects.length > 0 &&
    typeof viewPortOffset?.x === "number" &&
    typeof viewPortOffset?.y === "number" &&
    typeof zoom === "number";
  if (isAppleContextMenuActive) {
    const applePosition = worldToScreen(
      { ...selectedApple, y: selectedApple.y - OBJECT_DIAMETER / 2 },
      viewPortOffset,
      zoom
    );
    // position above the apple
    const appleSize = OBJECT_FRAME_PX;
    position = { x: applePosition.x, y: applePosition.y - appleSize };
  }

  return (
    <>
      {contextMenuType === "apple" && (
        <AppleToolbar
          tabIndex={-1}
          withShortcuts={false}
          orientation="horizontal"
          className="absolute"
          style={{ left: position.x, top: position.y }}
          onAnimationChange={(animation) => {
            updateApple({ position: selectedApple, animation });
            selectTool?.clear();
          }}
          onGravityChange={(gravity) => {
            updateApple({ position: selectedApple, gravity });
            selectTool?.clear();
          }}
        />
      )}
    </>
  );
}
