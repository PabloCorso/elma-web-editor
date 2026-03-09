import {
  isDefaultLevelVisibility,
  type LevelVisibilitySettings,
} from "~/editor/level-visibility";
import { useEditor, useEditorActions } from "~/editor/use-editor-store";
import {
  ArrowsClockwiseIcon,
  LayoutIcon,
  PaletteIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useClickOutside } from "@mantine/hooks";
import { SpriteIcon } from "~/components/sprite-icon";
import {
  useLgrSprite,
  usePictureSprites,
  useTextureSprites,
} from "~/components/use-lgr-assets";
import { IconButton } from "~/components/ui/button";
import {
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
} from "~/components/ui/toolbar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/utils/misc";
import { useState } from "react";
import { colors } from "../constants";
import { VertexIcon } from "./vertex-tool-control";

export function LevelVisibilityControl() {
  const levelVisibility = useEditor((state) => state.levelVisibility);
  const { toggleLevelVisibility, resetLevelVisibility } = useEditorActions();
  const showReset = !isDefaultLevelVisibility(levelVisibility);
  const [open, setOpen] = useState(false);
  const rootRef = useClickOutside(() => setOpen(false));

  return (
    <div ref={rootRef} className="relative">
      <Tooltip>
        <TooltipTrigger>
          <ToolbarButton
            aria-label="Visibility options"
            aria-expanded={open}
            onClick={() => setOpen((isOpen) => !isOpen)}
          >
            <LayoutIcon />
          </ToolbarButton>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Visibility options
        </TooltipContent>
      </Tooltip>
      {open && (
        <div className="fixed top-20 left-24 flex items-center justify-center pointer-events-none">
          <Toolbar
            orientation="horizontal"
            className="p-2 gap-1 pointer-events-auto"
          >
            <LevelVisibilityControls
              levelVisibility={levelVisibility}
              onToggle={toggleLevelVisibility}
              onReset={resetLevelVisibility}
              showReset={showReset}
            />
          </Toolbar>
        </div>
      )}
    </div>
  );
}

export function LevelVisibilityControls({
  levelVisibility,
  onToggle,
  onReset,
  showReset,
}: {
  levelVisibility: LevelVisibilitySettings;
  onToggle: (key: keyof LevelVisibilitySettings) => void;
  onReset?: () => void;
  showReset?: boolean;
}) {
  const shouldShowReset =
    showReset ??
    (!isDefaultLevelVisibility(levelVisibility) && Boolean(onReset));

  console.log(shouldShowReset);

  return (
    <>
      <VisibilityToggleButton
        label="Ground/Sky textures"
        icon={<PaletteIcon />}
        active={levelVisibility.useGroundSkyTextures}
        onClick={() => onToggle("useGroundSkyTextures")}
      />
      <VisibilityToggleButton
        label="Polygon handles"
        icon={<PolygonHandlesIcon />}
        active={levelVisibility.showPolygonHandles}
        onClick={() => onToggle("showPolygonHandles")}
      />
      <ToolbarSeparator />
      <VisibilityToggleButton
        label="Objects"
        icon={<ObjectsMixIcon />}
        active={levelVisibility.showObjects}
        onClick={() => onToggle("showObjects")}
      />
      <VisibilityToggleButton
        label="Pictures"
        icon={<PicturesIcon />}
        active={levelVisibility.showPictures}
        onClick={() => onToggle("showPictures")}
      />
      <VisibilityToggleButton
        label="Textures"
        icon={<BrickTextureIcon className="h-5 w-5" />}
        active={levelVisibility.showTextures}
        onClick={() => onToggle("showTextures")}
      />
      <VisibilityToggleButton
        label="Polygons"
        icon={<PolygonsIcon />}
        active={levelVisibility.showPolygons}
        onClick={() => onToggle("showPolygons")}
      />
      <ToolbarSeparator />
      <VisibilityToggleButton
        label="Object bounds"
        icon={<ObjectBoundsIcon />}
        active={levelVisibility.showObjectBounds}
        onClick={() => onToggle("showObjectBounds")}
      />
      <VisibilityToggleButton
        label="Picture bounds"
        icon={<PictureBoundsIcon />}
        active={levelVisibility.showPictureBounds}
        onClick={() => onToggle("showPictureBounds")}
      />
      <VisibilityToggleButton
        label="Texture bounds"
        icon={<TextureBoundsIcon />}
        active={levelVisibility.showTextureBounds}
        onClick={() => onToggle("showTextureBounds")}
      />
      <VisibilityToggleButton
        label="Polygon bounds"
        icon={<PolygonBoundsIcon />}
        active={levelVisibility.showPolygonBounds}
        onClick={() => onToggle("showPolygonBounds")}
      />
      <ToolbarSeparator />
      <IconButton type="button" onClick={onReset} disabled={!showReset}>
        <ArrowsClockwiseIcon />
      </IconButton>
    </>
  );
}

function VisibilityToggleButton({
  label,
  icon,
  active,
  className,
  ...props
}: Omit<React.ComponentPropsWithRef<"button">, "children"> & {
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <IconButton
          type="button"
          iconSize="lg"
          aria-label={label}
          aria-pressed={active}
          className={cn("aria-pressed:bg-primary-hover/50", className)}
          {...props}
        >
          {icon}
        </IconButton>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function ObjectsMixIcon({
  className,
  ...props
}: React.ComponentPropsWithRef<"span">) {
  const apple = useLgrSprite("qfood1");
  const killer = useLgrSprite("qkiller");
  const flower = useLgrSprite("qexit");

  return (
    <span className={cn("relative", className)} {...props}>
      <SpriteIcon
        src={apple.src}
        className="absolute left-1/2 top-0 h-1/2 w-1/2 -translate-x-1/2"
      />
      <SpriteIcon
        src={killer.src}
        className="absolute bottom-0 left-0 h-1/2 w-1/2"
      />
      <SpriteIcon
        src={flower.src}
        className="absolute bottom-0 right-0 h-1/2 w-1/2"
      />
    </span>
  );
}

function PolygonHandlesIcon(props: React.SVGProps<SVGSVGElement>) {
  return <VertexIcon handles {...props} />;
}

function PicturesIcon({
  className,
  ...props
}: React.ComponentPropsWithRef<"span">) {
  const pictureSprites = usePictureSprites();
  const barrel = pictureSprites.find(
    ({ picture }) => picture.name === "barrel",
  );
  const fallbackPicture = pictureSprites.find(({ src }) => Boolean(src));
  const src = barrel?.src ?? fallbackPicture?.src;

  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      {...props}
    >
      <SpriteIcon
        src={src}
        className="block h-full w-full bg-contain bg-no-repeat bg-center"
      />
    </span>
  );
}

function BrickTextureIcon({
  className,
  ...props
}: React.ComponentPropsWithRef<"span">) {
  const textureSprites = useTextureSprites();
  const brickTexture = textureSprites.find(
    ({ texture }) => texture.texture === "brick",
  );
  const fallbackTexture = textureSprites.find(({ src }) => Boolean(src));
  const fallbackSprite = useLgrSprite("brick");
  const src = brickTexture?.src ?? fallbackTexture?.src ?? fallbackSprite.src;

  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      {...props}
    >
      <SpriteIcon
        src={src}
        className="block h-full w-full bg-contain bg-no-repeat bg-center"
      />
    </span>
  );
}

function PolygonsIcon(props: React.SVGProps<SVGSVGElement>) {
  return <VertexIcon {...props} />;
}

function ObjectBoundsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle
        cx="12"
        cy="7"
        r="3.2"
        stroke={colors.selection}
        strokeWidth="2"
      />
      <circle
        cx="7.2"
        cy="16.2"
        r="3.2"
        stroke={colors.selection}
        strokeWidth="2"
      />
      <circle
        cx="16.8"
        cy="16.2"
        r="3.2"
        stroke={colors.selection}
        strokeWidth="2"
      />
    </svg>
  );
}

function PictureBoundsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        stroke={colors.selection}
        strokeWidth="2"
      />
    </svg>
  );
}

function TextureBoundsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect
        x="6"
        y="2"
        width="14"
        height="20"
        stroke={colors.selection}
        strokeWidth="2"
      />
    </svg>
  );
}

function PolygonBoundsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <VertexIcon sky="transparent" ground="transparent" bounds {...props} />
  );
}
