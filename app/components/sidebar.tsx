import { useEffect, useState, type RefObject } from "react";
import type { Editor } from "../editor/editor";

interface SidebarProps {
  editor: RefObject<Editor> | null;
}

const tools = [
  { id: "polygon", label: "Polygon", icon: "⬟" },
  { id: "select", label: "Select", icon: "👆" },
  { id: "apple", label: "Apple", icon: "🍎" },
  { id: "killer", label: "Killer", icon: "💀" },
  { id: "flower", label: "Flower", icon: "🌸" },
];

export function Sidebar({ editor }: SidebarProps) {
  const [currentTool, setCurrentTool] = useState("polygon");

  useEffect(() => {
    console.log(
      "🎯 SIDEBAR: useEffect running, editor:",
      editor,
      "editor.current:",
      editor?.current
    );
    if (!editor?.current) {
      console.log("🎯 SIDEBAR: Editor is null, returning early");
      return;
    }

    const handleToolChanged = (event: CustomEvent) => {
      console.log("🎯 SIDEBAR: Tool changed to:", event.detail.tool);
      setCurrentTool(event.detail.tool);
    };

    console.log("🎯 SIDEBAR: Setting up toolChanged listener");
    editor.current.on("toolChanged", handleToolChanged as EventListener);

    return () => {
      console.log("🎯 SIDEBAR: Cleaning up toolChanged listener");
      editor.current?.off("toolChanged", handleToolChanged as EventListener);
    };
  }, [editor]);

  const handleToolClick = (toolId: string) => {
    console.log(
      "🎯 SIDEBAR: handleToolClick called with:",
      toolId,
      "editor:",
      editor,
      "editor.current:",
      editor?.current
    );
    if (editor?.current) {
      console.log("🎯 SIDEBAR: Calling editor.setTool(", toolId, ")");
      editor.current.setTool(toolId);
      // The state will be updated via the toolChanged event
    } else {
      console.log("🎯 SIDEBAR: Editor is null, cannot set tool");
    }
  };

  const handleDownload = () => {
    if (editor?.current) {
      editor.current.downloadLevel();
    }
  };

  return (
    <div className="w-64 h-screen bg-gray-800 text-white flex flex-col border-r border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold">Elma Editor</h1>
      </div>

      {/* Tools Section */}
      <div className="p-4">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Tools</h2>
        <div className="space-y-2">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                currentTool === tool.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-200 hover:bg-gray-600"
              }`}
            >
              <span className="text-lg">{tool.icon}</span>
              <span>{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Actions Section */}
      <div className="p-4 mt-auto">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Actions</h2>
        <button
          onClick={handleDownload}
          className="w-full flex items-center gap-3 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          <span className="text-lg">⬇️</span>
          <span>Download Level</span>
        </button>
      </div>
    </div>
  );
}
