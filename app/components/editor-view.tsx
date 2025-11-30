import { useEffect, useRef, useState } from "react";
import { EditorEngine } from "../editor/editor-engine";
import { useEditorStore } from "~/editor/use-editor-store";
import { PolygonTool } from "~/editor/tools/polygon-tool";
import { SelectTool } from "~/editor/tools/select-tool";
import { AppleTool, KillerTool, FlowerTool } from "~/editor/tools/object-tools";
import { AIWidget } from "~/editor/widgets/ai-widget";
import * as elmajs from "elmajs";
import defaultLgr from "../assets/lgr/Default.lgr?url";

async function loadLgrFromUrl(url: string = defaultLgr) {
  const buf = await fetch(url).then((r) => r.arrayBuffer());
  return elmajs.LGR.from(new Uint8Array(buf));
}

export function EditorView({ isOpenAIEnabled }: { isOpenAIEnabled?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<EditorEngine | null>(null);
  const resizeFrameRef = useRef<number | null>(null);
  const lastSizeRef = useRef<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const store = useEditorStore();

  const [initialLgr, setInitialLgr] = useState<elmajs.LGR | null>(null);

  useEffect(function loadDefaultLgr() {
    loadLgrFromUrl().then(setInitialLgr);
  }, []);

  useEffect(
    function initializeEditorEngine() {
      const canvas = canvasRef.current;
      if (!canvas || engineRef.current || !initialLgr) return;

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
        PolygonTool,
        SelectTool,
        AppleTool,
        KillerTool,
        FlowerTool,
      ];

      const widgets = [];
      if (isOpenAIEnabled) {
        widgets.push(AIWidget);
      }

      engineRef.current = new EditorEngine(canvas, {
        store,
        tools,
        widgets,
        initialLgr,
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
    [store, initialLgr, isOpenAIEnabled]
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
