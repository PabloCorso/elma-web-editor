import React from "react";
import { useEffect, useRef, useState } from "react";
import { EditorEngine } from "../editor/editor-engine";
import { useEditorStore } from "~/editor/use-editor-store";
import { VertexTool } from "~/editor/tools/vertex-tool";
import { SelectTool } from "~/editor/tools/select-tool";
import { AppleTool, KillerTool, FlowerTool } from "~/editor/tools/object-tools";
import { AIWidget } from "~/editor/widgets/ai-widget";
import { useLgrAssets } from "./use-lgr-assets";
import { type LevelData, LevelImporter } from "~/editor/level-importer";

export function EditorView({
  canvasRef,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}) {
  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair select-none"
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
      }}
    />
  );
}

export function useEditorView({
  isOpenAIEnabled,
}: {
  isOpenAIEnabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<EditorEngine | null>(null);
  const resizeFrameRef = useRef<number | null>(null);
  const lastSizeRef = useRef<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const store = useEditorStore();
  const lgrAssets = useLgrAssets();
  const [initialLevel, setInitialLevel] = useState<LevelData | null>(null);

  useEffect(() => {
    async function loadInitialLevel() {
      const level = await LevelImporter.importBuiltinLevel("WCup907.lev");
      const data = level.data ?? null;
      setInitialLevel(data);
    }
    loadInitialLevel();
  }, []);

  useEffect(
    function initializeEditorEngine() {
      const canvas = canvasRef.current;
      if (!canvas || engineRef.current || !initialLevel) return;

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

      const tools = [VertexTool, SelectTool, AppleTool, KillerTool, FlowerTool];

      const widgets = [];
      if (isOpenAIEnabled) {
        widgets.push(AIWidget);
      }

      engineRef.current = new EditorEngine(canvas, {
        store,
        tools,
        widgets,
        lgrAssets,
        initialLevel,
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
