import { useEffect, useRef } from "react";
import type { EditorState, EditorStore } from "./editor-store";

type LocalStorageLevel = Pick<
  EditorState,
  | "levelName"
  | "polygons"
  | "apples"
  | "killers"
  | "flowers"
  | "start"
  | "activeToolId"
  | "animateSprites"
  | "showSprites"
  | "viewPortOffset"
  | "zoom"
>;

export function useLocalStorageSync(
  store: EditorStore,
  key = "elma-web-store"
) {
  const isInitializedRef = useRef(false);

  // Load from localStorage on mount (only once)
  useEffect(() => {
    if (isInitializedRef.current) return;

    const item = localStorage.getItem(key);
    if (item) {
      try {
        const savedData = JSON.parse(item) as LocalStorageLevel;

        // Import the level data into the store
        store.getState().importLevel({
          name: savedData.levelName,
          polygons: savedData.polygons,
          apples: savedData.apples,
          killers: savedData.killers,
          flowers: savedData.flowers,
          start: savedData.start,
        });

        // Restore other state
        store.setState({
          activeToolId: savedData.activeToolId || "polygon",
          animateSprites: savedData.animateSprites ?? true,
          showSprites: savedData.showSprites ?? true,
          viewPortOffset: savedData.viewPortOffset || { x: 0, y: 0 },
          zoom: savedData.zoom || 1,
        });
      } catch (error) {
        console.error("Failed to load level from localStorage:", error);
      }
    }

    isInitializedRef.current = true;
  }, [store, key]);

  // Save to localStorage whenever relevant state changes
  useEffect(() => {
    if (!isInitializedRef.current) return;

    const unsubscribe = store.subscribe((state) => {
      const levelData: LocalStorageLevel = {
        levelName: state.levelName,
        polygons: state.polygons,
        apples: state.apples,
        killers: state.killers,
        flowers: state.flowers,
        start: state.start,
        activeToolId: state.activeToolId,
        animateSprites: state.animateSprites,
        showSprites: state.showSprites,
        viewPortOffset: state.viewPortOffset,
        zoom: state.zoom,
      };

      try {
        localStorage.setItem(key, JSON.stringify(levelData));
      } catch (error) {
        console.error("Failed to save level to localStorage:", error);
      }
    });

    return () => unsubscribe();
  }, [store, key]);

  return {
    isInitialized: isInitializedRef.current,
  };
}

// Helper function to load level data from localStorage without a store
export function loadLevelFromLocalStorage(key = "elma-web-store") {
  const item = localStorage.getItem(key);
  if (!item) return null;

  try {
    const savedData = JSON.parse(item) as LocalStorageLevel;
    return {
      name: savedData.levelName,
      polygons: savedData.polygons,
      apples: savedData.apples,
      killers: savedData.killers,
      flowers: savedData.flowers,
      start: savedData.start,
    };
  } catch (error) {
    console.error("Failed to load level from localStorage:", error);
    return null;
  }
}
