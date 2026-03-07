import {
  ToolMenu,
  ToolControlButton,
  type ToolControlButtonProps,
} from "./tool";
import { defaultTools } from "~/editor/tools/default-tools";
import {
  useEditorActions,
  useEditorToolState,
} from "~/editor/use-editor-store";
import {
  type VertexToolState,
  type VertexToolVariant,
} from "~/editor/tools/vertex-tool";
import { Toolbar, type ToolbarProps } from "~/components/ui/toolbar";
import { colors, uiColors } from "~/editor/constants";
import { cn } from "~/utils/misc";

export function VertexToolControl(props: ToolControlButtonProps) {
  const vertexToolState = useEditorToolState<VertexToolState>(
    defaultTools.vertex.id,
  );
  const { setToolState } = useEditorActions();

  return (
    <>
      <ToolControlButton {...defaultTools.vertex} {...props}>
        <VertexIcon variant={vertexToolState?.variant} />
      </ToolControlButton>
      <ToolMenu id={defaultTools.vertex.id}>
        <VertexToolbar
          onVariantChange={(variant: VertexToolVariant) => {
            setToolState<VertexToolState>(defaultTools.vertex.id, {
              variant,
            });
          }}
        />
      </ToolMenu>
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

type VertexIconProps = React.ComponentPropsWithoutRef<"svg"> & {
  variant?: VertexToolVariant;
};

function VertexIcon({
  className,
  variant = "default",
  ...props
}: VertexIconProps) {
  const isGrass = variant === "grass";
  const edgeColor = isGrass ? colors.grass : uiColors.vertexDraftLine;
  const lowerFill = isGrass ? colors.grass : colors.ground;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("overflow-visible", className)}
      {...props}
    >
      <defs>
        <clipPath id="vertex-icon-frame">
          <rect x="0" y="0" width="24" height="24" rx="4" />
        </clipPath>
      </defs>

      <rect x="0" y="0" width="24" height="24" rx="4" fill={lowerFill} />
      <g clipPath="url(#vertex-icon-frame)">
        <path d="M0 0H24L0 24Z" fill={colors.sky} />
      </g>

      {!isGrass && (
        <path
          d="M0 24L24 0"
          stroke={edgeColor}
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}

      <rect
        x="-1.9"
        y="22.1"
        width="3.8"
        height="3.8"
        fill={uiColors.vertexDraftPointFill}
        stroke={uiColors.vertexDraftPointStroke}
      />
      <rect
        x="22.1"
        y="-1.9"
        width="3.8"
        height="3.8"
        fill={uiColors.vertexDraftPointFill}
        stroke={uiColors.vertexDraftPointStroke}
      />
    </svg>
  );
}
