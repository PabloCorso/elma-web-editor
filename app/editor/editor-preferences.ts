import { useEffect, useRef } from "react";
import type { EditorState } from "./editor-state";
import { defaultLevelVisibility } from "./level-visibility";
import {
  DEFAULT_PLAY_MODE_ZOOM,
  defaultPlaySettings,
} from "./play-mode/play-settings";
import type { EditorStore } from "./editor-store";
import {
  VERTEX_EDGE_CLICK_BEHAVIOR_STORAGE_KEY,
  type VertexEdgeClickBehavior,
} from "./edit-mode/default-level-preset";

const EDITOR_PREFERENCES_STORAGE_KEY = "elma-web-editor-preferences";
const LEGACY_SESSION_STORAGE_KEY = "elma-web-store";

type LegacyLocalStoragePlaySettings = {
  deathBehavior?: "stop" | "reset";
} & Partial<EditorState["playSettings"]>;

type PersistedEditorPreferences = {
  version: 1;
  animateSprites?: boolean;
  isUIVisible?: boolean;
  levelVisibility?: Partial<EditorState["levelVisibility"]>;
  playModeZoom?: number;
  playSettings?: LegacyLocalStoragePlaySettings;
  vertexEdgeClickBehavior?: VertexEdgeClickBehavior;
};

type LegacySessionPreferences = {
  animateSprites?: boolean;
  levelVisibility?: Partial<EditorState["levelVisibility"]>;
  playSettings?: LegacyLocalStoragePlaySettings;
};

function isClient() {
  return typeof window !== "undefined";
}

function getStoredItem(key: string) {
  if (!isClient()) return null;
  return window.localStorage.getItem(key);
}

function parseStoredItem<T>(key: string): T | null {
  const item = getStoredItem(key);
  if (!item) return null;

  try {
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Failed to parse localStorage item "${key}":`, error);
    return null;
  }
}

function getLegacyVertexEdgeClickBehaviorPreference() {
  const item = getStoredItem(VERTEX_EDGE_CLICK_BEHAVIOR_STORAGE_KEY);
  if (item === "internal" || item === "smibu") {
    return item;
  }
  return undefined;
}

function normalizePlaySettings(
  playSettings?: LegacyLocalStoragePlaySettings,
): EditorState["playSettings"] {
  return {
    ...defaultPlaySettings,
    runEndBehavior:
      playSettings?.runEndBehavior ??
      (playSettings?.deathBehavior === "reset"
        ? "restart"
        : playSettings?.deathBehavior === "stop"
          ? "pause"
          : defaultPlaySettings.runEndBehavior),
    keyBindings: {
      ...defaultPlaySettings.keyBindings,
      ...(playSettings?.keyBindings ?? {}),
    },
  };
}

function getLegacySessionPreferences() {
  const legacyPreferences =
    parseStoredItem<LegacySessionPreferences>(LEGACY_SESSION_STORAGE_KEY);

  if (!legacyPreferences) return null;

  return {
    animateSprites: legacyPreferences.animateSprites,
    levelVisibility: legacyPreferences.levelVisibility,
    playSettings: legacyPreferences.playSettings,
  };
}

export function loadEditorPreferences(): Partial<EditorState> {
  const persistedPreferences =
    parseStoredItem<PersistedEditorPreferences>(EDITOR_PREFERENCES_STORAGE_KEY);
  const legacySessionPreferences =
    persistedPreferences ? null : getLegacySessionPreferences();

  const levelVisibility =
    persistedPreferences?.levelVisibility ??
    legacySessionPreferences?.levelVisibility;
  const playSettings =
    persistedPreferences?.playSettings ?? legacySessionPreferences?.playSettings;

  return {
    animateSprites:
      persistedPreferences?.animateSprites ??
      legacySessionPreferences?.animateSprites ??
      true,
    isUIVisible: persistedPreferences?.isUIVisible ?? true,
    levelVisibility: {
      ...defaultLevelVisibility,
      ...(levelVisibility ?? {}),
    },
    playModeZoom:
      persistedPreferences?.playModeZoom ?? EditorStateDefaults.playModeZoom,
    playSettings: normalizePlaySettings(playSettings),
    vertexEdgeClickBehavior:
      persistedPreferences?.vertexEdgeClickBehavior ??
      getLegacyVertexEdgeClickBehaviorPreference() ??
      EditorStateDefaults.vertexEdgeClickBehavior,
  };
}

const EditorStateDefaults = {
  playModeZoom: DEFAULT_PLAY_MODE_ZOOM,
  vertexEdgeClickBehavior: "internal" as VertexEdgeClickBehavior,
};

function getPersistedEditorPreferences(
  state: EditorState,
): PersistedEditorPreferences {
  return {
    version: 1,
    animateSprites: state.animateSprites,
    isUIVisible: state.isUIVisible,
    levelVisibility: state.levelVisibility,
    playModeZoom: state.playModeZoom,
    playSettings: state.playSettings,
    vertexEdgeClickBehavior: state.vertexEdgeClickBehavior,
  };
}

export function useEditorPreferencesSync(
  store: EditorStore,
  key = EDITOR_PREFERENCES_STORAGE_KEY,
) {
  const lastSavedValueRef = useRef<string | null>(null);

  useEffect(
    function primeSavedPreferencesSnapshot() {
      lastSavedValueRef.current = getStoredItem(key);
    },
    [key],
  );

  useEffect(
    function syncEditorPreferencesToLocalStorage() {
      const unsubscribe = store.subscribe((state) => {
        if (!isClient()) return;

        const nextValue = JSON.stringify(getPersistedEditorPreferences(state));
        if (lastSavedValueRef.current === nextValue) return;

        try {
          window.localStorage.setItem(key, nextValue);
          lastSavedValueRef.current = nextValue;
        } catch (error) {
          console.error(
            "Failed to save editor preferences to localStorage:",
            error,
          );
        }
      });

      return unsubscribe;
    },
    [store, key],
  );
}
