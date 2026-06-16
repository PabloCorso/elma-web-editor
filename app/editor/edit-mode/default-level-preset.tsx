import { useLocalStorage } from "@mantine/hooks";
import { createContext, useContext } from "react";
import type { EditorLevel } from "~/editor/elma-types";
import type { DefaultLevelPreset } from "~/editor/helpers/level-parser";

export const DEFAULT_LEVEL_PRESET_STORAGE_KEY = "elma-web-default-level-preset";
export const CUSTOM_DEFAULT_LEVEL_TEMPLATE_STORAGE_KEY =
  "elma-web-custom-default-level-template";

type DefaultLevelPresetContextValue = {
  defaultLevelPreset: DefaultLevelPreset;
  setDefaultLevelPreset: (preset: DefaultLevelPreset) => void;
  customDefaultLevelTemplate: EditorLevel | null;
  setCustomDefaultLevelTemplate: (level: EditorLevel | null) => void;
};

function isDefaultLevelPreset(value: string): value is DefaultLevelPreset {
  return value === "default" || value === "custom";
}

const DefaultLevelPresetContext =
  createContext<DefaultLevelPresetContextValue | null>(null);

export function DefaultLevelPresetProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [defaultLevelPreset, setDefaultLevelPreset] = useLocalStorage<string>({
    key: DEFAULT_LEVEL_PRESET_STORAGE_KEY,
    defaultValue: "default",
    getInitialValueInEffect: false,
  });
  const [customDefaultLevelTemplate, setCustomDefaultLevelTemplate] =
    useLocalStorage<EditorLevel | null>({
      key: CUSTOM_DEFAULT_LEVEL_TEMPLATE_STORAGE_KEY,
      defaultValue: null,
      getInitialValueInEffect: false,
    });
  const safeDefaultLevelPreset =
    isDefaultLevelPreset(defaultLevelPreset) &&
    (defaultLevelPreset !== "custom" || customDefaultLevelTemplate)
      ? defaultLevelPreset
      : "default";

  return (
    <DefaultLevelPresetContext.Provider
      value={{
        defaultLevelPreset: safeDefaultLevelPreset,
        setDefaultLevelPreset,
        customDefaultLevelTemplate,
        setCustomDefaultLevelTemplate,
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

export function useCustomDefaultLevelTemplate() {
  return useDefaultLevelPresetContext().customDefaultLevelTemplate;
}

export function useSetCustomDefaultLevelTemplate() {
  return useDefaultLevelPresetContext().setCustomDefaultLevelTemplate;
}
