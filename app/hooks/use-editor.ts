import { useEffect, useRef } from "react";
import { Editor } from "../editor/editor";

export function useEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    
    if (!container || !canvas || editorRef.current) return;

    console.log("Creating single editor instance");
    const editorInstance = new Editor(canvas);
    
    // Wait for next tick to ensure container is properly sized
    setTimeout(() => {
      const rect = container.getBoundingClientRect();
      editorInstance.init(rect.width, rect.height);
      editorRef.current = editorInstance;
      console.log("Editor initialized");
    }, 0);

    return () => {
      if (editorRef.current) {
        console.log("Destroying editor instance");
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  return {
    canvasRef,
    containerRef,
    editor: editorRef.current,
  };
}
