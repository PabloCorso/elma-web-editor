import { useCallback, useEffect, useRef, useState } from "react";
import { GearIcon, StopIcon } from "@phosphor-icons/react/dist/ssr";
import { Toolbar } from "~/components/ui/toolbar";
import { useLgrAssets } from "~/components/use-lgr-assets";
import { checkModifierKey } from "~/utils/misc";
import { PlaySettingsDialog } from "~/components/settings";
import {
  useEditorActions,
  useEditorStore,
  usePlaySettings,
} from "./use-editor-store";
import {
  DEFAULT_PLAY_MODE_ZOOM,
  PLAY_MODE_MAX_ZOOM,
  PLAY_MODE_MIN_ZOOM,
} from "./play-settings";
import { elmaLevelFromEditorState } from "./helpers/level-parser";
import { convertLevelToGameData } from "./play-mode/level-converter";
import {
  createGame,
  formatTime,
  gameFrame,
  getTimeCentiseconds,
  type GameState,
} from "./play-mode/engine/game/game-loop";
import type { LevelData } from "./play-mode/engine/level/level";
import {
  DEFAULT_KEYS,
  InputManager,
} from "./play-mode/engine/input/input-manager";
import { CanvasRenderer } from "./play-mode/engine/render/canvas-renderer";
import { ToolButton } from "~/editor/toolbars/tool";

const PLAY_MODE_WHEEL_ZOOM_STEP = 420;
const PLAY_MODE_TOUCHPAD_ZOOM_STEP = 100;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getPlayKeyBindings(playSettings: ReturnType<typeof usePlaySettings>) {
  return {
    ...DEFAULT_KEYS,
    gas: playSettings.keyBindings.throttle,
    brake: playSettings.keyBindings.brake,
    turn: playSettings.keyBindings.turn,
    leftVolt: playSettings.keyBindings.voltLeft,
    rightVolt: playSettings.keyBindings.voltRight,
    alovolt: playSettings.keyBindings.aloVolt,
    escape: "Escape",
  };
}

function getPlayInputKeys(playSettings: ReturnType<typeof usePlaySettings>) {
  return ["Enter", ...Object.values(playSettings.keyBindings).filter(Boolean)];
}

export function PlayMode() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const store = useEditorStore();
  const { lgr } = useLgrAssets();
  const playSettings = usePlaySettings();
  const gameStateRef = useRef<GameState | null>(null);
  const inputRef = useRef<InputManager | null>(null);
  const keyBindingsRef = useRef(getPlayKeyBindings(playSettings));
  const { setPlayModeZoom, stopPlayMode } = useEditorActions();
  const [playTime, setPlayTime] = useState("00:00,00");
  const [playSettingsOpen, setPlaySettingsOpen] = useState(false);

  const syncStoredZoom = useCallback(
    (nextZoom: number) => {
      setPlayModeZoom(clamp(nextZoom, PLAY_MODE_MIN_ZOOM, PLAY_MODE_MAX_ZOOM));
    },
    [setPlayModeZoom],
  );

  useEffect(
    function syncPlaySettings() {
      const nextKeyBindings = getPlayKeyBindings(playSettings);
      keyBindingsRef.current = nextKeyBindings;
      if (gameStateRef.current) {
        gameStateRef.current.keys = nextKeyBindings;
      }
      inputRef.current?.setExtraGameKeys(getPlayInputKeys(playSettings));
    },
    [playSettings],
  );

  useEffect(
    function setupPlayModeOverlay() {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      let levelData: LevelData;
      try {
        levelData = convertLevelToGameData(
          elmaLevelFromEditorState(store.getState()),
        );
      } catch (error) {
        console.error("Failed to start play mode:", error);
        stopPlayMode();
        return;
      }

      const input = new InputManager(
        getPlayInputKeys(store.getState().playSettings),
        store.getState().playModeSeedKeys,
      );
      inputRef.current = input;
      const renderer = new CanvasRenderer(canvas, lgr);
      const keyBindings = keyBindingsRef.current;

      let gameState: GameState = createGame(levelData, input, keyBindings);
      gameStateRef.current = gameState;
      gameState.lastTimestamp = performance.now();
      gameState.camera.zoom = clamp(
        store.getState().playModeZoom || DEFAULT_PLAY_MODE_ZOOM,
        PLAY_MODE_MIN_ZOOM,
        PLAY_MODE_MAX_ZOOM,
      );
      syncStoredZoom(gameState.camera.zoom);

      const resize = () => {
        renderer.resize();
      };

      const observer = new ResizeObserver(() => resize());
      observer.observe(container);
      resize();

      const handleWheel = (event: WheelEvent) => {
        const modifier = checkModifierKey(event);
        const isLikelyPinchWheel =
          event.ctrlKey && event.deltaMode === WheelEvent.DOM_DELTA_PIXEL;
        if (!modifier && !isLikelyPinchWheel) return;

        event.preventDefault();
        const zoomStepValue = isLikelyPinchWheel
          ? PLAY_MODE_TOUCHPAD_ZOOM_STEP
          : PLAY_MODE_WHEEL_ZOOM_STEP;
        const zoomFactor = Math.pow(2, -event.deltaY / zoomStepValue);
        gameState.camera.zoom = clamp(
          gameState.camera.zoom * zoomFactor,
          PLAY_MODE_MIN_ZOOM,
          PLAY_MODE_MAX_ZOOM,
        );
        syncStoredZoom(gameState.camera.zoom);
      };

      canvas.addEventListener("wheel", handleWheel, { passive: false });

      let animationFrame = 0;
      const loop = (timestamp: number) => {
        gameFrame(gameState, timestamp);
        syncStoredZoom(gameState.camera.zoom);
        setPlayTime(formatTime(getTimeCentiseconds(gameState)));
        renderer.render(gameState, {
          visibility: store.getState().levelVisibility,
        });

        if (gameState.result === "escaped") {
          stopPlayMode();
          return;
        }

        if (
          (gameState.result === "dead" || gameState.result === "won") &&
          input.wasJustPressed("Enter")
        ) {
          gameState = createGame(levelData, input, keyBindingsRef.current);
          gameStateRef.current = gameState;
          gameState.lastTimestamp = performance.now();
          gameState.camera.zoom = clamp(
            store.getState().playModeZoom || DEFAULT_PLAY_MODE_ZOOM,
            PLAY_MODE_MIN_ZOOM,
            PLAY_MODE_MAX_ZOOM,
          );
          syncStoredZoom(gameState.camera.zoom);
          setPlayTime(formatTime(getTimeCentiseconds(gameState)));
        }

        input.update();
        animationFrame = requestAnimationFrame(loop);
      };

      animationFrame = requestAnimationFrame(loop);

      return () => {
        cancelAnimationFrame(animationFrame);
        canvas.removeEventListener("wheel", handleWheel);
        observer.disconnect();
        gameStateRef.current = null;
        inputRef.current = null;
        input.destroy();
      };
    },
    [lgr, setPlayModeZoom, store, stopPlayMode, syncStoredZoom],
  );

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-20 bg-black/60 backdrop-blur-[1px]"
    >
      <div className="pointer-events-none absolute right-4 flex items-center gap-4 top-4 z-10">
        <div className="text-right text-2xl font-mono font-bold tabular-nums text-primary">
          {playTime}
        </div>
        <Toolbar className="pointer-events-auto gap-2">
          <ToolButton
            name="Play settings"
            onClick={() => setPlaySettingsOpen(true)}
          >
            <GearIcon weight="fill" />
          </ToolButton>
          <ToolButton
            name="Stop play mode"
            shortcut="Escape"
            onClick={stopPlayMode}
          >
            <StopIcon weight="fill" />
          </ToolButton>
        </Toolbar>
      </div>
      <canvas ref={canvasRef} className="block h-full w-full outline-none" />
      <PlaySettingsDialog
        open={playSettingsOpen}
        onOpenChange={setPlaySettingsOpen}
      />
    </div>
  );
}
