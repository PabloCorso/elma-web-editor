import { useStore, type EditorTool } from "../editor/useStore";
import { LevelImporter } from "../editor/level-importer";
import {
  builtinLevels,
  getLevelsByCategory,
  type BuiltinLevel,
} from "../editor/builtin-levels";

const tools: { id: EditorTool; label: string; icon: string }[] = [
  { id: "polygon", label: "Polygon", icon: "⬟" },
  { id: "select", label: "Select", icon: "👆" },
  { id: "apple", label: "Apple", icon: "🍎" },
  { id: "killer", label: "Killer", icon: "💀" },
  { id: "flower", label: "Flower", icon: "🌸" },
];

export function Sidebar() {
  const {
    currentTool,
    setCurrentTool,
    animateSprites,
    toggleAnimateSprites,
    showSprites,
    toggleShowSprites,
    importLevel,
  } = useStore();

  const handleDownload = () => {
    const state = useStore.getState();
    const levelData = {
      polygons: state.polygons,
      apples: state.apples,
      killers: state.killers,
      start: state.start,
      flowers: state.flowers,
    };

    const dataStr = JSON.stringify(levelData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(dataBlob);
    link.download = "level.json";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleFileImport = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const result = await LevelImporter.importFromFile(file);
    if (result.success && result.data) {
      importLevel(result.data);
      alert("Level imported successfully!");
    } else {
      alert(`Import failed: ${result.error}`);
    }

    // Reset the input
    event.target.value = "";
  };

  const handleBuiltinLevelImport = async (level: BuiltinLevel) => {
    const result = await LevelImporter.importBuiltinLevel(level.filename);
    if (result.success && result.data) {
      console.log(result.data);
      importLevel(result.data);
      alert(`${level.name} imported successfully!`);
    } else {
      alert(`Import failed: ${result.error}`);
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
              onClick={() => setCurrentTool(tool.id)}
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

      {/* View Settings Section */}
      <div className="p-4 border-t border-gray-700">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">
          View Settings
        </h2>
        <div className="space-y-2">
          <button
            onClick={toggleShowSprites}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
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
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
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
        </div>
      </div>

      {/* Built-in Levels Section */}
      <div className="p-4 border-t border-gray-700">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">
          Built-in Levels
        </h2>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {Object.entries(getLevelsByCategory()).map(([category, levels]) => (
            <div key={category}>
              <h3 className="text-xs font-medium text-gray-400 mb-1">
                {category}
              </h3>
              <div className="space-y-1">
                {levels.slice(0, 5).map((level) => (
                  <button
                    key={level.id}
                    onClick={() => handleBuiltinLevelImport(level)}
                    className="w-full text-left px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
                  >
                    {level.name}
                  </button>
                ))}
                {levels.length > 5 && (
                  <div className="text-xs text-gray-500 px-2">
                    +{levels.length - 5} more...
                  </div>
                )}
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
            className="w-full flex items-center gap-3 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <span className="text-lg">⬇️</span>
            <span>Download Level</span>
          </button>

          <label className="w-full flex items-center gap-3 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer">
            <span className="text-lg">📁</span>
            <span>Import Level</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
