import {
  useEditorActions,
  useEditorCanRedo,
  useEditorCanUndo,
  useEditorHistory,
} from "~/editor/use-editor-store";
import { Toolbar, type ToolbarProps } from "~/components/ui/toolbar";
import {
  ArrowArcLeftIcon,
  ArrowArcRightIcon,
  CornersOutIcon,
  MinusIcon,
  PlusIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { EditorEngine } from "~/editor/editor-engine";
import { ToolButton, type ToolButtonProps } from "./tool";
import { cn, useModifier } from "~/utils/misc";

export function CanvasToolbar({
  engineRef,
}: {
  engineRef: React.RefObject<EditorEngine | null>;
}) {
  const { triggerFitToView } = useEditorActions();
  return (
    <div className="absolute right-4 bottom-4 flex gap-2 items-center">
      <CanvasBar>
        <UntoToolButton />
        <RedoToolButton />
      </CanvasBar>
      <CanvasBar>
        <CanvasToolButton
          name="Zoom In"
          shortcut="+"
          onClick={() => engineRef.current?.zoomIn()}
        >
          <PlusIcon />
        </CanvasToolButton>
        <CanvasToolButton
          name="Zoom Out"
          shortcut="-"
          onClick={() => engineRef.current?.zoomOut()}
        >
          <MinusIcon />
        </CanvasToolButton>
      </CanvasBar>
      <CanvasBar>
        <CanvasToolButton
          name="Fit to view"
          shortcut="1"
          onClick={triggerFitToView}
        >
          <CornersOutIcon />
        </CanvasToolButton>
      </CanvasBar>
    </div>
  );
}

function UntoToolButton(props: ToolButtonProps) {
  const { undo } = useEditorHistory();
  const canUndo = useEditorCanUndo();
  const modifier = useModifier();
  return (
    <CanvasToolButton
      id="undo"
      name="Undo"
      shortcut={`${modifier} + Z`}
      onClick={() => undo()}
      disabled={!canUndo}
      {...props}
    >
      <ArrowArcLeftIcon />
    </CanvasToolButton>
  );
}

function RedoToolButton(props: ToolButtonProps) {
  const { redo } = useEditorHistory();
  const canRedo = useEditorCanRedo();
  const modifier = useModifier();
  return (
    <CanvasToolButton
      id="redo"
      name="Redo"
      shortcut={`${modifier} + Y`}
      onClick={() => redo()}
      disabled={!canRedo}
      {...props}
    >
      <ArrowArcRightIcon />
    </CanvasToolButton>
  );
}

function CanvasBar(props: ToolbarProps) {
  return <Toolbar className="p-0 gap-0 rounded-full" {...props} />;
}

function CanvasToolButton({ className, ...props }: ToolButtonProps) {
  return (
    <ToolButton
      className={cn(
        "rounded-none peer peer-[button]:border-l peer-[button]:border-separator/40",
        "first-of-type:rounded-l-full last-of-type:rounded-r-full only-of-type:rounded-full",
        // Visually center icons
        "first-of-type:*:translate-x-px last-of-type:*:-translate-x-px only-of-type:*:translate-x-0",
        className
      )}
      size="sm"
      iconSize="sm"
      {...props}
    />
  );
}
