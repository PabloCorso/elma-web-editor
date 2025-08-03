import { create } from "zustand";
import type { Polygon, Position } from "elmajs";
import type { LevelData } from "./level-importer";

export type EditorTool = "polygon" | "select" | "apple" | "killer" | "flower";

// Tool-specific state types
export type PolygonToolState = {
  drawingPolygon: Position[];
};

export type SelectionToolState = {
  selectedVertices: Array<{ polygon: Polygon; vertex: Position }>;
  selectedObjects: Position[];
};

export type ToolState = {
  polygon: PolygonToolState;
  select: SelectionToolState;
  [toolId: string]: any; // Allow other tools to extend
};

export type Store = {
  // Level data
  polygons: Polygon[];
  apples: Position[];
  killers: Position[];
  flowers: Position[];
  start: Position;

  // Editor state
  currentTool: EditorTool;
  mousePosition: Position;

  // Camera state (matching reference editor approach)
  viewPortOffset: { x: number; y: number };
  zoom: number;

  // View settings
  animateSprites: boolean;
  showSprites: boolean;

  // Tool state (extensible)
  toolState: ToolState;

  // Fit to view trigger
  fitToViewTrigger: number;

  // Actions
  setCurrentTool: (tool: EditorTool) => void;
  activateTool: (toolId: string) => void;

  // Generic data operations
  addObject: <K extends keyof Pick<Store, "apples" | "killers" | "flowers">>(
    key: K,
    item: Position
  ) => void;
  removeObject: <K extends keyof Pick<Store, "apples" | "killers" | "flowers">>(
    key: K,
    item: Position
  ) => void;

  // Object operations
  setStart: (position: Position) => void;
  setMousePosition: (position: Position) => void;
  setCamera: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;

  // Tool state operations
  setToolState: <K extends keyof ToolState>(
    toolId: K,
    state: Partial<ToolState[K]>
  ) => void;
  getToolState: <K extends keyof ToolState>(toolId: K) => ToolState[K];

  // View operations
  toggleAnimateSprites: () => void;
  toggleShowSprites: () => void;
  importLevel: (levelData: LevelData) => void;
  triggerFitToView: () => void;
};

export const useStore = create<Store>((set, get) => ({
  // Initial state - level data will be injected via constructor
  polygons: [],
  apples: [],
  killers: [],
  flowers: [],
  start: { x: 0, y: 0 },
  currentTool: "select",
  mousePosition: { x: 0, y: 0 },
  viewPortOffset: { x: 150, y: 50 },
  zoom: 1, // Start with a lower zoom to see the full level
  animateSprites: true,
  showSprites: true,
  fitToViewTrigger: 0,

  // Tool state (extensible)
  toolState: {
    polygon: {
      drawingPolygon: [],
    },
    select: {
      selectedVertices: [],
      selectedObjects: [],
    },
  },

  // Actions
  setCurrentTool: (tool) => {
    set({ currentTool: tool });
  },

  activateTool: (toolId) => {
    // Map tool IDs to EditorTool values
    const toolMap: Record<string, EditorTool> = {
      polygon: "polygon",
      select: "select",
      apple: "apple",
      killer: "killer",
      flower: "flower",
    };

    const tool = toolMap[toolId];
    if (tool) {
      set({ currentTool: tool });
    }
  },

  // Tool state operations
  setToolState: (toolId, state) =>
    set((currentState) => ({
      toolState: {
        ...currentState.toolState,
        [toolId]: {
          ...currentState.toolState[toolId],
          ...state,
        },
      },
    })),

  getToolState: (toolId) => get().toolState[toolId],

  setStart: (position) => set({ start: position }),
  addObject: (key, item) => set((state) => ({ [key]: [...state[key], item] })),
  removeObject: (key, item) =>
    set((state) => ({
      [key]: state[key].filter((i: Position) => i !== item),
    })),

  setMousePosition: (position) => set({ mousePosition: position }),
  setCamera: (x, y) => set({ viewPortOffset: { x, y } }),
  setZoom: (zoom) => set({ zoom }),

  toggleAnimateSprites: () =>
    set((state) => ({ animateSprites: !state.animateSprites })),

  toggleShowSprites: () =>
    set((state) => ({ showSprites: !state.showSprites })),

  importLevel: (levelData) =>
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
