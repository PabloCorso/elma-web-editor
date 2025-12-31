import {
  useEditorActions,
  useEditorActiveTool,
  useEditor,
  useEditorStore,
  useLevelName,
} from "~/editor/use-editor-store";
import logo from "../assets/bear-helmet.png";
import { Toolbar, ToolbarButton } from "./toolbar";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { DropdownMenu, DropdownMenuGroup } from "@radix-ui/react-dropdown-menu";
import {
  CaretDownIcon,
  FilePlusIcon,
  FloppyDiskIcon,
  FolderOpenIcon,
  GearIcon,
} from "@phosphor-icons/react/dist/ssr";
import {
  editorLevelFromFile,
  elmaLevelFromEditorState,
} from "~/editor/helpers/level-parser";
import { useState } from "react";
import { supportsFilePickers } from "~/editor/helpers/file-session";
import { SettingsDialog } from "./settings";
import { Icon } from "./ui/icon";
import { cn } from "~/utils/misc";

export function HeaderToolbar({ isLoading }: { isLoading?: boolean }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { setLevelName, loadLevel, triggerFitToView } = useEditorActions();
  const store = useEditorStore();
  const activeTool = useEditorActiveTool();
  const levelName = useLevelName();
  const filename = useEditor((state) => state.fileSession.fileName);
  const isModified = useEditor((state) => state.fileSession.isModified);

  const handleOpenFile = async () => {
    const fileSession = store.getState().fileSession;
    const fileContent = await fileSession.open();
    if (!fileContent) return;

    const fileName = fileSession.fileName?.endsWith(".lev")
      ? fileSession.fileName
      : `${fileSession.fileName}.lev`;
    const file =
      fileContent instanceof ArrayBuffer
        ? new File([new Uint8Array(fileContent)], fileName)
        : new File([fileContent], fileName);

    try {
      const level = await editorLevelFromFile(file);
      activeTool?.clear?.();
      loadLevel(level);
      triggerFitToView();
    } catch (error) {
      alert(`Import failed: ${error instanceof Error ? error.message : error}`);
      return;
    }
  };

  const handleSave = async () => {
    const fileSession = store.getState().fileSession;
    if (!fileSession.hasFile) {
      return handleSaveAs();
    }

    await fileSession.save();
  };

  const handleSaveAs = async () => {
    const state = store.getState();
    const fileSession = state.fileSession;
    const level = elmaLevelFromEditorState(state);
    await fileSession.saveAs(level);
  };

  return (
    <>
      <Toolbar className="absolute left-4 top-4">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <ToolbarButton
              className="w-14 relative gap-0"
              aria-label="Elma Web Editor"
            >
              <span className="absolute -top-0 right-1 px-1 text-[8px] font-semibold bg-blue-500 opacity-75 text-white rounded-full">
                BETA
              </span>
              <img src={logo} className="w-8 h-8 isolate" />
              <Icon size="xs" className="text-white/70">
                <CaretDownIcon />
              </Icon>
            </ToolbarButton>
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
                onClick={handleOpenFile}
              >
                Open
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                iconBefore={<FloppyDiskIcon />}
                onClick={handleSave}
              >
                Save
              </DropdownMenuItem>
              {supportsFilePickers() && (
                <DropdownMenuItem
                  iconBefore={<FilePlusIcon />}
                  onClick={handleSaveAs}
                >
                  Save as
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                iconBefore={<GearIcon />}
                onClick={() => setSettingsOpen(true)}
              >
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="px-2 flex items-center gap-2">
          {!isLoading && (
            <input
              type="text"
              value={levelName}
              onChange={(e) => setLevelName(e.target.value)}
              className={cn(
                "focus-visible:focus-ring w-full px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 text-sm"
              )}
              placeholder="Enter level name…"
            />
          )}
          {filename ? (
            <div>
              {filename} {isModified ? "*" : ""}
            </div>
          ) : null}
        </div>
      </Toolbar>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
