import { useLocalStorage } from "@mantine/hooks";
import { createContext, useContext } from "react";
import type { DefaultLevelPreset } from "./helpers/level-parser";

export const DEFAULT_LEVEL_PRESET_STORAGE_KEY = "elma-web-default-level-preset";
export const VERTEX_EDGE_CLICK_BEHAVIOR_STORAGE_KEY =
  "elma-web-vertex-edge-click-behavior";

export type VertexEdgeClickBehavior = "internal" | "smibu";

type DefaultLevelPresetContextValue = {
  defaultLevelPreset: DefaultLevelPreset;
  setDefaultLevelPreset: (preset: DefaultLevelPreset) => void;
  vertexEdgeClickBehavior: VertexEdgeClickBehavior;
  setVertexEdgeClickBehavior: (behavior: VertexEdgeClickBehavior) => void;
};

const DefaultLevelPresetContext =
  createContext<DefaultLevelPresetContextValue | null>(null);

export function DefaultLevelPresetProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [defaultLevelPreset, setDefaultLevelPreset] =
    useLocalStorage<DefaultLevelPreset>({
      key: DEFAULT_LEVEL_PRESET_STORAGE_KEY,
      defaultValue: "default",
      getInitialValueInEffect: false,
    });
  const [vertexEdgeClickBehavior, setVertexEdgeClickBehavior] =
    useLocalStorage<VertexEdgeClickBehavior>({
      key: VERTEX_EDGE_CLICK_BEHAVIOR_STORAGE_KEY,
      defaultValue: "internal",
      getInitialValueInEffect: false,
    });

  return (
    <DefaultLevelPresetContext.Provider
      value={{
        defaultLevelPreset,
        setDefaultLevelPreset,
        vertexEdgeClickBehavior,
        setVertexEdgeClickBehavior,
      }}
    >
      {children}
    </DefaultLevelPresetContext.Provider>
  );
}

function useDefaultLevelPresetContext() {
  const context = useContext(DefaultLevelPresetContext);
  if (!context) {
    throw new Error(
      "Default level preset hooks must be used within <DefaultLevelPresetProvider />",
    );
  }
  return context;
}

export function useDefaultLevelPreset() {
  return useDefaultLevelPresetContext().defaultLevelPreset;
}

export function useSetDefaultLevelPreset() {
  return useDefaultLevelPresetContext().setDefaultLevelPreset;
}

export function useVertexEdgeClickBehavior() {
  return useDefaultLevelPresetContext().vertexEdgeClickBehavior;
}

export function useSetVertexEdgeClickBehavior() {
  return useDefaultLevelPresetContext().setVertexEdgeClickBehavior;
}
