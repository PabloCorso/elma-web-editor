import {
  useEditorActions,
  useEditorActiveTool,
  useEditorDocumentSession,
  useEditorStore,
  useLevelName,
} from "~/editor/use-editor-store";
import { useEditorDocumentGuard } from "~/editor/document-guard";
import { getLevelSnapshot } from "~/editor/editor-store";
import logo from "../../assets/bear-helmet.png";
import {
  Toolbar,
  ToolbarButton,
  type ToolbarProps,
} from "../../components/ui/toolbar";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { DropdownMenu, DropdownMenuGroup } from "@radix-ui/react-dropdown-menu";
import {
  CaretDownIcon,
  FilePlusIcon,
  FloppyDiskIcon,
  FolderOpenIcon,
  GearIcon,
} from "@phosphor-icons/react/dist/ssr";
import {
  defaultLevel,
  editorLevelFromFile,
  elmaLevelFromEditorState,
} from "~/editor/helpers/level-parser";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { supportsFilePickers } from "~/editor/helpers/file-session";
import { SettingsDialog } from "../../components/settings";
import { Icon } from "../../components/ui/icon";
import { checkModifierKey, cn, useModifier } from "~/utils/misc";
import { LevelVisibilityControl } from "./level-visibility-control";
import { LevelPropertiesControl } from "./level-properties-control";
import type { EditorDocumentOrigin } from "~/editor/editor-state";

type HeaderToolbarProps = ToolbarProps & { isLoading?: boolean };

export function HeaderToolbar({
  className,
  isLoading,
  ...props
}: HeaderToolbarProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-4 top-4 z-10",
        className,
      )}
      {...props}
    >
      <Toolbar className="pointer-events-auto max-w-full overflow-auto sm:hidden pr-3 relative">
        <MainDropdownMenu />
        <LevelVisibilityControl />
        <LevelPropertiesControl />
        <LevelTitleInput isLoading={isLoading} />
        <LevelSaveStateIndicator />
        <LevelFileName />
      </Toolbar>

      <div className="hidden grid-cols-[120px_minmax(0,1fr)_120px] gap-4 sm:grid">
        <Toolbar className="pointer-events-auto">
          <MainDropdownMenu />
          <LevelVisibilityControl />
        </Toolbar>

        <Toolbar className="pointer-events-auto w-fit justify-self-center pr-3 relative">
          <LevelPropertiesControl />
          <LevelTitleInput isLoading={isLoading} />
          <LevelSaveStateIndicator />
          <LevelFileName />
        </Toolbar>
      </div>
    </div>
  );
}

function MainDropdownMenu() {
  const {
    replaceDocument,
    triggerFitToView,
    markDocumentSaved,
    setDocumentSaveState,
  } = useEditorActions();

  const store = useEditorStore();
  const activeTool = useEditorActiveTool();
  const { confirmDiscardChanges } = useEditorDocumentGuard();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const modifier = useModifier();
  const isPickerActionRunningRef = useRef(false);

  const runWithPickerGuard = useCallback(async <T,>(action: () => Promise<T>) => {
    if (isPickerActionRunningRef.current) {
      return undefined;
    }

    isPickerActionRunningRef.current = true;
    try {
      return await action();
    } finally {
      isPickerActionRunningRef.current = false;
    }
  }, []);

  const handleOpenFile = useCallback(async () => {
    await runWithPickerGuard(async () => {
      const shouldContinue = await confirmDiscardChanges();
      if (!shouldContinue) return;

      const fileSession = store.getState().fileSession;
      const openResult = await fileSession.open();
      if (!openResult) return;

      const fileName = openResult.fileName.endsWith(".lev")
        ? openResult.fileName
        : `${openResult.fileName}.lev`;
      const file =
        openResult.contents instanceof ArrayBuffer
          ? new File([new Uint8Array(openResult.contents)], fileName)
          : new File([openResult.contents], fileName);

      try {
        const level = await editorLevelFromFile(file);
        activeTool?.clear?.();
        replaceDocument({
          level,
          origin: { kind: "file", label: "File", canOverwrite: true },
          displayName: fileName,
          hasExternalHandle: true,
        });
        triggerFitToView();
      } catch (error) {
        alert(`Import failed: ${error instanceof Error ? error.message : error}`);
      }
    });
  }, [
    activeTool,
    confirmDiscardChanges,
    replaceDocument,
    runWithPickerGuard,
    store,
    triggerFitToView,
  ]);

  const handleNew = useCallback(async () => {
    const shouldContinue = await confirmDiscardChanges();
    if (!shouldContinue) return;

    activeTool?.clear?.();
    store.getState().fileSession.clear();
    replaceDocument({
      level: defaultLevel,
      origin: { kind: "default", label: "Untitled", canOverwrite: false },
      displayName: "Untitled",
      hasExternalHandle: false,
    });
    triggerFitToView();
  }, [
    activeTool,
    confirmDiscardChanges,
    replaceDocument,
    store,
    triggerFitToView,
  ]);

  const getSavedOrigin = (hasExternalHandle: boolean): EditorDocumentOrigin =>
    hasExternalHandle
      ? { kind: "file", label: "File", canOverwrite: true }
      : { kind: "download", label: "Downloaded file", canOverwrite: false };

  const resetSaveState = useCallback(() => {
    const dirty = store.getState().documentSession.dirty;
    setDocumentSaveState(dirty ? "dirty" : "clean");
  }, [setDocumentSaveState, store]);

  const handleSaveAs = useCallback(async () => {
    await runWithPickerGuard(async () => {
      try {
        const state = store.getState();
        const fileSession = state.fileSession;
        const baselineLevel = getLevelSnapshot(state);
        const level = elmaLevelFromEditorState(state);
        setDocumentSaveState("saving");

        const result = await fileSession.saveAs(level);
        if (!result) {
          resetSaveState();
          return;
        }

        const hasExternalHandle = result.mode === "file";
        markDocumentSaved({
          baselineLevel,
          origin: getSavedOrigin(hasExternalHandle),
          displayName:
            (hasExternalHandle ? result.fileName : undefined) ||
            `${level.name}.lev`,
          hasExternalHandle,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to save level.";
        setDocumentSaveState("error", message);
        alert(message);
      }
    });
  }, [
    markDocumentSaved,
    resetSaveState,
    runWithPickerGuard,
    setDocumentSaveState,
    store,
  ]);

  const handleSave = useCallback(async () => {
    try {
      const state = store.getState();
      const fileSession = state.fileSession;
      const baselineLevel = getLevelSnapshot(state);
      setDocumentSaveState("saving");

      if (!fileSession.hasFile) {
        return handleSaveAs();
      }

      const result = await fileSession.save();
      if (!result) {
        resetSaveState();
        return;
      }

      const hasExternalHandle = result.mode === "file";
      markDocumentSaved({
        baselineLevel,
        origin: getSavedOrigin(hasExternalHandle),
        displayName:
          (hasExternalHandle ? result.fileName : undefined) ||
          `${store.getState().levelName || "Untitled"}.lev`,
        hasExternalHandle,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save level.";
      setDocumentSaveState("error", message);
      alert(message);
    }
  }, [
    handleSaveAs,
    markDocumentSaved,
    resetSaveState,
    setDocumentSaveState,
    store,
  ]);

  useEffect(
    function registerMainMenuHotkeys() {
      const handleKeyDown = (event: KeyboardEvent) => {
        const isModifierPressed = checkModifierKey(event);
        if (!isModifierPressed) return;

        const key = event.key.toLowerCase();
        if (key === "s") {
          event.preventDefault();
          void handleSave();
          return;
        }

        if (key === "o") {
          event.preventDefault();
          void handleOpenFile();
          return;
        }

        if (key === "n") {
          event.preventDefault();
          void handleNew();
          return;
        }

        if (key === ",") {
          event.preventDefault();
          setSettingsOpen(true);
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    },
    [handleNew, handleOpenFile, handleSave],
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <ToolbarButton
            className="w-14 relative gap-0"
            aria-label="Elma Web Editor"
          >
            <span className="absolute -top-0 right-0.5 px-1 text-[8px] font-semibold bg-blue-500 rounded-full">
              BETA
            </span>
            <img src={logo} className="w-8 h-8 isolate" />
            <Icon size="xs">
              <CaretDownIcon />
            </Icon>
          </ToolbarButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-36">
          <DropdownMenuGroup>
            <DropdownMenuItem
              iconBefore={<FilePlusIcon />}
              shortcut={`${modifier} + N`}
              onClick={() => {
                void handleNew();
              }}
            >
              New
            </DropdownMenuItem>
            <DropdownMenuItem
              iconBefore={<FolderOpenIcon />}
              shortcut={`${modifier} + O`}
              onClick={() => {
                void handleOpenFile();
              }}
            >
              Open
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              iconBefore={<FloppyDiskIcon />}
              shortcut={`${modifier} + S`}
              onClick={() => {
                void handleSave();
              }}
            >
              Save
            </DropdownMenuItem>
            {supportsFilePickers() && (
              <DropdownMenuItem
                iconBefore={<FilePlusIcon />}
                onClick={() => {
                  void handleSaveAs();
                }}
              >
                Save as…
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              iconBefore={<GearIcon />}
              shortcut={`${modifier} + ,`}
              onClick={() => setSettingsOpen(true)}
            >
              Settings
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}

function LevelTitleInput({
  className,
  isLoading,
  ...props
}: React.ComponentPropsWithRef<"input"> & { isLoading?: boolean }) {
  const { setLevelName } = useEditorActions();
  const levelName = useLevelName();
  return (
    <input
      type="text"
      name="level-name"
      value={isLoading ? "" : levelName}
      onChange={(e) => setLevelName(e.target.value)}
      className={cn(
        "focus-visible:focus-ring min-w-[12rem] flex-1 px-3 py-1 bg-gray-700 text-white rounded border border-gray-600 text-sm",
        { "animate-pulse": isLoading },
        className,
      )}
      placeholder={isLoading ? "" : "Enter level name…"}
      disabled={isLoading}
      {...props}
    />
  );
}

function LevelFileName({
  className,
  ...props
}: React.ComponentPropsWithRef<"div">) {
  const documentSession = useEditorDocumentSession();
  const fileName = documentSession.hasExternalHandle
    ? documentSession.displayName
    : null;
  if (!fileName) return null;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center text-sm text-white/80",
        className,
      )}
      {...props}
    >
      <span className="max-w-[16rem] truncate rounded bg-white/5 px-2 py-1 text-white/70">
        {fileName}
      </span>
    </div>
  );
}

function LevelSaveStateIndicator({
  className,
  ...props
}: React.ComponentPropsWithRef<"span">) {
  const documentSession = useEditorDocumentSession();
  const saveStateLabel =
    documentSession.saveState === "saving"
      ? "Saving..."
      : documentSession.saveState === "error"
        ? "Save failed"
        : documentSession.dirty
          ? "Unsaved"
          : null;

  if (!saveStateLabel) return null;

  return (
    <span
      title={saveStateLabel}
      aria-label={saveStateLabel}
      className={cn(
        "bg-white shrink-0 size-2 absolute -top-0.5 -right-0.5 rounded-full",
        {
          "bg-red-400": documentSession.saveState === "error",
          "animate-pulse": documentSession.saveState === "saving",
        },

        className,
      )}
      {...props}
    />
  );
}
