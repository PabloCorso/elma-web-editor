import React from "react";
import { useEffect, useRef, useState } from "react";
import { EditorEngine } from "../editor/editor-engine";
import {
  useEditorActiveTool,
  useEditorStore,
  useEditorToolState,
} from "~/editor/use-editor-store";
import { VertexTool } from "~/editor/tools/vertex-tool";
import { SelectTool } from "~/editor/tools/select-tool";
import { AppleTool, KillerTool, FlowerTool } from "~/editor/tools/object-tools";
import { AIWidget } from "~/editor/widgets/ai-widget";
import { useLgrAssets } from "./use-lgr-assets";
import { importBuiltinLevel, type LevelData } from "~/editor/level-utils";
import { PictureTool } from "~/editor/tools/picture-tool";
import { HandTool, type HandToolState } from "~/editor/tools/hand-tool";
import { cn } from "~/utils/misc";

type EditorViewProps = React.ComponentPropsWithRef<"canvas">;

export function EditorView({ className, ...props }: EditorViewProps) {
  const activeTool = useEditorActiveTool();
  const handToolState = useEditorToolState<HandToolState>("hand");
  return (
    <canvas
      className={cn(
        "w-full h-full select-none cursor-crosshair",
        {
          "cursor-grab": activeTool?.meta.id === "hand",
          "cursor-grabbing":
            activeTool?.meta.id === "hand" && handToolState?.isDragging,
        },

        className
      )}
      {...props}
    />
  );
}

type UseEditorViewOptions = {
  initialLevel?: InitialLevel;
  isOpenAIEnabled?: boolean;
};

export function useEditorView({
  initialLevel,
  isOpenAIEnabled,
}: UseEditorViewOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<EditorEngine | null>(null);
  const resizeFrameRef = useRef<number | null>(null);
  const lastSizeRef = useRef<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const store = useEditorStore();
  const lgrAssets = useLgrAssets();

  useEffect(
    function initializeEditorEngine() {
      const canvas = canvasRef.current;
      if (!canvas || engineRef.current || initialLevel?.status === "loading") {
        return;
      }

      const parent = canvas.parentElement;
      if (!parent) return;

      const applyResize = () => {
        const rect = parent.getBoundingClientRect();
        const width = Math.floor(rect.width);
        const height = Math.floor(rect.height);

        if (
          lastSizeRef.current.width === width &&
          lastSizeRef.current.height === height
        ) {
          return;
        }

        const context = canvas.getContext("2d");
        if (!context) return;

        // Preserve existing bitmap to avoid flicker when canvas is resized.
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempContext = tempCanvas.getContext("2d");
        tempContext?.drawImage(canvas, 0, 0);

        canvas.width = width;
        canvas.height = height;

        if (tempContext) {
          context.drawImage(tempCanvas, 0, 0);
        }

        lastSizeRef.current = { width, height };

        if (engineRef.current) {
          engineRef.current.fitToView();
        }
      };

      const scheduleResize = () => {
        if (resizeFrameRef.current !== null) return;
        resizeFrameRef.current = requestAnimationFrame(() => {
          resizeFrameRef.current = null;
          applyResize();
        });
      };

      applyResize();

      const tools = [
        SelectTool,
        HandTool,
        VertexTool,
        AppleTool,
        KillerTool,
        FlowerTool,
        PictureTool,
      ];

      const widgets = [];
      if (isOpenAIEnabled) {
        widgets.push(AIWidget);
      }

      engineRef.current = new EditorEngine(canvas, {
        store,
        tools,
        widgets,
        lgrAssets: lgrAssets.lgr ?? undefined,
        initialLevel: initialLevel?.data,
      });

      // Add resize observer to handle parent size changes (batched to avoid flicker)
      const resizeObserver = new ResizeObserver(() => {
        scheduleResize();
      });
      resizeObserver.observe(parent);

      return () => {
        if (resizeFrameRef.current !== null) {
          cancelAnimationFrame(resizeFrameRef.current);
          resizeFrameRef.current = null;
        }
        resizeObserver.disconnect();
        if (engineRef.current) {
          engineRef.current.destroy();
          engineRef.current = null;
        }
      };
    },
    [store, initialLevel, isOpenAIEnabled, lgrAssets]
  );

  return { canvasRef, engineRef };
}

type InitialLevel = {
  data: LevelData | undefined;
  status: "loading" | "done" | "error";
};

// TODO: should this move to FileSession or EditorStore?
export function useInitialLevel(levelName?: string): InitialLevel {
  const [data, setData] = useState<LevelData | undefined>(undefined);
  const [status, setStatus] = useState<"loading" | "done" | "error">(
    levelName ? "loading" : "done"
  );

  useEffect(() => {
    async function loadInitialLevel() {
      if (!levelName) return {};
      try {
        const level = await importBuiltinLevel(`${levelName}.lev`);
        setData(level.data ?? undefined);
        setStatus(level.data ? "done" : "error");
      } catch (error) {
        console.error("Error loading initial level:", error);
        setData(undefined);
        setStatus("error");
      }
    }

    loadInitialLevel();
  }, [levelName]);

  return { data, status };
}
