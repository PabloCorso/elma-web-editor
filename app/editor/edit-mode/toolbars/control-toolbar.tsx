import { HandIcon, SparkleIcon } from "@phosphor-icons/react/dist/ssr";
import { SpriteIcon } from "~/components/sprite-icon";
import { ToolControlButton, type ToolControlButtonProps } from "./tool";
import { defaultTools } from "~/editor/edit-mode/tools/default-tools";
import {
  Toolbar,
  ToolbarSeparator,
  type ToolbarProps,
} from "~/components/ui/toolbar";
import { useLgrSprite } from "~/components/use-lgr-assets";
import { AppleToolControl } from "./apple-tool-control";
import { PictureToolControl } from "./picture-tool-control";
import { TextureToolControl } from "./texture-tool-control";
import { VertexToolControl } from "./vertex-tool-control";
import { cn } from "~/utils/misc";
import { SelectToolControl } from "./select-tool-control";

type ControlToolbarProps = ToolbarProps & {
  isOpenAIEnabled?: boolean;
};

export function ControlToolbar({
  className,
  isOpenAIEnabled,
  ...props
}: ControlToolbarProps) {
  return (
    <div
      className={cn("absolute inset-y-0 left-4 grid", className)}
      style={{
        gridTemplateRows:
          "minmax(var(--toolbar-space), 1fr) auto minmax(1rem, 1fr)",
      }}
    >
      <Toolbar
        orientation="vertical"
        className="row-start-2 flex flex-col h-fit max-h-full self-center gap-2 overflow-auto"
        {...props}
      >
        <SelectToolControl tooltipSide="right" />
        <HandToolControl tooltipSide="right" />

        <ToolbarSeparator />

        <VertexToolControl tooltipSide="right" />
        <AppleToolControl tooltipSide="right" />
        <KillerToolControl tooltipSide="right" />
        <FlowerToolControl tooltipSide="right" />
        <PictureToolControl tooltipSide="right" />
        <TextureToolControl tooltipSide="right" />
        {isOpenAIEnabled && <AIChatToolControl tooltipSide="right" />}
      </Toolbar>
    </div>
  );
}

function HandToolControl(props: ToolControlButtonProps) {
  return (
    <ToolControlButton {...defaultTools.hand} {...props}>
      <HandIcon weight="light" />
    </ToolControlButton>
  );
}

function KillerToolControl(props: ToolControlButtonProps) {
  const killerSprite = useLgrSprite("qkiller");
  return (
    <ToolControlButton
      isLoading={!killerSprite.src}
      {...defaultTools.killer}
      {...props}
    >
      <SpriteIcon src={killerSprite.src} />
    </ToolControlButton>
  );
}

function FlowerToolControl(props: ToolControlButtonProps) {
  const flowerSprite = useLgrSprite("qexit");
  return (
    <ToolControlButton
      isLoading={!flowerSprite.src}
      {...defaultTools.flower}
      {...props}
    >
      <SpriteIcon src={flowerSprite.src} />
    </ToolControlButton>
  );
}

function AIChatToolControl(props: ToolControlButtonProps) {
  return (
    <ToolControlButton id="ai-chat" name="AI Assistant" shortcut="I" {...props}>
      <SparkleIcon weight="fill" />
    </ToolControlButton>
  );
}
