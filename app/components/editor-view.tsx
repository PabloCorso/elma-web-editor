import { useEffect, useRef } from "react";
import { EditorEngine } from "../editor/editor-engine";
import { initialLevelData } from "../editor/level-importer";

export function EditorView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<EditorEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || engineRef.current) return;

    // Get the parent container dimensions
    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Create the canvas engine with default level data
    engineRef.current = new EditorEngine(canvas, initialLevelData);

    // Example: You could also load different level data like this:
    // const customLevel = {
    //   polygons: [/* custom polygons */],
    //   apples: [/* custom apples */],
    //   killers: [/* custom killers */],
    //   flowers: [/* custom flowers */],
    //   start: { x: 200, y: 300 },
    // };
    // engineRef.current = new EditorEngine(canvas, customLevel);

    // Or load a level after creation:
    // engineRef.current.loadLevel(customLevel);

    return () => {
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
