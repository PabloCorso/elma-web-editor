import {
  useEditorActions,
  useEditorActiveTool,
  useEditorStoreInstance,
  useLevelName,
} from "~/editor/use-editor-store";
import logo from "../assets/bear-helmet.png";
import { Toolbar, ToolButton } from "./toolbar";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { DropdownMenu, DropdownMenuGroup } from "@radix-ui/react-dropdown-menu";
import {
  FilePlusIcon,
  FloppyDiskIcon,
  FolderOpenIcon,
} from "@phosphor-icons/react/dist/ssr";
import { LevelImporter } from "~/editor/level-importer";
import { downloadLevel } from "~/editor/utils/download-level";

export function HeaderToolbar() {
  const { setLevelName, importLevel, triggerFitToView } = useEditorActions();
  const store = useEditorStoreInstance();
  const activeTool = useEditorActiveTool();
  const levelName = useLevelName();

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

  // TODO: Replace with File System access API
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

  return (
    <Toolbar className="left-4 top-4">
      <DropdownMenu>
        <DropdownMenuTrigger>
          <div className="relative">
            <h1 className="sr-only">Elma Web Editor</h1>
            <ToolButton name="Elma Web Editor">
              <span className="absolute -top-0 -right-2 px-1 text-[8px] font-semibold bg-blue-500 opacity-75 text-white rounded-full">
                BETA
              </span>
              <img src={logo} className="w-8 h-8 isolate" />
            </ToolButton>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuItem
              iconBefore={<FilePlusIcon />}
              onClick={() => {
                window.location.reload();
              }}
            >
              New
            </DropdownMenuItem>
            <DropdownMenuItem
              iconBefore={<FolderOpenIcon />}
              onClick={() => {
                const fileInput = document.createElement("input");
                fileInput.type = "file";
                fileInput.accept = ".lev,lev";
                fileInput.onchange = (event) =>
                  handleFileImport(
                    event as unknown as React.ChangeEvent<HTMLInputElement>
                  );
                fileInput.click();
              }}
            >
              Open
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              iconBefore={<FloppyDiskIcon />}
              onClick={handleDownload}
            >
              Download
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="px-2">
        <input
          type="text"
          value={levelName}
          onChange={(e) => setLevelName(e.target.value)}
          className="w-full px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
          placeholder="Enter level name..."
        />
      </div>
    </Toolbar>
  );
}
