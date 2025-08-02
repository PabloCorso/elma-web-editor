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

  // Camera state (matching reference editor approach)
  viewPortOffset: { x: number; y: number };
  zoom: number;

  // View settings
  animateSprites: boolean;
  showSprites: boolean;

  // Selection state
  selectedVertices: Array<{ polygon: Polygon; vertex: Position }>;
  selectedObjects: Position[];

  // Fit to view trigger
  fitToViewTrigger: number;

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
  updateSelectedVertices: (newPositions: Position[]) => void;
  updateSelectedObjects: (newPositions: Position[]) => void;
  toggleAnimateSprites: () => void;
  toggleShowSprites: () => void;
  importLevel: (levelData: LevelData) => void;
  triggerFitToView: () => void;
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
  viewPortOffset: { x: 150, y: 50 },
  zoom: 1, // Start with a lower zoom to see the full level
  animateSprites: true,
  showSprites: true,
  selectedVertices: [],
  selectedObjects: [],
  fitToViewTrigger: 0,

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
  setCamera: (x, y) => set({ viewPortOffset: { x, y } }),
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

  updateSelectedVertices: (newPositions) =>
    set((state) => {
      const updatedPolygons = [...state.polygons];
      const updatedSelectedVertices = [...state.selectedVertices];

      // Update each selected vertex with its new position
      state.selectedVertices.forEach((selection, index) => {
        const polygonIndex = updatedPolygons.findIndex(p => p === selection.polygon);
        if (polygonIndex !== -1) {
          const vertexIndex = updatedPolygons[polygonIndex].vertices.findIndex(
            v => v === selection.vertex
          );
          if (vertexIndex !== -1) {
            updatedPolygons[polygonIndex].vertices[vertexIndex] = newPositions[index];
            updatedSelectedVertices[index] = {
              polygon: updatedPolygons[polygonIndex],
              vertex: newPositions[index]
            };
          }
        }
      });

      return {
        polygons: updatedPolygons,
        selectedVertices: updatedSelectedVertices
      };
    }),

  updateSelectedObjects: (newPositions) =>
    set((state) => {
      const updatedApples = [...state.apples];
      const updatedKillers = [...state.killers];
      const updatedFlowers = [...state.flowers];
      const updatedStart = { ...state.start };
      const updatedSelectedObjects = [...state.selectedObjects];

      // Update each selected object with its new position
      state.selectedObjects.forEach((object, index) => {
        const newPos = newPositions[index];
        
        // Find and update the object in the appropriate array
        const appleIndex = updatedApples.findIndex(a => a === object);
        if (appleIndex !== -1) {
          updatedApples[appleIndex] = newPos;
          updatedSelectedObjects[index] = newPos;
        }

        const killerIndex = updatedKillers.findIndex(k => k === object);
        if (killerIndex !== -1) {
          updatedKillers[killerIndex] = newPos;
          updatedSelectedObjects[index] = newPos;
        }

        const flowerIndex = updatedFlowers.findIndex(f => f === object);
        if (flowerIndex !== -1) {
          updatedFlowers[flowerIndex] = newPos;
          updatedSelectedObjects[index] = newPos;
        }

        // Check if it's the start position
        if (object === state.start) {
          updatedStart.x = newPos.x;
          updatedStart.y = newPos.y;
          updatedSelectedObjects[index] = updatedStart;
        }
      });

      return {
        apples: updatedApples,
        killers: updatedKillers,
        flowers: updatedFlowers,
        start: updatedStart,
        selectedObjects: updatedSelectedObjects
      };
    }),

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

  triggerFitToView: () =>
    set((state) => ({ fitToViewTrigger: state.fitToViewTrigger + 1 })),
}));
