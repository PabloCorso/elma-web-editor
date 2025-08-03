import { useEffect, useRef } from "react";
import { EditorEngine } from "../editor/editor-engine";

// Global ref to share engine instance
export const engineRef = { current: null as EditorEngine | null };

export function EditorView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
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
    
    // Wait a frame to ensure canvas size is set
    requestAnimationFrame(() => {
      engineRef.current = new EditorEngine(canvas);
    });

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
  }, []);

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
