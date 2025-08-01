import type { Route } from "./+types/home";
import { useEffect, useRef, useState } from "react";
import { Editor } from "../editor/editor";
import { Sidebar } from "../components/sidebar";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ElastoMania Level Editor" },
    { name: "description", content: "Web-based ElastoMania Level Editor" },
  ];
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const [, forceUpdate] = useState({});

  useEffect(() => {
    console.log("🎯 HOME: useEffect running");
    const canvas = canvasRef.current;
    const container = containerRef.current;

    console.log("🎯 HOME: canvas:", canvas, "container:", container, "editorRef.current:", editorRef.current);

    if (!canvas || !container || editorRef.current) {
      console.log("🎯 HOME: Early return - missing canvas, container, or editor already exists");
      return;
    }

    // Create editor directly
    console.log("🎯 HOME: Creating editor");
    const editor = new Editor(canvas);
    const rect = container.getBoundingClientRect();
    editor.init(rect.width, rect.height);
    editorRef.current = editor;
    console.log("🎯 HOME: Editor created and assigned, calling forceUpdate");
    forceUpdate({}); // Force re-render so Sidebar gets the editor

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  console.log("🎯 HOME: Rendering with editorRef:", editorRef, "editorRef.current:", editorRef.current);
  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar editor={editorRef} />
      <div ref={containerRef} className="flex-1">
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
      </div>
    </div>
  );
}
