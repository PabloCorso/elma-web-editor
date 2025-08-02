import { create } from "zustand";
import type { Polygon, Position } from "elmajs";
import type { LevelData } from "./level-importer";

export type EditorTool = "polygon" | "select" | "apple" | "killer" | "flower";

type Store = {
  // Level data
  polygons: Polygon[];
  apples: Position[];
  killers: Position[];
  flowers: Position[];
  start: Position;

  // Editor state
  currentTool: EditorTool;
  drawingPolygon: Position[];
  mousePosition: Position;

  // Camera state
  cameraX: number;
  cameraY: number;
  zoom: number;

  // View settings
  animateSprites: boolean;
  showSprites: boolean;

  // Selection state
  selectedVertices: Array<{ polygon: Polygon; vertex: Position }>;
  selectedObjects: Position[];

  // Actions
  setCurrentTool: (tool: EditorTool) => void;
  addPolygon: (polygon: Polygon) => void;
  updatePolygon: (index: number, polygon: Polygon) => void;
  removePolygon: (index: number) => void;
  addApple: (position: Position) => void;
  addKiller: (position: Position) => void;
  addFlower: (position: Position) => void;
  setStart: (position: Position) => void;
  setDrawingPolygon: (vertices: Position[]) => void;
  setMousePosition: (position: Position) => void;
  setCamera: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;
  clearSelection: () => void;
  selectVertex: (polygon: Polygon, vertex: Position) => void;
  selectObject: (object: Position) => void;
  toggleAnimateSprites: () => void;
  toggleShowSprites: () => void;
  importLevel: (levelData: LevelData) => void;
};

export const useStore = create<Store>((set, get) => ({
  // Initial state
  polygons: [
    {
      vertices: [
        { x: 50, y: 50 },
        { x: 950, y: 50 },
        { x: 950, y: 550 },
        { x: 50, y: 550 },
      ],
      grass: false,
    },
  ],
  apples: [{ x: 500, y: 500 }],
  killers: [],
  flowers: [{ x: 900, y: 500 }],
  start: { x: 100, y: 500 },
  currentTool: "polygon",
  drawingPolygon: [],
  mousePosition: { x: 0, y: 0 },
  cameraX: 500,
  cameraY: 300,
  zoom: 1,
  animateSprites: true,
  showSprites: true,
  selectedVertices: [],
  selectedObjects: [],

  // Actions
  setCurrentTool: (tool) => {
    set({ currentTool: tool });
    // Clear drawing polygon when switching away from polygon tool
    if (tool !== "polygon") {
      set({ drawingPolygon: [] });
    }
  },

  addPolygon: (polygon) =>
    set((state) => ({ polygons: [...state.polygons, polygon] })),

  updatePolygon: (index, polygon) =>
    set((state) => ({
      polygons: state.polygons.map((p, i) => (i === index ? polygon : p)),
    })),

  removePolygon: (index) =>
    set((state) => ({
      polygons: state.polygons.filter((_, i) => i !== index),
    })),

  addApple: (position) =>
    set((state) => ({ apples: [...state.apples, position] })),

  addKiller: (position) =>
    set((state) => ({ killers: [...state.killers, position] })),

  addFlower: (position) =>
    set((state) => ({ flowers: [...state.flowers, position] })),

  setStart: (position) => set({ start: position }),
  setDrawingPolygon: (vertices) => set({ drawingPolygon: vertices }),
  setMousePosition: (position) => set({ mousePosition: position }),
  setCamera: (x, y) => set({ cameraX: x, cameraY: y }),
  setZoom: (zoom) => set({ zoom }),

  clearSelection: () => set({ selectedVertices: [], selectedObjects: [] }),

  selectVertex: (polygon, vertex) =>
    set((state) => ({
      selectedVertices: [...state.selectedVertices, { polygon, vertex }],
    })),

  selectObject: (object) =>
    set((state) => ({
      selectedObjects: [...state.selectedObjects, object],
    })),

  toggleAnimateSprites: () =>
    set((state) => ({ animateSprites: !state.animateSprites })),

  toggleShowSprites: () =>
    set((state) => ({ showSprites: !state.showSprites })),

  importLevel: (levelData: LevelData) =>
    set({
      polygons: levelData.polygons,
      apples: levelData.apples,
      killers: levelData.killers,
      flowers: levelData.flowers,
      start: levelData.start,
    }),
}));
