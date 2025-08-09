import { useEffect, useRef } from "react";
import { EditorEngine } from "../editor/editor-engine";
import { useEditorStoreApi } from "~/editor/use-editor-store";

export function EditorView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<EditorEngine | null>(null);
  const store = useEditorStoreApi();

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

      engineRef.current = new EditorEngine(canvas, { store });

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
