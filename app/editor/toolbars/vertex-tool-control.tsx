import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/ssr";
import {
  ToolButton,
  ToolControlButton,
  ToolControlMenu,
  type ToolControlButtonProps,
} from "./tool";
import { defaultTools } from "~/editor/tools/default-tools";
import {
  useEditorActions,
  useEditorToolState,
} from "~/editor/use-editor-store";
import {
  canToggleVertexToolDirection,
  getToggledVertexToolState,
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
    <ToolControlMenu
      id={defaultTools.vertex.id}
      button={
        <ToolControlButton {...defaultTools.vertex} {...props}>
          <VertexIcon {...getVertexIconProps(vertexToolState?.variant)} />
        </ToolControlButton>
      }
    >
      <VertexToolbar
        onVariantChange={(variant: VertexToolVariant) => {
          setToolState<VertexToolState>(defaultTools.vertex.id, {
            variant,
          });
        }}
      />
    </ToolControlMenu>
  );
}

type VertexToolbarProps = ToolbarProps & {
  onVariantChange: (variant: VertexToolVariant) => void;
};

function VertexToolbar({ onVariantChange, ...props }: VertexToolbarProps) {
  const vertexTool = useEditorToolState<VertexToolState>(
    defaultTools.vertex.id,
  );
  const { setToolState } = useEditorActions();
  const canToggleDirection = canToggleVertexToolDirection(vertexTool);

  return (
    <Toolbar orientation="vertical" {...props}>
      <ToolControlButton
        {...defaultTools.vertex}
        name={defaultTools.vertex.name}
        shortcut={defaultTools.vertex.shortcut}
        tooltipSide="right"
        size="sm"
        isActive={vertexTool?.variant !== "grass"}
        onClick={() => onVariantChange("default")}
      >
        <VertexIcon {...getVertexIconProps("default")} />
      </ToolControlButton>
      <ToolControlButton
        {...defaultTools.vertex}
        name={defaultTools.vertex.variants?.grass?.name}
        shortcut={defaultTools.vertex.variants?.grass?.shortcut}
        tooltipSide="right"
        size="sm"
        isActive={vertexTool?.variant === "grass"}
        onClick={() => onVariantChange("grass")}
      >
        <VertexIcon {...getVertexIconProps("grass")} />
      </ToolControlButton>
      <ToolButton
        name="Toggle direction"
        shortcut="Space"
        tooltipSide="right"
        size="sm"
        disabled={!canToggleDirection}
        onClick={() => {
          if (!vertexTool) return;

          const nextToolState = getToggledVertexToolState(vertexTool);
          if (!nextToolState) return;

          setToolState<VertexToolState>(defaultTools.vertex.id, nextToolState);
        }}
      >
        <ArrowsLeftRightIcon />
      </ToolButton>
    </Toolbar>
  );
}

type VertexIconProps = React.ComponentPropsWithoutRef<"svg"> & {
  sky?: string;
  ground?: string;
  bounds?: boolean;
  handles?: boolean;
};

export function VertexIcon({
  className,
  sky = colors.sky,
  ground = colors.ground,
  bounds,
  handles,
  ...props
}: VertexIconProps) {
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

      <rect x="0" y="0" width="24" height="24" rx="4" fill={ground} />
      <g clipPath="url(#vertex-icon-frame)">
        <path d="M0 0H24L0 24Z" fill={sky} />
      </g>

      {bounds && (
        <path
          d="M2 22L22 2"
          stroke={uiColors.vertexDraftLine}
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}

      {handles && (
        <>
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
        </>
      )}
    </svg>
  );
}

function getVertexIconProps(variant?: VertexToolVariant): VertexIconProps {
  if (variant === "grass") {
    return {
      sky: colors.sky,
      ground: colors.grass,
      bounds: false,
      handles: true,
    };
  }

  return {
    sky: colors.sky,
    ground: colors.ground,
    bounds: true,
    handles: true,
  };
}
