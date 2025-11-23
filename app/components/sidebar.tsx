import {
  useEditorActions,
  useEditorActiveTool,
  useEditorStore,
} from "../editor/use-editor-store";
import { LevelImporter } from "../editor/level-importer";
import { type BuiltinLevel } from "../editor/builtin-levels";
import { BuiltinLevels } from "./built-in-levels";
import { useState } from "react";
import { cn } from "../editor/utils/misc";
import { AIChat } from "./ai-chat";

export function Sidebar() {
  const [isBuiltInLevelsOpen, setIsBuiltinLevelsOpen] = useState(false);

  const {
    toggleShowSprites,
    importLevel,
    triggerFitToView,
    toggleAnimateSprites,
  } = useEditorActions();
  const activeTool = useEditorActiveTool();
  const animateSprites = useEditorStore((state) => state.animateSprites);
  const showSprites = useEditorStore((state) => state.showSprites);

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
      </div>
      {isBuiltInLevelsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <BuiltinLevels
            onLevelSelect={handleBuiltinLevelImport}
            onClose={() => setIsBuiltinLevelsOpen(false)}
          />
        </div>
      )}
      <AIChat />
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
