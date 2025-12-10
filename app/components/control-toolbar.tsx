import {
  CursorIcon,
  HandIcon,
  LineSegmentsIcon,
  SparkleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { SpriteIcon } from "./sprite-icon";
import { ToolControlButton } from "./tool";
import { defaultTools } from "~/editor/tools/default-tools";
import { Toolbar, ToolbarSeparator } from "./toolbar";
import { useLgrSprite } from "./use-lgr-assets";
import { AppleToolControl } from "./apple-tool-control";
import { PictureToolControl } from "./picture-tool-control";

export function ControlToolbar({
  isOpenAIEnabled,
}: {
  isOpenAIEnabled?: boolean;
}) {
  return (
    <Toolbar className="absolute inset-x-0 w-fit m-auto sm:bottom-4 bottom-20">
      <SelectToolControl />
      <HandToolControl />

      <ToolbarSeparator />

      <VertexToolControl />
      <AppleToolControl />
      <KillerToolControl />
      <FlowerToolControl />
      <PictureToolControl />
      {isOpenAIEnabled && <AIChatToolControl />}
    </Toolbar>
  );
}

function SelectToolControl() {
  return (
    <ToolControlButton {...defaultTools.select}>
      <CursorIcon weight="light" />
    </ToolControlButton>
  );
}

function HandToolControl() {
  return (
    <ToolControlButton {...defaultTools.hand}>
      <HandIcon weight="light" />
    </ToolControlButton>
  );
}

function VertexToolControl() {
  return (
    <ToolControlButton {...defaultTools.vertex}>
      <LineSegmentsIcon weight="light" />
    </ToolControlButton>
  );
}

function KillerToolControl() {
  const killerSprite = useLgrSprite("qkiller");
  return (
    <ToolControlButton {...defaultTools.killer}>
      <SpriteIcon src={killerSprite.src} />
    </ToolControlButton>
  );
}

function FlowerToolControl() {
  const flowerSprite = useLgrSprite("qexit");
  return (
    <ToolControlButton {...defaultTools.flower}>
      <SpriteIcon src={flowerSprite.src} />
    </ToolControlButton>
  );
}

function AIChatToolControl() {
  return (
    <ToolControlButton id="ai-chat" name="AI Assistant" shortcut="I">
      <SparkleIcon weight="fill" />
    </ToolControlButton>
  );
}
