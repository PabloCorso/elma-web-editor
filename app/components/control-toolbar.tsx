import { useEditorActions, useEditorStore } from "~/editor/use-editor-store";
import appleImgUrl from "~/assets/elma/qfood1.png?url";
import killerImgUrl from "~/assets/elma/QKILLER.png?url";
import flowerImgUrl from "~/assets/elma/QEXIT.png?url";
import {
  CursorIcon,
  LineSegmentsIcon,
  SparkleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { SpriteIcon } from "./sprite-icon";
import { useEffect } from "react";
import { ToolControlButton } from "./tool-button";
import { defaultTools } from "~/editor/tools/default-tools";
import { Toolbar } from "./toolbar";

export function ControlToolbar({
  isOpenAIEnabled,
}: {
  isOpenAIEnabled?: boolean;
}) {
  const { activateTool } = useEditorActions();
  const store = useEditorStore();

  useEffect(function setupKeyboardShortcuts() {
    const onKeyboardShortcut = (e: KeyboardEvent) => {
      if (isField(document.activeElement)) return;

      const key = e.key.toUpperCase();
      const state = store.getState();
      const tool = Array.from(state.toolsMap.values()).find(
        (tool) => tool.meta.shortcut?.toUpperCase() === key
      );
      if (tool) {
        e.preventDefault();
        activateTool(tool.meta.id);
      }
    };

    document.addEventListener("keydown", onKeyboardShortcut);
    return function cleanup() {
      document.removeEventListener("keydown", onKeyboardShortcut);
    };
  }, []);

  return (
    <Toolbar className="flex-col h-fit inset-y-0 m-auto left-4">
      <ToolControlButton {...defaultTools.select}>
        <CursorIcon weight="fill" />
      </ToolControlButton>
      <ToolControlButton {...defaultTools.vertex}>
        <LineSegmentsIcon weight="fill" />
      </ToolControlButton>
      <ToolControlButton {...defaultTools.apple}>
        <SpriteIcon src={appleImgUrl} />
      </ToolControlButton>
      <ToolControlButton {...defaultTools.killer}>
        <SpriteIcon src={killerImgUrl} />
      </ToolControlButton>
      <ToolControlButton {...defaultTools.flower}>
        <SpriteIcon src={flowerImgUrl} />
      </ToolControlButton>
      {isOpenAIEnabled && (
        <ToolControlButton id="ai-chat" name="AI Assistant" shortcut="I">
          <SparkleIcon weight="fill" />
        </ToolControlButton>
      )}
    </Toolbar>
  );
}

function isField(element: Element | null) {
  return (
    element &&
    (element.tagName === "INPUT" ||
      element.tagName === "TEXTAREA" ||
      element.tagName === "SELECT" ||
      (element as HTMLElement).contentEditable === "true")
  );
}
