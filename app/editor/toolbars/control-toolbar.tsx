import {
  CursorIcon,
  HandIcon,
  LineSegmentsIcon,
  SparkleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { SpriteIcon } from "~/components/sprite-icon";
import { ToolControlButton, type ToolControlButtonProps } from "./tool";
import { defaultTools } from "~/editor/tools/default-tools";
import { Toolbar, ToolbarSeparator } from "~/components/ui/toolbar";
import { useLgrSprite } from "~/components/use-lgr-assets";
import { AppleToolControl } from "./apple-tool-control";
import { PictureToolControl } from "./picture-tool-control";
import { useEffect, useState } from "react";
import { useEditorActiveTool, useEditorTool } from "~/editor/use-editor-store";
import { VertexTool } from "~/editor/tools/vertex-tool";

export function ControlToolbar({
  isOpenAIEnabled,
}: {
  isOpenAIEnabled?: boolean;
}) {
  return (
    <Toolbar
      orientation="vertical"
      className="flex flex-col gap-2 absolute inset-y-0 h-fit m-auto left-4"
    >
      <SelectToolControl tooltipSide="right" />
      <HandToolControl tooltipSide="right" />

      <ToolbarSeparator />

      <VertexToolControl tooltipSide="right" />
      <GrassToolControl tooltipSide="right" />
      <AppleToolControl tooltipSide="right" />
      <KillerToolControl tooltipSide="right" />
      <FlowerToolControl tooltipSide="right" />
      <PictureToolControl tooltipSide="right" />
      {isOpenAIEnabled && <AIChatToolControl tooltipSide="right" />}
    </Toolbar>
  );
}

function SelectToolControl(props: ToolControlButtonProps) {
  return (
    <ToolControlButton {...defaultTools.select} {...props}>
      <CursorIcon weight="light" />
    </ToolControlButton>
  );
}

function HandToolControl(props: ToolControlButtonProps) {
  return (
    <ToolControlButton {...defaultTools.hand} {...props}>
      <HandIcon weight="light" />
    </ToolControlButton>
  );
}

function VertexToolControl(props: ToolControlButtonProps) {
  const activeTool = useEditorActiveTool();
  const vertexTool = useEditorTool<VertexTool>(defaultTools.vertex.id);
  const [isGrass, setIsGrass] = useState(vertexTool?.defaultGrass ?? false);

  useEffect(
    function subscribeToDefaultGrass() {
      if (!vertexTool) return;
      const unsubscribe = vertexTool.subscribeDefaultGrass(setIsGrass);
      return unsubscribe;
    },
    [vertexTool],
  );

  const isVertexActive =
    activeTool?.meta.id === defaultTools.vertex.id && !isGrass;

  return (
    <ToolControlButton
      {...defaultTools.vertex}
      name="Vertex"
      isActive={isVertexActive}
      onClick={() => {
        if (!vertexTool) return;
        vertexTool.setDefaultGrass(false);
      }}
      {...props}
    >
      <LineSegmentsIcon weight="light" />
    </ToolControlButton>
  );
}

function GrassToolControl(props: ToolControlButtonProps) {
  const activeTool = useEditorActiveTool();
  const vertexTool = useEditorTool<VertexTool>(defaultTools.vertex.id);
  const [isGrass, setIsGrass] = useState(vertexTool?.defaultGrass ?? false);

  useEffect(
    function subscribeToDefaultGrass() {
      if (!vertexTool) return;
      const unsubscribe = vertexTool.subscribeDefaultGrass(setIsGrass);
      return unsubscribe;
    },
    [vertexTool],
  );

  const isGrassActive =
    activeTool?.meta.id === defaultTools.vertex.id && isGrass;

  return (
    <ToolControlButton
      {...defaultTools.vertex.variants?.grass}
      isActive={isGrassActive}
      onClick={() => {
        if (!vertexTool) return;
        vertexTool.setDefaultGrass(true);
      }}
      {...props}
    >
      <LineSegmentsIcon weight="light" className="text-green-600" />
    </ToolControlButton>
  );
}

function KillerToolControl(props: ToolControlButtonProps) {
  const killerSprite = useLgrSprite("qkiller");
  return (
    <ToolControlButton {...defaultTools.killer} {...props}>
      <SpriteIcon src={killerSprite.src} />
    </ToolControlButton>
  );
}

function FlowerToolControl(props: ToolControlButtonProps) {
  const flowerSprite = useLgrSprite("qexit");
  return (
    <ToolControlButton {...defaultTools.flower} {...props}>
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
