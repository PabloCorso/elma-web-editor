import { useStore, type EditorTool } from "../editor/useStore";
import { LevelImporter } from "../editor/level-importer";
import { type BuiltinLevel } from "../editor/builtin-levels";
import { BuiltinLevels } from "./built-in-levels";
import { useState, useEffect } from "react";
import { engineRef } from "./editor-view";

export function Sidebar() {
  const [isBuiltInLevelsOpen, setIsBuiltinLevelsOpen] = useState(false);

  const currentTool = useStore((state) => state.currentTool);
  const animateSprites = useStore((state) => state.animateSprites);
  const showSprites = useStore((state) => state.showSprites);

  const setCurrentTool = useStore((state) => state.setCurrentTool);
  const toggleAnimateSprites = useStore((state) => state.toggleAnimateSprites);
  const toggleShowSprites = useStore((state) => state.toggleShowSprites);
  const importLevel = useStore((state) => state.importLevel);
  const triggerFitToView = useStore((state) => state.triggerFitToView);

  const handleToolActivation = (toolId: string) => {
    if (engineRef.current) {
      engineRef.current.activateTool(toolId);
    }
    // Also update the store for UI state
    const toolMap: Record<string, EditorTool> = {
      polygon: "polygon",
      select: "select",
      apple: "apple",
      killer: "killer",
      flower: "flower",
    };
    const tool = toolMap[toolId];
    if (tool) {
      setCurrentTool(tool);
    }
  };

  // Handle keyboard shortcuts for tools
  const handleKeyDown = (e: KeyboardEvent) => {
    // Don't handle shortcuts if user is typing in an input field
    const activeElement = document.activeElement;
    if (
      activeElement &&
      (activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        activeElement.tagName === "SELECT" ||
        (activeElement as HTMLElement).contentEditable === "true")
    ) {
      return;
    }

    const key = e.key.toUpperCase();
    const toolMap: Record<string, EditorTool> = {
      P: "polygon",
      S: "select",
      A: "apple",
      K: "killer",
      F: "flower",
    };

    if (toolMap[key]) {
      e.preventDefault();
      handleToolActivation(toolMap[key].toLowerCase());
    }
  };

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleDownload = async () => {
    try {
      const state = useStore.getState();

      // Import elmajs dynamically
      const elmajs = await import("elmajs");

      // Scale factor to convert from our larger coordinates back to elmajs coordinates
      const scaleFactor = 1 / 20;

      // Prepare polygons for elmajs
      const scaledPolygons = state.polygons.map((polygon) => ({
        vertices: polygon.vertices.map((vertex) => ({
          x: vertex.x * scaleFactor,
          y: vertex.y * scaleFactor,
        })),
        grass: polygon.grass,
      }));

      // Prepare objects for elmajs
      const scaledObjects = [
        ...state.apples.map((apple) => ({
          type: 2, // Apple
          position: {
            x: apple.x * scaleFactor,
            y: apple.y * scaleFactor,
          },
          gravity: 0,
          animation: 0,
        })),
        ...state.killers.map((killer) => ({
          type: 3, // Killer
          position: {
            x: killer.x * scaleFactor,
            y: killer.y * scaleFactor,
          },
          gravity: 0,
          animation: 0,
        })),
        ...state.flowers.map((flower) => ({
          type: 1, // Exit/Flower
          position: {
            x: flower.x * scaleFactor,
            y: flower.y * scaleFactor,
          },
          gravity: 0,
          animation: 0,
        })),
        {
          type: 4, // Start
          position: {
            x: state.start.x * scaleFactor,
            y: state.start.y * scaleFactor,
          },
          gravity: 0,
          animation: 0,
        },
      ];

      // Create a new level
      const level = new elmajs.Level();
      level.name = "Untitled";
      level.polygons = scaledPolygons;
      level.objects = scaledObjects;
      level.integrity = level.calculateIntegrity();

      // Convert to binary .lev format
      const levData = level.toBuffer();

      // Create and download the file
      const dataBlob = new Blob([levData] as any, {
        type: "application/octet-stream",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(dataBlob);
      link.download = "level.lev";
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Failed to download level:", error);
      alert("Failed to download level. Please try again.");
    }
  };

  const handleFileImport = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const result = await LevelImporter.importFromFile(file);
    if (result.success && result.data) {
      importLevel(result.data);
      triggerFitToView();
    } else {
      alert(`Import failed: ${result.error}`);
    }

    // Reset the input
    event.target.value = "";
  };

  const handleBuiltinLevelImport = async (level: BuiltinLevel) => {
    const result = await LevelImporter.importBuiltinLevel(level.filename);
    if (result.success && result.data) {
      importLevel(result.data);
      triggerFitToView();
    } else {
      alert(`Import failed: ${result.error}`);
    }
  };

  return (
    <>
      {/* Built-in Levels Dialog */}
      {isBuiltInLevelsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <BuiltinLevels
            onLevelSelect={handleBuiltinLevelImport}
            onClose={() => setIsBuiltinLevelsOpen(false)}
          />
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="w-64 h-screen bg-gray-800 text-white flex-col border-r border-gray-700 overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Elma Web Editor</h1>
            <span className="px-2 py-1 text-xs font-semibold bg-blue-500 text-white rounded-full">
              BETA
            </span>
          </div>
        </div>

        {/* Tools Section */}
        <div className="p-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Tools</h2>
          <div className="space-y-2">
            <button
              onClick={() => handleToolActivation("select")}
              className={`w-full flex items-center gap-3 px-3 py-1 rounded-lg transition-colors ${
                currentTool === "select"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-200 hover:bg-gray-600"
              }`}
            >
              <span className="text-lg">👆</span>
              <span>
                <span className="underline decoration-gray-300/60 underline-offset-2">
                  S
                </span>
                elect
              </span>
            </button>
            <button
              onClick={() => handleToolActivation("polygon")}
              className={`w-full flex items-center gap-3 px-3 py-1 rounded-lg transition-colors ${
                currentTool === "polygon"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-200 hover:bg-gray-600"
              }`}
            >
              <span className="text-lg">⬟</span>
              <span>
                <span className="underline decoration-gray-300/60 underline-offset-2">
                  P
                </span>
                olygon
              </span>
            </button>
            <button
              onClick={() => handleToolActivation("apple")}
              className={`w-full flex items-center gap-3 px-3 py-1 rounded-lg transition-colors ${
                currentTool === "apple"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-200 hover:bg-gray-600"
              }`}
            >
              <span className="text-lg">🍎</span>
              <span>
                <span className="underline decoration-gray-300/60 underline-offset-2">
                  A
                </span>
                pple
              </span>
            </button>
            <button
              onClick={() => handleToolActivation("killer")}
              className={`w-full flex items-center gap-3 px-3 py-1 rounded-lg transition-colors ${
                currentTool === "killer"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-200 hover:bg-gray-600"
              }`}
            >
              <span className="text-lg">💀</span>
              <span>
                <span className="underline decoration-gray-300/60 underline-offset-2">
                  K
                </span>
                iller
              </span>
            </button>
            <button
              onClick={() => handleToolActivation("flower")}
              className={`w-full flex items-center gap-3 px-3 py-1 rounded-lg transition-colors ${
                currentTool === "flower"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-200 hover:bg-gray-600"
              }`}
            >
              <span className="text-lg">🌸</span>
              <span>
                <span className="underline decoration-gray-300/60 underline-offset-2">
                  F
                </span>
                lower
              </span>
            </button>
          </div>
        </div>

        {/* View Settings Section */}
        <div className="p-4 border-t border-gray-700">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">
            View Settings
          </h2>
          <div className="space-y-2">
            <button
              onClick={toggleShowSprites}
              className={`w-full flex items-center gap-3 px-3 py-1 rounded-lg transition-colors ${
                showSprites
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-200 hover:bg-gray-600"
              }`}
            >
              <span className="text-lg">{showSprites ? "🎨" : "⚫"}</span>
              <span>{showSprites ? "Sprite Mode" : "Circle Mode"}</span>
            </button>
            <button
              onClick={toggleAnimateSprites}
              className={`w-full flex items-center gap-3 px-3 py-1 rounded-lg transition-colors ${
                animateSprites
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-200 hover:bg-gray-600"
              }`}
            >
              <span className="text-lg">{animateSprites ? "🎬" : "⏸️"}</span>
              <span>
                {animateSprites ? "Animated Sprites" : "Static Sprites"}
              </span>
            </button>
            <button
              onClick={triggerFitToView}
              className="w-full flex items-center gap-3 px-3 py-1 bg-gray-700 text-gray-200 hover:bg-gray-600 rounded-lg transition-colors"
            >
              <span className="text-lg">🔍</span>
              <span>Fit to View</span>
            </button>
          </div>
        </div>

        {/* Built-in Levels Button */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={() => setIsBuiltinLevelsOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <span className="text-lg">📚</span>
            <span>Built-in Levels</span>
          </button>
        </div>

        {/* Actions Section */}
        <div className="p-4 mt-auto">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">
            Import/Export
          </h2>
          <div className="space-y-2">
            <button
              onClick={handleDownload}
              className="w-full flex disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-600 items-center gap-3 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              title="Work in progress"
              disabled
            >
              <span className="text-lg">⬇️</span>
              <span>Download Level</span>
            </button>

            <label className="w-full flex items-center gap-3 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer">
              <span className="text-lg">📁</span>
              <span>Import Level</span>
              <input
                type="file"
                accept=".lev,lev"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </>
  );
}
