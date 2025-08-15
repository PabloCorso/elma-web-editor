import { useEditorStore, useEditorStoreApi } from "../editor/use-editor-store";
import { LevelImporter } from "../editor/level-importer";
import { type BuiltinLevel } from "../editor/builtin-levels";
import { BuiltinLevels } from "./built-in-levels";
import { useState, useEffect } from "react";
import { downloadLevel } from "../editor/utils/download-level";
import logo from "../assets/bear-helmet.png";
import { cn } from "../editor/utils/misc";

export function Sidebar() {
  const [isBuiltInLevelsOpen, setIsBuiltinLevelsOpen] = useState(false);

  const activeTool = useEditorStore((state) => state.getActiveTool());
  const animateSprites = useEditorStore((state) => state.animateSprites);
  const showSprites = useEditorStore((state) => state.showSprites);

  const toggleAnimateSprites = useEditorStore(
    (state) => state.toggleAnimateSprites
  );
  const toggleShowSprites = useEditorStore((state) => state.toggleShowSprites);
  const importLevel = useEditorStore((state) => state.importLevel);
  const triggerFitToView = useEditorStore((state) => state.triggerFitToView);
  const activateTool = useEditorStore((state) => state.activateTool);
  const levelName = useEditorStore((state) => state.levelName);
  const setLevelName = useEditorStore((state) => state.setLevelName);
  const store = useEditorStoreApi();

  const handleToolActivation = (toolId: string) => {
    activateTool(toolId);
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
    const toolMap: Record<string, string> = {
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
      const state = store.getState();
      await downloadLevel(state);
    } catch (error) {
      console.error("Failed to download level:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      alert(`Failed to download level: ${errorMessage}`);
    }
  };

  const handleFileImport = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const result = await LevelImporter.importFromFile(file);
    if (result.success && result.data) {
      activeTool?.clear?.();
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
      activeTool?.clear?.();
      importLevel(result.data);
      triggerFitToView();
    } else {
      alert(`Import failed: ${result.error}`);
    }
  };

  const handleOpenBuiltinLevels = () => {
    activeTool?.clear?.();
    setIsBuiltinLevelsOpen(true);
  };

  return (
    <>
      <div className="w-64 h-full bg-gray-800 text-white flex flex-col border-r border-gray-700 overflow-y-auto">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Elma Web Editor" className="w-8 h-8" />
            <h1 className="text-xl font-bold">Web Editor</h1>
            <span className="relative -top-1 px-1.5 py-0.5 text-[10px] font-semibold bg-blue-500 text-white rounded-full">
              BETA
            </span>
          </div>
        </div>

        <div className="p-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Tools</h2>
          <div className="space-y-2">
            <SidebarButton
              onClick={() => handleToolActivation("select")}
              className={cn(
                activeTool?.id === "select"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-200 hover:bg-gray-600"
              )}
            >
              <span className="text-lg">👆</span>
              <span>
                <span className="underline decoration-gray-300/60 underline-offset-2">
                  S
                </span>
                elect
              </span>
            </SidebarButton>
            <SidebarButton
              onClick={() => handleToolActivation("polygon")}
              className={cn(
                activeTool?.id === "polygon"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-200 hover:bg-gray-600"
              )}
            >
              <span className="text-lg">⬟</span>
              <span>
                <span className="underline decoration-gray-300/60 underline-offset-2">
                  P
                </span>
                olygon
              </span>
            </SidebarButton>
            <SidebarButton
              onClick={() => handleToolActivation("apple")}
              className={cn(
                activeTool?.id === "apple"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-200 hover:bg-gray-600"
              )}
            >
              <span className="text-lg">🍎</span>
              <span>
                <span className="underline decoration-gray-300/60 underline-offset-2">
                  A
                </span>
                pple
              </span>
            </SidebarButton>
            <SidebarButton
              onClick={() => handleToolActivation("killer")}
              className={cn(
                activeTool?.id === "killer"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-200 hover:bg-gray-600"
              )}
            >
              <span className="text-lg">💀</span>
              <span>
                <span className="underline decoration-gray-300/60 underline-offset-2">
                  K
                </span>
                iller
              </span>
            </SidebarButton>
            <SidebarButton
              onClick={() => handleToolActivation("flower")}
              className={cn(
                activeTool?.id === "flower"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-200 hover:bg-gray-600"
              )}
            >
              <span className="text-lg">🌸</span>
              <span>
                <span className="underline decoration-gray-300/60 underline-offset-2">
                  F
                </span>
                lower
              </span>
            </SidebarButton>
          </div>
        </div>

        <div className="p-4 border-t border-gray-700">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">
            View Settings
          </h2>
          <div className="space-y-2">
            <SidebarButton
              onClick={toggleShowSprites}
              className={cn(
                showSprites
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-200 hover:bg-gray-600"
              )}
            >
              <span className="text-lg">{showSprites ? "🎨" : "⚫"}</span>
              <span>{showSprites ? "Sprite Mode" : "Circle Mode"}</span>
            </SidebarButton>
            <SidebarButton
              onClick={toggleAnimateSprites}
              className={cn(
                animateSprites
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-200 hover:bg-gray-600"
              )}
            >
              <span className="text-lg">{animateSprites ? "🎬" : "⏸️"}</span>
              <span>
                {animateSprites ? "Animated Sprites" : "Static Sprites"}
              </span>
            </SidebarButton>
            <SidebarButton
              onClick={triggerFitToView}
              className="bg-gray-700 text-gray-200 hover:bg-gray-600"
            >
              <span className="text-lg">🔍</span>
              <span>Fit to View</span>
            </SidebarButton>
          </div>
        </div>

        <div className="p-4 border-t border-gray-700">
          <SidebarButton
            onClick={handleOpenBuiltinLevels}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <span className="text-lg">📚</span>
            <span>Built-in Levels</span>
          </SidebarButton>
        </div>

        <div className="p-4 mt-auto">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">
            Import/Export
          </h2>
          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Level Name</label>
              <input
                type="text"
                value={levelName}
                onChange={(e) => setLevelName(e.target.value)}
                className="w-full px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                placeholder="Enter level name..."
              />
            </div>
            <SidebarButton
              onClick={handleDownload}
              className="bg-green-600 hover:bg-green-700"
              title="Download current level as .lev file"
            >
              <span className="text-lg">⬇️</span>
              <span>Download Level</span>
            </SidebarButton>

            <SidebarButton
              className="bg-blue-600 hover:bg-blue-700"
              title="Import level from file"
              onClick={() => {
                const fileInput = document.createElement("input");
                fileInput.type = "file";
                fileInput.accept = ".lev,lev";
                fileInput.onchange = (e) => handleFileImport(e as any);
                fileInput.click();
              }}
            >
              <span className="text-lg">📁</span>
              <span>Import Level</span>
            </SidebarButton>
          </div>
        </div>
      </div>

      {isBuiltInLevelsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <BuiltinLevels
            onLevelSelect={handleBuiltinLevelImport}
            onClose={() => setIsBuiltinLevelsOpen(false)}
          />
        </div>
      )}
    </>
  );
}

function SidebarButton({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "w-full flex items-center gap-3 px-3 py-1 text-white cursor-pointer rounded-lg transition-colors",
        className
      )}
      {...props}
    />
  );
}
