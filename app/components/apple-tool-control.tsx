import {
  useEditorActions,
  useEditorActiveTool,
  useEditorToolState,
} from "~/editor/use-editor-store";
import { SpriteIcon } from "./sprite-icon";
import { ToolControlButton, type ToolControlButtonProps } from "./tool";
import { defaultTools } from "~/editor/tools/default-tools";
import { useLgrSprite } from "./use-lgr-assets";
import {
  defaultAppleState,
  type AppleToolState,
} from "~/editor/tools/apple-tools";
import { type AppleAnimation, Gravity } from "~/editor/elma-types";
import { cn } from "~/utils/misc";
import { type ButtonProps } from "./ui/button";
import { Toolbar, ToolbarButton, ToolbarSeparator } from "./toolbar";
import { Portal } from "@radix-ui/react-portal";

export function AppleToolControl(props: ToolControlButtonProps) {
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

  const activeTool = useEditorActiveTool();
  const isActive = activeTool?.meta.id === defaultTools.apple.id;
  return (
    <>
      <ToolControlButton
        className="relative"
        iconAfter={<AppleArrowIcon gravity={currentGravity} />}
        {...defaultTools.apple}
        {...props}
      >
        <SpriteIcon src={apple.src} />
      </ToolControlButton>
      {isActive && (
        <Portal className="h-fit fixed max-h-[80vh] left-20 shadow-lg inset-y-4 my-auto overflow-y-auto">
          <Toolbar orientation="vertical">
            <AppleButton
              shortcut="1"
              iconBefore={<SpriteIcon src={apple1.src} />}
              onClick={() => handleAppleAnimationChange(1)}
            />
            <AppleButton
              shortcut="2"
              iconBefore={<SpriteIcon src={apple2.src} />}
              onClick={() => handleAppleAnimationChange(2)}
            />
            <ToolbarSeparator />
            <AppleButton
              shortcut="N"
              iconBefore={<SpriteIcon src={apple.src} />}
              onClick={() => handleGravityChange(Gravity.None)}
            />
            <AppleButton
              onClick={() => handleGravityChange(Gravity.Down)}
              iconBefore={<SpriteIcon src={apple.src} />}
              iconAfter={<AppleArrowIcon gravity={Gravity.Down} />}
            />
            <AppleButton
              onClick={() => handleGravityChange(Gravity.Left)}
              iconBefore={<SpriteIcon src={apple.src} />}
              iconAfter={<AppleArrowIcon gravity={Gravity.Left} />}
            />
            <AppleButton
              onClick={() => handleGravityChange(Gravity.Up)}
              iconBefore={<SpriteIcon src={apple.src} />}
              iconAfter={<AppleArrowIcon gravity={Gravity.Up} />}
            />
            <AppleButton
              onClick={() => handleGravityChange(Gravity.Right)}
              iconBefore={<SpriteIcon src={apple.src} />}
              iconAfter={<AppleArrowIcon gravity={Gravity.Right} />}
            />
          </Toolbar>
        </Portal>
      )}
    </>
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

function AppleButton({
  className,
  shortcut,
  ...props
}: ButtonProps & { shortcut?: string }) {
  return (
    <ToolbarButton
      size="sm"
      className={cn("relative", className)}
      iconAfter={shortcut && <ShortcutIndicator>{shortcut}</ShortcutIndicator>}
      {...props}
    />
  );
}

function AppleArrowIcon({
  gravity,
  className,
  style,
  ...props
}: { gravity: Gravity } & React.SVGProps<SVGSVGElement>) {
  if (gravity === Gravity.None) return null;
  const rotation = gravityRotations[gravity];
  return (
    <GravityIcon
      className={cn("absolute inset-0 m-auto text-[#fde047]", className)}
      style={{ transform: `rotate(${rotation}deg)`, ...style }}
      {...props}
    />
  );
}

function ShortcutIndicator({
  className,
  ...props
}: React.ComponentPropsWithRef<"span">) {
  return (
    <span
      className={cn(
        "absolute bottom-1 max-w-2 max-h-2 right-1 text-[8px] text-white/75 font-medium px-0.5 bg-background/80 rounded-sm leading-none",
        className
      )}
      {...props}
    />
  );
}
