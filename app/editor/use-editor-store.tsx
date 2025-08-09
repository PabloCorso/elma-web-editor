import { createContext, useContext, useRef } from "react";
import { useStore as useZustand } from "zustand";
import {
  createEditorStore,
  type EditorState,
  type EditorStore,
} from "./editor-store";

const StoreContext = createContext<EditorStore | null>(null);

export const EditorStoreProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const storeRef = useRef<EditorStore>();
  if (!storeRef.current) storeRef.current = createEditorStore();
  const store = storeRef.current;
  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
};

export function useEditorStoreApi() {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error("useEditorStoreApi must be used within a StoreProvider");
  }
  return store;
}

export function useEditorStore<T>(selector: (s: EditorState) => T) {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error("useEditorStore must be used within a StoreProvider");
  }
  return useZustand(store, selector);
}
