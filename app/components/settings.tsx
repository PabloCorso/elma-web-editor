import { useEffect, useRef, useState } from "react";
import { EditorEngine } from "~/editor/editor-engine";
import {
  useEditorLevelFolderName,
  useEditorStore,
} from "~/editor/use-editor-store";
import {
  useDefaultLevelPreset,
  useSetDefaultLevelPreset,
} from "~/editor/default-level-preset";
import {
  getDefaultLevel,
  type DefaultLevelPreset,
} from "~/editor/helpers/level-parser";
import { supportsFilePickers } from "~/editor/helpers/file-session";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  type DialogProps,
} from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { cn } from "~/utils/misc";
import { useForceUpdate } from "@mantine/hooks";

const LEVEL_PRESETS: Array<{
  id: DefaultLevelPreset;
  label: string;
}> = [
  { id: "default", label: "Default" },
  { id: "smibu", label: "Smibu Level Editor" },
  { id: "internal", label: "Internal Editor" },
];

export function SettingsDialog(props: DialogProps) {
  return (
    <Dialog {...props}>
      <DialogContent
        className="sm:max-w-3xl"
        onKeyDown={(event) => {
          // Prevent global editor shortcuts specially arrow navigation
          event.stopPropagation();
        }}
      >
        <SettingsPanel />
      </DialogContent>
    </Dialog>
  );
}

export function SettingsPanel() {
  const store = useEditorStore();
  const levelFolderName = useEditorLevelFolderName();
  const defaultLevelPreset = useDefaultLevelPreset();
  const setDefaultLevelPreset = useSetDefaultLevelPreset();
  const [activeTab, setActiveTab] = useState("general");
  const forceUpdate = useForceUpdate();

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <>
        <DialogHeader showCloseButton>
          <DialogTitle className="sr-only">Settings</DialogTitle>
          <TabsList>
            <TabsTrigger value="general">Settings</TabsTrigger>
            <TabsTrigger value="default-level">Default level</TabsTrigger>
          </TabsList>
        </DialogHeader>
        <DialogDescription className="sr-only">
          Application settings
        </DialogDescription>
        <DialogBody className="pb-6">
          <TabsContent value="general" className="flex flex-col gap-4">
            <p>Elma Web Editor (beta) by Pab [dat]</p>
            <p className="text-sm">
              Desktop only. See the{" "}
              <a
                href="https://github.com/PabloCorso/elma-web-editor/blob/main/CHANGELOG.md"
                target="_blank"
                rel="noreferrer"
                className="underline focus-visible:focus-ring"
              >
                CHANGELOG
              </a>{" "}
              for updates.
            </p>

            <div className="rounded-lg border border-separator p-3">
              {supportsFilePickers() ? (
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span>
                      Level folder{" "}
                      {levelFolderName ? (
                        <>
                          set:{" "}
                          <span className="font-semibold">
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
                          forceUpdate();
                        }}
                      >
                        Forget
                      </button>
                    )}
                    <button
                      className="text-sm text-blue-300 underline"
                      onClick={async () => {
                        await store.getState().levelFolder?.pickFolder();
                        forceUpdate();
                      }}
                    >
                      {levelFolderName ? "Change" : "Set"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm">
                  {`Your browser doesn't support direct folder save. Files will be
                    downloaded instead of saved in place. Currently supported in
                    Chrome and Edge.`}
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="default-level" className="space-y-4">
            <div className="space-y-1">
              <p className="font-medium">Choose starter template</p>
              <p className="text-sm text-primary/70">
                New untitled levels will start with the chosen template.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {LEVEL_PRESETS.map((preset) => {
                const isSelected = defaultLevelPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setDefaultLevelPreset(preset.id)}
                    className={cn(
                      "group relative cursor-pointer overflow-hidden rounded-xl border text-left transition-colors focus-visible:focus-ring",
                      isSelected
                        ? "border-blue-400 bg-blue-500/10"
                        : "border-separator",
                    )}
                    aria-pressed={isSelected}
                  >
                    <LevelPresetPreview preset={preset.id} />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/75 via-black/10 to-transparent px-3 py-2">
                      <div>
                        <p className="text-xs font-medium text-white/85">
                          {preset.label}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </TabsContent>
        </DialogBody>
      </>
    </Tabs>
  );
}

function LevelPresetPreview({ preset }: { preset: DefaultLevelPreset }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<EditorEngine | null>(null);
  const resizeFrameRef = useRef<number | null>(null);
  const lastSizeRef = useRef<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const applyResize = () => {
      const rect = wrapper.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      if (
        width <= 0 ||
        height <= 0 ||
        (lastSizeRef.current.width === width &&
          lastSizeRef.current.height === height)
      ) {
        return;
      }

      canvas.width = width;
      canvas.height = height;
      lastSizeRef.current = { width, height };
      engineRef.current?.fitToView();
    };

    const scheduleResize = () => {
      if (resizeFrameRef.current !== null) return;
      resizeFrameRef.current = requestAnimationFrame(() => {
        resizeFrameRef.current = null;
        applyResize();
      });
    };

    applyResize();

    engineRef.current = new EditorEngine(canvas, {
      readOnly: true,
      initialDocument: {
        level: getDefaultLevel(preset),
        origin: { kind: "default", label: "Preview", canOverwrite: false },
        displayName: "Preview",
        hasExternalHandle: false,
      },
    });

    const resizeObserver = new ResizeObserver(() => {
      scheduleResize();
    });
    resizeObserver.observe(wrapper);

    return () => {
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
      resizeObserver.disconnect();
      engineRef.current?.destroy();
      engineRef.current = null;
      lastSizeRef.current = { width: 0, height: 0 };
    };
  }, [preset]);

  return (
    <div
      ref={wrapperRef}
      className="relative aspect-[16/10] w-full min-h-[120px] bg-[#0f1720]"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}
