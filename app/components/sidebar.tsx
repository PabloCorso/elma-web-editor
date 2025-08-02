import { useStore, type EditorTool } from "../editor/useStore";
import { LevelImporter } from "../editor/level-importer";
import {
  builtinLevels,
  getLevelsByCategory,
  type BuiltinLevel,
} from "../editor/builtin-levels";
import { useState, useMemo, useEffect } from "react";

const tools: {
  id: EditorTool;
  label: string;
  icon: string;
  shortcut: string;
}[] = [
  { id: "polygon", label: "Polygon", icon: "⬟", shortcut: "P" },
  { id: "select", label: "Select", icon: "👆", shortcut: "S" },
  { id: "apple", label: "Apple", icon: "🍎", shortcut: "A" },
  { id: "killer", label: "Killer", icon: "💀", shortcut: "K" },
  { id: "flower", label: "Flower", icon: "🌸", shortcut: "F" },
];

export function Sidebar() {
  const [searchTerm, setSearchTerm] = useState("");

  const {
    currentTool,
    setCurrentTool,
    animateSprites,
    toggleAnimateSprites,
    showSprites,
    toggleShowSprites,
    importLevel,
    triggerFitToView,
  } = useStore();

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
    const tool = tools.find((t) => t.shortcut === key);
    if (tool) {
      e.preventDefault();
      setCurrentTool(tool.id);
    }
  };

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filter levels based on search term
  const filteredLevels = useMemo(() => {
    if (!searchTerm.trim()) {
      return getLevelsByCategory();
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = builtinLevels.filter(
      (level) =>
        level.name.toLowerCase().includes(searchLower) ||
        level.category.toLowerCase().includes(searchLower) ||
        level.filename.toLowerCase().includes(searchLower)
    );

    // Group filtered levels by category
    const categories: Record<string, BuiltinLevel[]> = {};
    filtered.forEach((level) => {
      if (!categories[level.category]) {
        categories[level.category] = [];
      }
      categories[level.category].push(level);
    });

    return categories;
  }, [searchTerm]);

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
      const dataBlob = new Blob([levData], {
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
    <div className="w-64 h-screen bg-gray-800 text-white flex flex-col border-r border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold">Elma Web Editor</h1>
      </div>

      {/* Tools Section */}
      <div className="p-4">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Tools</h2>
        <div className="space-y-2">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setCurrentTool(tool.id)}
              className={`w-full flex items-center gap-3 px-3 py-1 rounded-lg transition-colors ${
                currentTool === tool.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-200 hover:bg-gray-600"
              }`}
            >
              <span className="text-lg">{tool.icon}</span>
              <span>
                {tool.label.split("").map((char, index) => {
                  const isShortcut = char.toUpperCase() === tool.shortcut;
                  return (
                    <span
                      key={index}
                      className={
                        isShortcut
                          ? "underline decoration-gray-300/60 underline-offset-2"
                          : ""
                      }
                    >
                      {char}
                    </span>
                  );
                })}
              </span>
            </button>
          ))}
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

      {/* Built-in Levels Section */}
      <div className="flex-1 p-4 border-t border-gray-700 flex flex-col min-h-0">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">
          Built-in Levels
        </h2>

        {/* Search Input */}
        <div className="mb-3 flex-shrink-0">
          <div className="relative">
            <input
              type="text"
              placeholder="Search levels..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setSearchTerm("");
                  e.currentTarget.blur();
                }
              }}
              className="w-full px-3 py-1 bg-gray-700 text-gray-200 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none text-sm pr-8"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 text-sm"
              >
                ✕
              </button>
            )}
          </div>
          {searchTerm.trim() && (
            <div className="text-xs text-gray-400 mt-1">
              {Object.values(filteredLevels).flat().length} levels found
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {Object.entries(filteredLevels).map(([category, levels]) => (
            <div key={category}>
              <h3 className="text-xs font-medium text-gray-400 mb-1">
                {category}
              </h3>
              <div className="space-y-1">
                {levels.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => handleBuiltinLevelImport(level)}
                    className="w-full text-left px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
                  >
                    {level.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions Section */}
      <div className="p-4 mt-auto">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">
          Import/Export
        </h2>
        <div className="space-y-2">
          <button
            onClick={handleDownload}
            className="w-full flex items-center gap-3 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
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
  );
}
