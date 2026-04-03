import {
  useEditorToolState,
  useEditorActions,
  useEditorActiveTool,
} from "~/editor/use-editor-store";
import {
  SelectTool,
  type SelectToolState,
} from "~/editor/edit-mode/tools/select-tool";
import { defaultTools } from "~/editor/edit-mode/tools/default-tools";
import { AppleToolbar } from "~/editor/edit-mode/toolbars/apple-tool-control";
import { VertexContextMenuToolbar } from "~/editor/edit-mode/toolbars/vertex-tool-control";
import { OBJECT_DIAMETER, OBJECT_FRAME_PX } from "~/editor/constants";
import { worldToScreen } from "~/editor/helpers/coordinate-helpers";
import { useEditor } from "~/editor/use-editor-store";

export function EditorContextMenu() {
  const { updateApple, setPolygons } = useEditorActions();
  const selectToolState = useEditorToolState<SelectToolState>(
    defaultTools.select.id,
  );
  const selectTool = useEditorActiveTool<SelectTool>();
  const viewPortOffset = useEditor((state) => state.viewPortOffset);
  const zoom = useEditor((state) => state.zoom);
  const polygons = useEditor((state) => state.polygons);

  const contextMenuType = selectToolState?.contextMenuType;
  if (!contextMenuType) return null;

  const selectedApple = selectToolState.selectedObjects[0];
  const selectedPolygon = selectToolState.selectedVertices[0]?.polygon;

  let position = selectToolState.contextMenuPosition ?? { x: 0, y: 0 };
  const isAppleContextMenuActive =
    contextMenuType === "apple" &&
    selectedApple &&
    typeof viewPortOffset?.x === "number" &&
    typeof viewPortOffset?.y === "number" &&
    typeof zoom === "number";
  if (isAppleContextMenuActive) {
    const applePosition = worldToScreen(
      { ...selectedApple, y: selectedApple.y - OBJECT_DIAMETER / 2 },
      viewPortOffset,
      zoom,
    );
    // position above the apple
    const appleSize = OBJECT_FRAME_PX;
    position = { x: applePosition.x, y: applePosition.y - appleSize };
  }

  if (contextMenuType === "apple" && !selectedApple) return null;
  if (contextMenuType === "vertex" && !selectedPolygon) return null;

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
      {contextMenuType === "vertex" && selectedPolygon && (
        <VertexContextMenuToolbar
          tabIndex={-1}
          className="absolute"
          style={{ left: position.x, top: position.y }}
          onGrassToggle={() => {
            const polygonIndex = polygons.indexOf(selectedPolygon);
            if (polygonIndex === -1) return;
            setPolygons(
              polygons.map((polygon, index) =>
                index === polygonIndex
                  ? { ...polygon, grass: !polygon.grass }
                  : polygon,
              ),
            );
            selectTool?.clear();
          }}
        />
      )}
    </>
  );
}
