import {
  useEditorActions,
  useEditorActiveTool,
  useEditorLevelFolderName,
  useEditor,
  useEditorStore,
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
import {
  downloadLevel,
  getLevelFromState,
  levelToBlob,
} from "~/editor/utils/download-level";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  type DialogProps,
} from "./ui/dialog";
import { useState } from "react";

export function HeaderToolbar() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { setLevelName, loadLevelData, triggerFitToView } = useEditorActions();
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

    const result = await LevelImporter.importFromFile(file);
    if (result.success && result.data) {
      activeTool?.clear?.();
      loadLevelData(result.data);
      triggerFitToView();
    } else {
      alert(`Import failed: ${result.error}`);
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
    const level = await getLevelFromState(state);
    await fileSession.saveAs(level);
  };

  return (
    <>
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
              <DropdownMenuItem
                iconBefore={<FilePlusIcon />}
                onClick={handleSaveAs}
              >
                Save as
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="px-2 flex items-center gap-2">
          <input
            type="text"
            value={levelName}
            onChange={(e) => setLevelName(e.target.value)}
            className="w-full px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
            placeholder="Enter level name..."
          />
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

function SettingsDialog(props: DialogProps) {
  const store = useEditorStore();
  const levelFolderName = useEditorLevelFolderName();
  const [_, forceUpdate] = useState(0);
  return (
    <Dialog {...props}>
      <DialogContent>
        <DialogHeader showCloseButton>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <DialogDescription className="sr-only">
          Application settings
        </DialogDescription>
        <DialogBody>
          <p>Elma Web Editor (beta) by Pab [dat]</p>

          <div className="mt-4 border border-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <span>
                  Level folder{" "}
                  {levelFolderName ? (
                    <>
                      set:{" "}
                      <span className="font-semibold text-white">
                        {levelFolderName}
                      </span>
                    </>
                  ) : (
                    "not set"
                  )}
                </span>
              </div>
              <div className="flex gap-2">
                {levelFolderName && (
                  <button
                    className="text-sm text-red-300 underline"
                    onClick={async () => {
                      await store.getState().levelFolder?.forget();
                      forceUpdate((x) => x + 1);
                    }}
                  >
                    Forget
                  </button>
                )}
                <button
                  className="text-sm text-blue-300 underline"
                  onClick={async () => {
                    await store.getState().levelFolder?.pickFolder();
                    forceUpdate((x) => x + 1);
                  }}
                >
                  {levelFolderName ? "Change" : "Set"}
                </button>
              </div>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
