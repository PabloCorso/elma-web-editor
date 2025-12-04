import killerImgUrl from "~/assets/elma/QKILLER.png?url";
import flowerImgUrl from "~/assets/elma/QEXIT.png?url";
import {
  CursorIcon,
  LineSegmentsIcon,
  SparkleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { SpriteIcon } from "./sprite-icon";
import { ToolControlButton } from "./tool";
import { defaultTools } from "~/editor/tools/default-tools";
import { Toolbar } from "./toolbar";
import { useLgrSprite } from "./use-lgr-assets";
import { AppleToolControl } from "./apple-tool-control";

export function ControlToolbar({
  isOpenAIEnabled,
}: {
  isOpenAIEnabled?: boolean;
}) {
  const killerUrl = useLgrSprite("qkiller");
  const flowerUrl = useLgrSprite("qexit");

  return (
    <Toolbar className="absolute inset-x-0 w-fit m-auto sm:bottom-4 bottom-20">
      <ToolControlButton {...defaultTools.select}>
        <CursorIcon weight="fill" />
      </ToolControlButton>
      <ToolControlButton {...defaultTools.vertex}>
        <LineSegmentsIcon weight="fill" />
      </ToolControlButton>
      <AppleToolControl />
      <ToolControlButton {...defaultTools.killer}>
        <SpriteIcon src={killerUrl ?? killerImgUrl} />
      </ToolControlButton>
      <ToolControlButton {...defaultTools.flower}>
        <SpriteIcon src={flowerUrl ?? flowerImgUrl} />
      </ToolControlButton>
      {isOpenAIEnabled && (
        <ToolControlButton id="ai-chat" name="AI Assistant" shortcut="I">
          <SparkleIcon weight="fill" />
        </ToolControlButton>
      )}
    </Toolbar>
  );
}
