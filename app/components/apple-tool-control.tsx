import {
  useEditorActions,
  useEditorActiveTool,
  useEditorToolState,
} from "~/editor/use-editor-store";
import { SpriteIcon } from "./sprite-icon";
import { ToolControlButton } from "./tool";
import { defaultTools } from "~/editor/tools/default-tools";
import { useLgrSprite } from "./use-lgr-assets";
import { Popover, PopoverAnchor, PopoverContent } from "./popover";
import { Gravity } from "elmajs";
import {
  defaultAppleState,
  type AppleToolState,
} from "~/editor/tools/object-tools";
import type { AppleAnimation } from "~/editor/editor.types";
import { cn } from "~/editor/utils/misc";
import { Button, type ButtonProps } from "./button";

export function AppleToolControl() {
  const activeTool = useEditorActiveTool();
  const appleTool = useEditorToolState<AppleToolState>(defaultTools.apple.id);
  const { setToolState } = useEditorActions();

  const handleAppleAnimationChange = (animation: AppleAnimation) => {
    setToolState<AppleToolState>(defaultTools.apple.id, { animation });
  };

  const handleGravityChange = (gravity: Gravity) => {
    setToolState<AppleToolState>(defaultTools.apple.id, { gravity });
  };

  const apple1 = useLgrSprite("qfood1");
  const apple2 = useLgrSprite("qfood2");
  const currentAnimation = appleTool?.animation || defaultAppleState.animation;
  const currentGravity = appleTool?.gravity ?? defaultAppleState.gravity;
  const apple = { 1: apple1, 2: apple2 }[currentAnimation];

  const isActive = activeTool?.meta.id === defaultTools.apple.id;
  return (
    <Popover open={isActive} modal={false}>
      <PopoverAnchor>
        <ToolControlButton
          {...defaultTools.apple}
          iconAfter={<AppleArrowIcon gravity={currentGravity} />}
        >
          <SpriteIcon src={apple.src} />
        </ToolControlButton>
      </PopoverAnchor>
      <PopoverContent sideOffset={12} side="top" align="center">
        <SimpleToolbar>
          <SimpleToggleGroup>
            <SimpleToggleButton
              shortcut="1"
              iconBefore={<SpriteIcon src={apple1.src} />}
              onClick={() => handleAppleAnimationChange(1)}
            />
            <SimpleToggleButton
              shortcut="2"
              iconBefore={<SpriteIcon src={apple2.src} />}
              onClick={() => handleAppleAnimationChange(2)}
            />
          </SimpleToggleGroup>
          <SimpleSeparator />
          <SimpleToggleGroup>
            <SimpleToggleButton
              shortcut="E"
              iconBefore={<SpriteIcon src={apple.src} />}
              onClick={() => handleGravityChange(Gravity.None)}
            />
            <SimpleToggleButton
              shortcut="W"
              onClick={() => handleGravityChange(Gravity.Down)}
              iconBefore={<SpriteIcon src={apple.src} />}
              iconAfter={<AppleArrowIcon gravity={Gravity.Down} />}
            />
            <SimpleToggleButton
              shortcut="A"
              onClick={() => handleGravityChange(Gravity.Left)}
              iconBefore={<SpriteIcon src={apple.src} />}
              iconAfter={<AppleArrowIcon gravity={Gravity.Left} />}
            />
            <SimpleToggleButton
              shortcut="S"
              onClick={() => handleGravityChange(Gravity.Up)}
              iconBefore={<SpriteIcon src={apple.src} />}
              iconAfter={<AppleArrowIcon gravity={Gravity.Up} />}
            />
            <SimpleToggleButton
              shortcut="D"
              onClick={() => handleGravityChange(Gravity.Right)}
              iconBefore={<SpriteIcon src={apple.src} />}
              iconAfter={<AppleArrowIcon gravity={Gravity.Right} />}
            />
          </SimpleToggleGroup>
        </SimpleToolbar>
      </PopoverContent>
    </Popover>
  );
}

const gravityRotations: Record<Gravity, number> = {
  [Gravity.None]: 0,
  [Gravity.Up]: 0,
  [Gravity.Down]: 180,
  [Gravity.Left]: -90,
  [Gravity.Right]: 90,
} as const;

function GravityIcon(props: React.SVGAttributes<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 256 256" fill="none" {...props}>
      <polyline
        points="80 140 128 100 176 140"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
    </svg>
  );
}

function AppleArrowIcon({
  gravity,
  className,
  ...props
}: { gravity: Gravity } & React.SVGProps<SVGSVGElement>) {
  if (gravity === Gravity.None) return null;
  const rotation = gravityRotations[gravity];
  return (
    <GravityIcon
      className={cn("absolute inset-0 m-auto text-[#fde047]", className)}
      style={{ transform: `rotate(${rotation}deg)` }}
      {...props}
    />
  );
}

// Simple div-based toolbar components without roving focus
function SimpleToolbar({
  className,
  ...props
}: React.ComponentPropsWithRef<"div">) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-[8px] border border-default bg-screen/80 p-1.5 gap-1 shadow-sm",
        className
      )}
      {...props}
    />
  );
}

function SimpleToggleGroup({
  className,
  ...props
}: React.ComponentPropsWithRef<"div">) {
  return (
    <div className={cn("flex items-center gap-1", className)} {...props} />
  );
}

function SimpleSeparator({ className }: { className?: string }) {
  return <div className={cn("w-px h-6 bg-separator mx-1", className)} />;
}

function SimpleToggleButton({
  className,
  children,
  shortcut,
  ...props
}: ButtonProps & { shortcut?: string }) {
  return (
    <Button
      type="button"
      size="sm"
      iconSize="lg"
      className={cn("relative", className)}
      iconOnly
      tabIndex={-1}
      {...props}
    >
      {children}
      {shortcut && (
        <span className="absolute bottom-0 right-0 text-[8px] text-white/75 font-medium px-0.5 bg-background/80 rounded-sm leading-none">
          {shortcut}
        </span>
      )}
    </Button>
  );
}
