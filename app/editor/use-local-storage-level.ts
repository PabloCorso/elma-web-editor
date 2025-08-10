import { useEffect } from "react";
import type { EditorStore } from "./editor-store";
import type { Position, Polygon } from "elmajs";
import { useLocalStorage } from "@mantine/hooks";
import { initialLevelData, type LevelData } from "./level-importer";

type LocalStorageLevel = {
  polygons: Polygon[];
  apples: Position[];
  killers: Position[];
  flowers: Position[];
  start: Position;
};

export function useLocalStorageLevel(
  store: EditorStore | null,
  key = "elma-web-level"
) {
  const [hasLoadedFromStorage, setHasLoadedFromStorage] =
    useLocalStorage<boolean>({
      key: "elma-web-level-loaded",
      defaultValue: false,
      getInitialValueInEffect: true,
    });
  const [levelData, setLevelData] = useLocalStorage<LevelData>({
    key: "elma-web-level",
    defaultValue: initialLevelData,
    getInitialValueInEffect: true,
  });

  // Load from localStorage when store becomes available
  useEffect(
    function loadLevelFromLocalStorage() {
      if (!store || hasLoadedFromStorage) return;

      const item = localStorage.getItem(key);
      if (item) {
        try {
          const level = JSON.parse(item) as LocalStorageLevel;
          store.setState({
            polygons: level.polygons,
            apples: level.apples,
            killers: level.killers,
            flowers: level.flowers,
            start: level.start,
          });
        } catch (error) {
          console.error("Failed to load level from localStorage:", error);
        }
      }
      setHasLoadedFromStorage(true);
    },
    [store, key, hasLoadedFromStorage]
  );

  // Subscribe to store changes and save to localStorage
  useEffect(
    function saveLevelToLocalStorage() {
      if (!store || !hasLoadedFromStorage) return;

      const unsubscribe = store.subscribe((state) => {
        const levelData = {
          polygons: state.polygons,
          apples: state.apples,
          killers: state.killers,
          flowers: state.flowers,
          start: state.start,
        };

        try {
          localStorage.setItem(key, JSON.stringify(levelData));
        } catch (error) {
          console.error("Failed to save level to localStorage:", error);
        }
      });

      return () => unsubscribe();
    },
    [store, key, hasLoadedFromStorage]
  );
}
