import { createContext, useContext, useRef } from "react";
import { useStore as useZustand, type StoreApi } from "zustand";
import { type EditorState } from "./editor-state";
import { createEditorStore } from "./editor-store";
import type { ToolState } from "./tools/tool-interface";

const EditorStoreContext = createContext<EditorStore | null>(null);

export type EditorStore = StoreApi<EditorState>;

export const EditorStoreProvider = ({
  initialToolId = "select",
  children,
}: {
  initialToolId?: string;
  children: React.ReactNode;
}) => {
  const storeRef = useRef<EditorStore>();
  if (!storeRef.current) {
    storeRef.current = createEditorStore({ initialToolId });
  }

  return (
    <EditorStoreContext.Provider value={storeRef.current!}>
      {children}
    </EditorStoreContext.Provider>
  );
};

export function useEditorStoreInstance() {
  const store = useContext(EditorStoreContext);
  if (!store) {
    throw new Error(
      "useEditorStoreInstance must be used within a StoreProvider"
    );
  }
  return store;
}

export function useEditorStore<T>(selector: (s: EditorState) => T) {
  const store = useContext(EditorStoreContext);
  if (!store) {
    throw new Error("useEditorStore must be used within a StoreProvider");
  }
  return useZustand(store, selector);
}

export function useLevelName() {
  return useEditorStore((state) => state.levelName);
}

export function useZoom() {
  return useEditorStore((state) => state.zoom);
}

export function useEditorActions() {
  return useEditorStore((state) => state.actions);
}

export function useEditorActiveTool() {
  return useEditorStore((state) => state.actions.getActiveTool());
}

export function useEditorToolState<T extends ToolState>(
  toolId: string
): T | undefined {
  return useEditorStore((state) => state.actions.getToolState<T>(toolId));
}

export function useEditorWidget<T>(widgetId: string): T | undefined {
  return useEditorStore(
    (state) => state.widgetsMap.get(widgetId) as T | undefined
  );
}

export function useEditorLevelFolderName() {
  return useEditorStore((state) =>
    state.levelFolder?.hasFolder() ? state.levelFolder.name : null
  );
}
