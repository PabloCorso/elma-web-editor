import { useEditorActions, useZoom } from "~/editor/use-editor-store";
import { Toolbar, ToolButton } from "./toolbar";
import {
  CornersOutIcon,
  MinusIcon,
  PlusIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { EditorEngine } from "~/editor/editor-engine";

export function CanvasToolbar({
  engineRef,
}: {
  engineRef: React.RefObject<EditorEngine | null>;
}) {
  const { triggerFitToView } = useEditorActions();
  return (
    <Toolbar className="right-4 bottom-4">
      <ToolButton name="Zoom In" onClick={() => engineRef.current?.zoomIn()}>
        <PlusIcon />
      </ToolButton>
      <ToolButton name="Zoom Out" onClick={() => engineRef.current?.zoomOut()}>
        <MinusIcon />
      </ToolButton>
      <ToolButton name="Fit to view" onClick={triggerFitToView}>
        <CornersOutIcon />
      </ToolButton>
    </Toolbar>
  );
}
