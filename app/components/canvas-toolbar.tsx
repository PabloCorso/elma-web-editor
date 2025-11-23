import { useEditorActions, useZoom } from "~/editor/use-editor-store";
import { Toolbar, ToolButton } from "./toolbar";
import {
  CornersOutIcon,
  MinusIcon,
  PlusIcon,
} from "@phosphor-icons/react/dist/ssr";

export function CanvasToolbar() {
  const zoom = useZoom();
  const { setZoom, triggerFitToView } = useEditorActions();
  return (
    <Toolbar className="right-4 bottom-4">
      <ToolButton name="Zoom In" onClick={() => setZoom(zoom + 1)}>
        <PlusIcon />
      </ToolButton>
      <ToolButton name="Zoom Out" onClick={() => setZoom(zoom - 1)}>
        <MinusIcon />
      </ToolButton>
      <ToolButton name="Fit to view" onClick={triggerFitToView}>
        <CornersOutIcon />
      </ToolButton>
    </Toolbar>
  );
}
