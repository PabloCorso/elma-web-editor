import { useState, useMemo } from "react";
import {
  builtinLevels,
  getLevelsByCategory,
  type BuiltinLevel,
} from "../editor/builtin-levels";

type BuiltinLevelsProps = {
  onLevelSelect: (level: BuiltinLevel) => void;
  onClose: () => void;
};

export function BuiltinLevels({ onLevelSelect, onClose }: BuiltinLevelsProps) {
  const [searchTerm, setSearchTerm] = useState("");

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

  const handleLevelSelect = (level: BuiltinLevel) => {
    onLevelSelect(level);
    onClose();
    setSearchTerm(""); // Reset search when closing
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Built-in Levels</h2>
        <button
          onClick={() => {
            onClose();
            setSearchTerm("");
          }}
          className="text-gray-400 hover:text-white text-xl"
        >
          ✕
        </button>
      </div>

      {/* Search Input */}
      <div className="p-4 border-b border-gray-700">
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
            className="w-full px-3 py-2 bg-gray-700 text-gray-200 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
            autoFocus
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
            >
              ✕
            </button>
          )}
        </div>
        {searchTerm.trim() && (
          <div className="text-sm text-gray-400 mt-2">
            {Object.values(filteredLevels).flat().length} levels found
          </div>
        )}
      </div>

      {/* Levels List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(filteredLevels).map(([category, levels]) => (
          <div key={category}>
            <h3 className="text-sm font-medium text-gray-300 mb-2">
              {category}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {levels.map((level) => (
                <button
                  key={level.id}
                  onClick={() => handleLevelSelect(level)}
                  className="text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
                >
                  <div className="font-medium">{level.name}</div>
                  <div className="text-xs text-gray-400">{level.filename}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
