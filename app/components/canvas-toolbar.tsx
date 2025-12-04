import { useEditorActions } from "~/editor/use-editor-store";
import { Toolbar } from "./toolbar";
import {
  CornersOutIcon,
  MinusIcon,
  PlusIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { EditorEngine } from "~/editor/editor-engine";
import { ToolButton } from "./tool";

export function CanvasToolbar({
  engineRef,
}: {
  engineRef: React.RefObject<EditorEngine | null>;
}) {
  const { triggerFitToView } = useEditorActions();
  return (
    <Toolbar className="absolute right-4 bottom-4">
      <ToolButton
        name="Zoom In"
        shortcut="+"
        onClick={() => engineRef.current?.zoomIn()}
      >
        <PlusIcon />
      </ToolButton>
      <ToolButton
        name="Zoom Out"
        shortcut="-"
        onClick={() => engineRef.current?.zoomOut()}
      >
        <MinusIcon />
      </ToolButton>
      <ToolButton name="Fit to view" onClick={triggerFitToView}>
        <CornersOutIcon />
      </ToolButton>
    </Toolbar>
  );
}
