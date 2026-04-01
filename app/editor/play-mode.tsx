import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowsClockwiseIcon,
  ArrowDownIcon,
  ArrowBendUpLeftIcon,
  ArrowBendUpRightIcon,
  ArrowUpIcon,
  GearIcon,
  GameControllerIcon,
  ArrowsLeftRightIcon,
  MinusIcon,
  PlusIcon,
  StopIcon,
  ArrowBendDoubleUpRightIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Toolbar, type ToolbarProps } from "~/components/ui/toolbar";
import { useLgrAssets } from "~/components/use-lgr-assets";
import { checkModifierKey, cn } from "~/utils/misc";
import { PlaySettingsDialog } from "~/components/settings";
import { Button } from "~/components/ui/button";
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
import { createPlayModeRenderer } from "./play-mode/engine/render/renderer";
import { ToolButton } from "~/editor/toolbars/tool";

const PLAY_MODE_WHEEL_ZOOM_STEP = 420;
const PLAY_MODE_TOUCHPAD_ZOOM_STEP = 100;
const PLAY_MODE_BUTTON_ZOOM_FACTOR = 1.2;
const PLAY_MODE_MOBILE_CONTROL_IDS = [
  "gas",
  "brake",
  "turn",
  "leftVolt",
  "rightVolt",
  "alovolt",
] as const;

type PlayModeMobileControlId = (typeof PLAY_MODE_MOBILE_CONTROL_IDS)[number];
type PlayModeMobileControlState = Record<PlayModeMobileControlId, boolean>;

const INITIAL_PLAY_MODE_MOBILE_CONTROL_STATE: PlayModeMobileControlState = {
  gas: false,
  brake: false,
  turn: false,
  leftVolt: false,
  rightVolt: false,
  alovolt: false,
};

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

function getActiveMobileControlState(
  input: InputManager,
  keyBindings: ReturnType<typeof getPlayKeyBindings>,
): PlayModeMobileControlState {
  return {
    gas: input.isDown(keyBindings.gas),
    brake: input.isDown(keyBindings.brake),
    turn: input.isDown(keyBindings.turn),
    leftVolt: input.isDown(keyBindings.leftVolt),
    rightVolt: input.isDown(keyBindings.rightVolt),
    alovolt: input.isDown(keyBindings.alovolt),
  };
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
  const restartRequestedRef = useRef(false);
  const { setPlayModeZoom, stopPlayMode } = useEditorActions();
  const [playTime, setPlayTime] = useState("00:00,00");
  const [playSettingsOpen, setPlaySettingsOpen] = useState(false);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(pointer: coarse)").matches;
  });
  const [activeMobileControls, setActiveMobileControls] =
    useState<PlayModeMobileControlState>(
      INITIAL_PLAY_MODE_MOBILE_CONTROL_STATE,
    );

  const syncStoredZoom = useCallback(
    (nextZoom: number) => {
      setPlayModeZoom(clamp(nextZoom, PLAY_MODE_MIN_ZOOM, PLAY_MODE_MAX_ZOOM));
    },
    [setPlayModeZoom],
  );

  const updateCameraZoom = useCallback(
    (updateZoom: (currentZoom: number) => number) => {
      const gameState = gameStateRef.current;
      if (!gameState) return;

      gameState.camera.zoom = clamp(
        updateZoom(gameState.camera.zoom),
        PLAY_MODE_MIN_ZOOM,
        PLAY_MODE_MAX_ZOOM,
      );
      syncStoredZoom(gameState.camera.zoom);
    },
    [syncStoredZoom],
  );

  const zoomIn = useCallback(() => {
    updateCameraZoom(
      (currentZoom) => currentZoom * PLAY_MODE_BUTTON_ZOOM_FACTOR,
    );
  }, [updateCameraZoom]);

  const zoomOut = useCallback(() => {
    updateCameraZoom(
      (currentZoom) => currentZoom / PLAY_MODE_BUTTON_ZOOM_FACTOR,
    );
  }, [updateCameraZoom]);

  const releaseMobileControls = useCallback(() => {
    inputRef.current?.releaseKeys(
      PLAY_MODE_MOBILE_CONTROL_IDS.map(
        (controlId) => keyBindingsRef.current[controlId],
      ),
    );
    setActiveMobileControls(INITIAL_PLAY_MODE_MOBILE_CONTROL_STATE);
  }, []);

  const setMobileControlPressed = useCallback(
    (controlId: PlayModeMobileControlId, isPressed: boolean) => {
      const input = inputRef.current;
      if (!input) return;

      const keyCode = keyBindingsRef.current[controlId];
      if (isPressed) {
        input.pressKey(keyCode);
      } else {
        input.releaseKey(keyCode);
      }

      setActiveMobileControls((currentState) => {
        if (currentState[controlId] === isPressed) return currentState;
        return { ...currentState, [controlId]: isPressed };
      });
    },
    [],
  );

  const toggleMobileControls = useCallback(() => {
    setMobileControlsOpen((isOpen) => {
      if (isOpen) {
        releaseMobileControls();
      }
      return !isOpen;
    });
  }, [releaseMobileControls]);

  const restartPlayMode = useCallback(() => {
    restartRequestedRef.current = true;
  }, []);

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
      const renderer = createPlayModeRenderer({ canvas, lgrAssets: lgr });
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

      const resetGame = () => {
        releaseMobileControls();
        gameState = createGame(levelData, input, keyBindingsRef.current);
        gameStateRef.current = gameState;
        gameState.lastTimestamp = performance.now();
        gameState.camera.zoom = clamp(
          store.getState().playModeZoom || DEFAULT_PLAY_MODE_ZOOM,
          PLAY_MODE_MIN_ZOOM,
          PLAY_MODE_MAX_ZOOM,
        );
        restartRequestedRef.current = false;
        syncStoredZoom(gameState.camera.zoom);
        setPlayTime(formatTime(getTimeCentiseconds(gameState)));
      };

      let animationFrame = 0;
      const loop = (timestamp: number) => {
        if (restartRequestedRef.current || input.wasJustPressed("Enter")) {
          resetGame();
        }

        gameFrame(gameState, timestamp);
        syncStoredZoom(gameState.camera.zoom);
        setActiveMobileControls((currentState) => {
          const nextState = getActiveMobileControlState(
            input,
            keyBindingsRef.current,
          );
          for (const controlId of PLAY_MODE_MOBILE_CONTROL_IDS) {
            if (currentState[controlId] !== nextState[controlId]) {
              return nextState;
            }
          }
          return currentState;
        });
        setPlayTime(formatTime(getTimeCentiseconds(gameState)));
        renderer.render(gameState, {
          visibility: store.getState().levelVisibility,
        });

        if (gameState.result === "escaped") {
          stopPlayMode();
          return;
        }

        input.update();
        animationFrame = requestAnimationFrame(loop);
      };

      animationFrame = requestAnimationFrame(loop);

      return () => {
        cancelAnimationFrame(animationFrame);
        canvas.removeEventListener("wheel", handleWheel);
        observer.disconnect();
        releaseMobileControls();
        restartRequestedRef.current = false;
        gameStateRef.current = null;
        inputRef.current = null;
        input.destroy();
      };
    },
    [
      lgr,
      releaseMobileControls,
      setPlayModeZoom,
      store,
      stopPlayMode,
      syncStoredZoom,
    ],
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
          <ToolButton name="Restart run" onClick={restartPlayMode}>
            <ArrowsClockwiseIcon weight="fill" />
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
      <div className="pointer-events-none absolute right-4 bottom-4 z-10 flex items-center gap-2">
        <PlayModeToolbarGroup className="pointer-events-auto">
          <PlayModeToolbarButton
            name="Zoom In"
            shortcut="+ / ="
            onClick={zoomIn}
          >
            <PlusIcon />
          </PlayModeToolbarButton>
          <PlayModeToolbarButton name="Zoom Out" shortcut="-" onClick={zoomOut}>
            <MinusIcon />
          </PlayModeToolbarButton>
        </PlayModeToolbarGroup>
        <PlayModeToolbarGroup className="pointer-events-auto">
          <PlayModeToolbarButton
            name={
              mobileControlsOpen
                ? "Hide mobile controls"
                : "Show mobile controls"
            }
            onClick={toggleMobileControls}
          >
            <GameControllerIcon />
          </PlayModeToolbarButton>
        </PlayModeToolbarGroup>
      </div>
      {mobileControlsOpen ? (
        <PlayModeMobileControls
          activeControls={activeMobileControls}
          onControlChange={setMobileControlPressed}
        />
      ) : null}
      <canvas ref={canvasRef} className="block h-full w-full outline-none" />
      <PlaySettingsDialog
        open={playSettingsOpen}
        onOpenChange={setPlaySettingsOpen}
      />
    </div>
  );
}

function PlayModeToolbarGroup({ className, ...props }: ToolbarProps) {
  return (
    <Toolbar className={cn("gap-0 rounded-full p-0", className)} {...props} />
  );
}

function PlayModeToolbarButton({
  className,
  ...props
}: React.ComponentProps<typeof ToolButton>) {
  return (
    <ToolButton
      className={cn(
        "rounded-none peer peer-[button]:border-l peer-[button]:border-separator/40",
        "first-of-type:rounded-l-full last-of-type:rounded-r-full only-of-type:rounded-full",
        "first-of-type:*:translate-x-px last-of-type:*:-translate-x-px only-of-type:*:translate-x-0",
        className,
      )}
      size="sm"
      iconSize="sm"
      {...props}
    />
  );
}

type PlayModeMobileControlsProps = {
  activeControls: PlayModeMobileControlState;
  onControlChange: (
    controlId: PlayModeMobileControlId,
    isPressed: boolean,
  ) => void;
};

function PlayModeMobileControls({
  activeControls,
  onControlChange,
}: PlayModeMobileControlsProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-20 z-10 flex items-end justify-between px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto flex flex-col items-start gap-2 sm:gap-3">
        <MobileDriveButton
          label="Turn"
          icon={<ArrowsLeftRightIcon weight="bold" />}
          isActive={activeControls.turn}
          onPressedChange={(isPressed) => onControlChange("turn", isPressed)}
        />
        <div className="flex items-end gap-2 sm:gap-3">
          <MobileDriveButton
            label="Rotate left"
            icon={<ArrowBendUpLeftIcon weight="bold" />}
            isActive={activeControls.leftVolt}
            onPressedChange={(isPressed) =>
              onControlChange("leftVolt", isPressed)
            }
          />
          <MobileDriveButton
            label="Rotate right"
            icon={<ArrowBendUpRightIcon weight="bold" />}
            isActive={activeControls.rightVolt}
            onPressedChange={(isPressed) =>
              onControlChange("rightVolt", isPressed)
            }
          />
          <MobileDriveButton
            label="Alo volt"
            icon={<ArrowBendDoubleUpRightIcon weight="bold" />}
            isActive={activeControls.alovolt}
            onPressedChange={(isPressed) =>
              onControlChange("alovolt", isPressed)
            }
          />
        </div>
      </div>
      <div className="pointer-events-auto flex items-end gap-2 sm:gap-3">
        <div className="flex flex-col gap-2 sm:gap-3">
          <MobileDriveButton
            label="Throttle"
            icon={<ArrowUpIcon weight="bold" />}
            isActive={activeControls.gas}
            onPressedChange={(isPressed) => onControlChange("gas", isPressed)}
          />
          <MobileDriveButton
            label="Brake"
            icon={<ArrowDownIcon weight="bold" />}
            isActive={activeControls.brake}
            onPressedChange={(isPressed) => onControlChange("brake", isPressed)}
          />
        </div>
      </div>
    </div>
  );
}

type MobileDriveButtonProps = {
  className?: string;
  icon: React.ReactNode;
  isActive: boolean;
  label: string;
  onPressedChange: (isPressed: boolean) => void;
};

function MobileDriveButton({
  className,
  icon,
  isActive,
  label,
  onPressedChange,
}: MobileDriveButtonProps) {
  return (
    <Button
      type="button"
      iconOnly
      iconSize="lg"
      aria-label={label}
      title={label}
      iconBefore={icon}
      className={cn(
        "h-16 w-16",
        "touch-none rounded-full bg-screen/80",
        { "bg-primary-active": isActive },
        className,
      )}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        onPressedChange(true);
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        onPressedChange(false);
      }}
      onPointerCancel={() => onPressedChange(false)}
      onLostPointerCapture={() => onPressedChange(false)}
    />
  );
}
