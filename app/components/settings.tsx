import { useEffect, useRef, useState } from "react";
import { EditorEngine } from "~/editor/editor-engine";
import {
  useEditorLevelFolderName,
  usePlaySettings,
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
import {
  defaultPlaySettings,
  type PlayKeyBindings,
} from "~/editor/play-settings";
import { IconButton } from "./ui/button";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr";

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

export function PlaySettingsDialog(props: DialogProps) {
  return (
    <Dialog {...props}>
      <DialogContent
        className="sm:max-w-3xl"
        onKeyDown={(event) => {
          // Prevent global editor shortcuts specially arrow navigation
          event.stopPropagation();
        }}
      >
        <DialogHeader showCloseButton>
          <DialogTitle>Play settings</DialogTitle>
        </DialogHeader>
        <DialogDescription className="sr-only">
          Play mode settings
        </DialogDescription>
        <DialogBody className="pb-6">
          <PlaySettingsPanel />
        </DialogBody>
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
            <TabsTrigger value="play">Play</TabsTrigger>
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

          <TabsContent value="play" className="flex flex-col gap-4">
            <PlaySettingsPanel />
          </TabsContent>

          <TabsContent value="default-level" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
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

export function PlaySettingsPanel() {
  const store = useEditorStore();
  const playSettings = usePlaySettings();
  const { setPlaySettings } = store.getState().actions;
  const setPlayKeyBinding = (
    binding: keyof PlayKeyBindings,
    nextValue: string,
  ) => {
    const nextKeyBindings: Partial<PlayKeyBindings> = {
      [binding]: nextValue,
    };

    for (const [key, value] of Object.entries(playSettings.keyBindings)) {
      if (key !== binding && value === nextValue) {
        nextKeyBindings[key as keyof PlayKeyBindings] = "";
      }
    }

    setPlaySettings({ keyBindings: nextKeyBindings });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">Controls</p>
        <IconButton
          type="button"
          size="sm"
          aria-label="Reset play defaults"
          title="Reset play defaults"
          onClick={() => setPlaySettings(defaultPlaySettings)}
        >
          <ArrowCounterClockwiseIcon />
        </IconButton>
      </div>
      <div className="grid gap-y-2 sm:grid-cols-2 sm:gap-x-32">
        <PlayKeyField
          label="Throttle"
          value={playSettings.keyBindings.throttle}
          onChange={(value) => setPlayKeyBinding("throttle", value)}
        />
        <PlayKeyField
          label="Brake"
          value={playSettings.keyBindings.brake}
          onChange={(value) => setPlayKeyBinding("brake", value)}
        />
        <PlayKeyField
          label="Rotate left"
          value={playSettings.keyBindings.voltLeft}
          onChange={(value) => setPlayKeyBinding("voltLeft", value)}
        />
        <PlayKeyField
          label="Rotate right"
          value={playSettings.keyBindings.voltRight}
          onChange={(value) => setPlayKeyBinding("voltRight", value)}
        />
        <PlayKeyField
          label="Turn"
          value={playSettings.keyBindings.turn}
          onChange={(value) => setPlayKeyBinding("turn", value)}
        />
        <PlayKeyField
          label="Alo volt"
          value={playSettings.keyBindings.aloVolt}
          onChange={(value) => setPlayKeyBinding("aloVolt", value)}
        />
      </div>
    </div>
  );
}

function PlayKeyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [isCapturing, setIsCapturing] = useState(false);

  return (
    <label className="flex justify-between items-center">
      <span className="min-w-24 text-sm">{label}</span>
      <input
        type="text"
        readOnly
        value={isCapturing ? "Press a key..." : formatPlayKeyCode(value)}
        onFocus={() => setIsCapturing(true)}
        onBlur={() => setIsCapturing(false)}
        onClick={() => setIsCapturing(true)}
        onKeyDown={(event) => {
          event.preventDefault();
          event.stopPropagation();

          if (event.code === "Escape") {
            setIsCapturing(false);
            return;
          }

          onChange(event.code);
          setIsCapturing(false);
          event.currentTarget.blur();
        }}
        className={cn(
          "w-32 rounded-md border border-separator bg-transparent px-3 py-2 text-sm",
          isCapturing && "border-blue-400 bg-blue-500/10",
        )}
      />
    </label>
  );
}

function formatPlayKeyCode(code: string) {
  if (code.startsWith("Key")) return code.slice(3);
  return code;
}

function LevelPresetPreview({ preset }: { preset: DefaultLevelPreset }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<EditorEngine | null>(null);
  const resizeFrameRef = useRef<number | null>(null);
  const lastSizeRef = useRef<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useEffect(
    function initializeLevelPresetPreview() {
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
    },
    [preset],
  );

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
