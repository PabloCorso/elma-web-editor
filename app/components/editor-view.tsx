import { useEffect, useRef } from "react";
import { EditorEngine } from "../editor/editor-engine";
import { useEditorStore } from "~/editor/use-editor-store";
import { PolygonTool } from "~/editor/tools/polygon-tool";
import { SelectTool } from "~/editor/tools/select-tool";
import { AppleTool, KillerTool, FlowerTool } from "~/editor/tools/object-tools";
import { AIWidget } from "~/editor/widgets/ai-widget";
import type { Tool } from "~/editor/tools/tool-interface";

export function EditorView({ isOpenAIEnabled }: { isOpenAIEnabled: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<EditorEngine | null>(null);
  const store = useEditorStore();

  useEffect(
    function initializeEditorEngine() {
      const canvas = canvasRef.current;
      if (!canvas || engineRef.current) return;

      const parent = canvas.parentElement;
      if (!parent) return;

      const updateCanvasSize = () => {
        const rect = parent.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
      };

      updateCanvasSize();

      const tools: Tool[] = [
        new PolygonTool(store),
        new SelectTool(store),
        new AppleTool(store),
        new KillerTool(store),
        new FlowerTool(store),
      ];

      const widgets = [];
      if (isOpenAIEnabled) {
        widgets.push(new AIWidget(store));
      }

      engineRef.current = new EditorEngine(canvas, { store, tools, widgets });

      // Add resize observer to handle parent size changes
      const resizeObserver = new ResizeObserver(() => {
        updateCanvasSize();
        if (engineRef.current) {
          engineRef.current.fitToView();
        }
      });
      resizeObserver.observe(parent);

      return () => {
        resizeObserver.disconnect();
        if (engineRef.current) {
          engineRef.current.destroy();
          engineRef.current = null;
        }
      };
    },
    [store]
  );

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
