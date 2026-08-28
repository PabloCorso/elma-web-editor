import { ArrowsLeftRightIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import {
  ToolButton,
  ToolControlButton,
  ToolControlMenu,
  type ToolControlButtonProps,
} from "./tool";
import { defaultTools } from "~/editor/edit-mode/tools/default-tools";
import {
  useEditorActions,
  useEditor,
  useEditorToolState,
} from "~/editor/use-editor-store";
import {
  canToggleVertexToolDirection,
  getToggledVertexToolState,
  VertexTool,
  type VertexToolState,
  type VertexToolVariant,
} from "~/editor/edit-mode/tools/vertex-tool";
import {
  Toolbar,
  ToolbarSeparator,
  type ToolbarProps,
} from "~/components/ui/toolbar";
import {
  colors,
  ELMA_PIXELS_PER_WORLD_UNIT,
  uiColors,
} from "~/editor/constants";
import { cn, useModifier } from "~/utils/misc";
import { useId } from "react";
import type { AutoGrassOptions } from "~/editor/helpers/auto-grass";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { IconButton } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

export const AUTO_GRASS_SELECTED_SHORTCUT = "Shift + G";
export const AUTO_GRASS_ALL_SHORTCUT = "Mod + Shift + G";

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
  const autoGrassOptions = useEditor((state) => state.autoGrassOptions);
  const { getActiveTool, setAutoGrassOptions, setToolState } =
    useEditorActions();
  const canToggleDirection = canToggleVertexToolDirection(vertexTool);
  const modifier = useModifier();
  const autoGrassAllShortcut = AUTO_GRASS_ALL_SHORTCUT.replace("Mod", modifier);

  return (
    <Toolbar orientation="vertical" {...props}>
      <ToolControlButton
        {...defaultTools.vertex}
        name={defaultTools.vertex.name}
        shortcut={defaultTools.vertex.shortcut}
        tooltipSide="right"
        size="sm"
        isActive={!vertexTool?.variant || vertexTool.variant === "normal"}
        onClick={() => onVariantChange("normal")}
      >
        <VertexIcon {...getVertexIconProps("normal")} />
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
      <ToolbarSeparator />
      <AutoGrassSettingsTrigger
        options={autoGrassOptions}
        onChange={setAutoGrassOptions}
        onOpenSettings={() => onVariantChange("autoGrass")}
      />
      <ToolControlButton
        {...defaultTools.vertex}
        name={defaultTools.vertex.variants?.autoGrass?.name}
        shortcut={AUTO_GRASS_SELECTED_SHORTCUT}
        tooltipSide="right"
        size="sm"
        isActive={vertexTool?.variant === "autoGrass"}
        onClick={() => onVariantChange("autoGrass")}
      >
        <VertexIcon {...getVertexIconProps("autoGrass")} />
      </ToolControlButton>
      <ToolButton
        name="Auto grass all"
        shortcut={autoGrassAllShortcut}
        tooltipSide="right"
        size="sm"
        onClick={() => {
          const activeTool = getActiveTool<VertexTool>(defaultTools.vertex.id);
          if (!activeTool) return;
          activeTool.autoGrassAll();
        }}
      >
        <VertexIcon {...getVertexIconProps("autoGrass")} badge="All" />
      </ToolButton>
    </Toolbar>
  );
}

function AutoGrassSettingsTrigger({
  options,
  onChange,
  onOpenSettings,
}: {
  options: AutoGrassOptions;
  onChange: (options: Partial<AutoGrassOptions>) => void;
  onOpenSettings: () => void;
}) {
  return (
    <Popover>
      <PopoverTrigger>
        <ToolButton
          name="Auto grass settings"
          tooltipSide="right"
          size="sm"
          className="h-6 w-8 px-0 text-[0.62rem]"
          onClick={onOpenSettings}
        >
          Auto
        </ToolButton>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="center"
        sideOffset={8}
        collisionPadding={16}
        positionerClassName="z-60"
        className="relative z-50 rounded-lg border border-default bg-screen px-3 py-2 shadow-xl outline-hidden"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="flex items-center gap-1.5 pb-2">
          <p className="flex-1 text-xs font-bold text-primary">Auto grass</p>
          <Tooltip>
            <TooltipTrigger>
              <PopoverClose>
                <IconButton
                  type="button"
                  size="sm"
                  iconSize="sm"
                  className="h-4 w-4 text-secondary hover:text-primary"
                  aria-label="Close auto grass settings"
                >
                  <XIcon aria-hidden="true" />
                </IconButton>
              </PopoverClose>
            </TooltipTrigger>
            <TooltipContent side="top">Close</TooltipContent>
          </Tooltip>
        </div>
        <AutoGrassOptionsControl options={options} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}

function AutoGrassOptionsControl({
  options,
  onChange,
}: {
  options: AutoGrassOptions;
  onChange: (options: Partial<AutoGrassOptions>) => void;
}) {
  return (
    <Toolbar
      orientation="vertical"
      className="grid min-w-44 grid-cols-[max-content_1fr] items-center gap-x-3 gap-y-1.5 rounded-md border-0 bg-transparent p-0 shadow-none"
    >
      <AutoGrassNumberSetting
        label="Height"
        value={worldToPixelValue(options.depth)}
        min={1}
        max={200}
        onCommit={(depthPx) => onChange({ depth: pixelToWorldValue(depthPx) })}
      />
      <AutoGrassNumberSetting
        label="End inset"
        value={worldToPixelValue(options.endInset)}
        min={0}
        max={200}
        onCommit={(insetPx) =>
          onChange({ endInset: pixelToWorldValue(insetPx) })
        }
      />
    </Toolbar>
  );
}

function AutoGrassNumberSetting({
  label,
  value,
  min,
  max,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onCommit: (value: number) => void;
}) {
  const commitInput = (input: HTMLInputElement) => {
    const parsed = Number(input.value);
    if (!Number.isFinite(parsed)) {
      input.value = String(value);
      return;
    }

    const nextValue = Math.max(min, Math.min(max, Math.round(parsed)));
    input.value = String(nextValue);
    if (nextValue !== value) onCommit(nextValue);
  };

  return (
    <label className="contents" onClick={(event) => event.stopPropagation()}>
      <span className="text-xs font-bold text-secondary">{label}</span>
      <input
        key={`${label}-${value}`}
        aria-label={`Auto grass ${label.toLowerCase()}`}
        className="h-8 w-14 justify-self-end rounded-md border border-default bg-screen px-1 text-center text-xs font-bold text-primary outline-hidden focus-visible:focus-ring"
        defaultValue={value}
        inputMode="numeric"
        type="number"
        min={min}
        max={max}
        step={1}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => event.stopPropagation()}
        onBlur={(event) => commitInput(event.currentTarget)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          commitInput(event.currentTarget);
          event.currentTarget.blur();
        }}
      />
    </label>
  );
}

function worldToPixelValue(value: number) {
  return Math.round(value * ELMA_PIXELS_PER_WORLD_UNIT);
}

function pixelToWorldValue(value: number) {
  return value / ELMA_PIXELS_PER_WORLD_UNIT;
}

type PolygonToolbarProps = ToolbarProps & {
  onGrassToggle: () => void;
  onAutoGrass?: () => void;
};

export function VertexContextMenuToolbar({
  onAutoGrass,
  onGrassToggle,
  ...props
}: PolygonToolbarProps) {
  return (
    <Toolbar orientation="vertical" {...props}>
      {onAutoGrass ? (
        <ToolButton
          name="Auto grass selected"
          shortcut={AUTO_GRASS_SELECTED_SHORTCUT}
          onClick={onAutoGrass}
        >
          <VertexIcon {...getVertexIconProps("autoGrass")} />
        </ToolButton>
      ) : null}
      <ToolButton name="Toggle grass" onClick={onGrassToggle}>
        <VertexIcon {...getVertexIconProps("both")} />
      </ToolButton>
    </Toolbar>
  );
}

type VertexIconProps = React.ComponentPropsWithoutRef<"svg"> & {
  sky?: string;
  ground?: string;
  bounds?: boolean;
  boundsColor?: string;
  handles?: boolean;
  badge?: string;
};

export function VertexIcon({
  className,
  sky = colors.sky,
  ground = colors.ground,
  bounds,
  boundsColor = uiColors.vertexDraftLine,
  handles,
  badge,
  ...props
}: VertexIconProps) {
  const frameClipId = useId();

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("overflow-visible rounded", className)}
      {...props}
    >
      <defs>
        <clipPath id={frameClipId}>
          <rect x="0" y="0" width="24" height="24" rx="4" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${frameClipId})`}>
        <rect x="0" y="0" width="24" height="24" fill={ground} />
        <path d="M0 0H24L0 24Z" fill={sky} />
      </g>

      {bounds && (
        <path
          d="M2 22L22 2"
          stroke={boundsColor}
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}

      {handles && (
        <>
          <rect
            x="-0.9"
            y="21.1"
            width="3.8"
            height="3.8"
            rx="0.8"
            fill={uiColors.vertexDraftPointFill}
            stroke={uiColors.vertexDraftPointStroke}
          />
          <rect
            x="21.1"
            y="-0.9"
            width="3.8"
            height="3.8"
            rx="0.8"
            fill={uiColors.vertexDraftPointFill}
            stroke={uiColors.vertexDraftPointStroke}
          />
        </>
      )}

      {badge ? (
        <g aria-hidden="true" pointerEvents="none">
          <text
            x="22.5"
            y="22.5"
            fill="#ffffff"
            stroke="#111827"
            strokeWidth="2"
            paintOrder="stroke"
            fontSize="9"
            fontWeight="800"
            textAnchor="end"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            {badge}
          </text>
        </g>
      ) : null}
    </svg>
  );
}

export function getVertexIconProps(
  variant?: VertexToolVariant,
): VertexIconProps {
  if (variant === "grass") {
    return {
      sky: colors.sky,
      ground: colors.grass,
      bounds: false,
      handles: true,
    };
  }

  if (variant === "both") {
    return {
      sky: colors.ground,
      ground: colors.grass,
      bounds: true,
      handles: false,
    };
  }

  if (variant === "autoGrass") {
    return {
      sky: colors.sky,
      ground: colors.grass,
      bounds: true,
      handles: false,
    };
  }

  return {
    sky: colors.sky,
    ground: colors.ground,
    bounds: true,
    handles: true,
  };
}
