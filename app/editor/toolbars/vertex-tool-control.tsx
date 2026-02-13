import { LineSegmentsIcon } from "@phosphor-icons/react/dist/ssr";
import {
  ToolMenuPortal,
  ToolControlButton,
  type ToolControlButtonProps,
} from "./tool";
import { defaultTools } from "~/editor/tools/default-tools";
import {
  useEditorActions,
  useEditorActiveTool,
  useEditorToolState,
} from "~/editor/use-editor-store";
import {
  type VertexToolState,
  type VertexToolVariant,
} from "~/editor/tools/vertex-tool";
import { Toolbar, type ToolbarProps } from "~/components/ui/toolbar";
import type { IconProps } from "@phosphor-icons/react";
import { cn } from "~/utils/misc";

export function VertexToolControl(props: ToolControlButtonProps) {
  const activeTool = useEditorActiveTool();
  const vertexToolState = useEditorToolState<VertexToolState>(
    defaultTools.vertex.id,
  );
  const { setToolState } = useEditorActions();

  const isActive = activeTool?.meta.id === defaultTools.vertex.id;
  return (
    <>
      <ToolControlButton
        isActive={isActive}
        {...defaultTools.vertex}
        {...props}
      >
        <VertexIcon variant={vertexToolState?.variant} />
      </ToolControlButton>
      {isActive && (
        <ToolMenuPortal>
          <VertexToolbar
            onVariantChange={(variant: VertexToolVariant) => {
              setToolState<VertexToolState>(defaultTools.vertex.id, {
                variant,
              });
            }}
          />
        </ToolMenuPortal>
      )}
    </>
  );
}

type VertexToolbarProps = ToolbarProps & {
  onVariantChange: (variant: VertexToolVariant) => void;
};

function VertexToolbar({ onVariantChange, ...props }: VertexToolbarProps) {
  const vertexTool = useEditorToolState<VertexToolState>(
    defaultTools.vertex.id,
  );
  return (
    <Toolbar orientation="vertical" {...props}>
      <ToolControlButton
        {...defaultTools.vertex}
        size="sm"
        isActive={vertexTool?.variant !== "grass"}
        onClick={() => onVariantChange("default")}
      >
        <VertexIcon variant="default" />
      </ToolControlButton>
      <ToolControlButton
        {...defaultTools.vertex}
        size="sm"
        isActive={vertexTool?.variant === "grass"}
        onClick={() => onVariantChange("grass")}
      >
        <VertexIcon variant="grass" />
      </ToolControlButton>
    </Toolbar>
  );
}

type VertexIconProps = IconProps & {
  variant?: VertexToolVariant;
};

function VertexIcon({
  className,
  variant = "default",
  ...props
}: VertexIconProps) {
  return (
    <LineSegmentsIcon
      weight="light"
      className={cn(className, {
        "text-green-600": variant === "grass",
      })}
      {...props}
    />
  );
}
