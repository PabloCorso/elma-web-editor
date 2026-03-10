import {
  CursorIcon,
  CopySimpleIcon,
  EraserIcon,
} from "@phosphor-icons/react/dist/ssr";
import {
  ToolButton,
  ToolControlButton,
  ToolControlMenu,
  type ToolControlButtonProps,
} from "./tool";
import { defaultTools } from "~/editor/tools/default-tools";
import { Toolbar } from "~/components/ui/toolbar";
import { useEditorTool, useEditorToolState } from "~/editor/use-editor-store";
import { SelectTool, type SelectToolState } from "~/editor/tools/select-tool";

export function SelectToolControl(props: ToolControlButtonProps) {
  return (
    <ToolControlMenu
      id={defaultTools.select.id}
      button={
        <ToolControlButton {...defaultTools.select} {...props}>
          <CursorIcon weight="light" />
        </ToolControlButton>
      }
    >
      <SelectToolbar />
    </ToolControlMenu>
  );
}

function SelectToolbar() {
  const selectTool = useEditorTool<SelectTool>(defaultTools.select.id);
  const selectToolState = useEditorToolState<SelectToolState>(
    defaultTools.select.id,
  );

  const hasSelection =
    (selectToolState?.selectedVertices.length ?? 0) > 0 ||
    (selectToolState?.selectedObjects.length ?? 0) > 0 ||
    (selectToolState?.selectedPictures.length ?? 0) > 0;
  const canDuplicate = selectTool?.canDuplicateSelection() ?? false;

  return (
    <Toolbar orientation="vertical">
      <ToolButton
        name="Erase selection"
        shortcut="Del"
        tooltipSide="right"
        size="sm"
        disabled={!hasSelection}
        onClick={() => {
          selectTool?.deleteCurrentSelection();
        }}
      >
        <EraserIcon weight="light" />
      </ToolButton>
      <ToolButton
        name="Duplicate selection"
        shortcut="Mod + C, Mod + V"
        tooltipSide="right"
        size="sm"
        disabled={!canDuplicate}
        onClick={() => {
          selectTool?.duplicateSelectionWithOffset();
        }}
      >
        <CopySimpleIcon weight="light" />
      </ToolButton>
    </Toolbar>
  );
}
