import { create, type StoreApi } from "zustand";
import type { Polygon, Position } from "elmajs";
import type { LevelData } from "./level-importer";

// Tool-specific state types
export type PolygonToolState = {
  drawingPolygon: Position[];
  originalPolygon?: Polygon; // The polygon being edited (if any)
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

export type EditorState = {
  // Level data
  levelName: string;
  polygons: Polygon[];
  apples: Position[];
  killers: Position[];
  flowers: Position[];
  start: Position;

  // Editor state
  currentToolId: string;
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
  setCurrentToolId: (toolId: string) => void;
  activateTool: (toolId: string) => void;

  // Generic data operations
  addObject: <
    K extends keyof Pick<EditorState, "apples" | "killers" | "flowers">,
  >(
    key: K,
    item: Position
  ) => void;
  removeObject: <
    K extends keyof Pick<EditorState, "apples" | "killers" | "flowers">,
  >(
    key: K,
    item: Position
  ) => void;

  // Object operations
  setLevelName: (name: string) => void;
  setStart: (position: Position) => void;
  setMousePosition: (position: Position) => void;
  setCamera: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;
  setPolygons: (polygons: Polygon[]) => void;

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

export type EditorStore = StoreApi<EditorState>;

type CreateEditorStoreOptions = {
  initialToolId?: string;
  defaultLevelTitle?: string;
};

export function createEditorStore({
  initialToolId = "select",
  defaultLevelTitle = "Untitled",
}: CreateEditorStoreOptions = {}): EditorStore {
  return create<EditorState>((set, get) => ({
    // Initial state - level data will be injected via constructor
    levelName: defaultLevelTitle,
    polygons: [],
    apples: [],
    killers: [],
    flowers: [],
    start: { x: 0, y: 0 },

    // Editor state
    currentToolId: initialToolId,
    mousePosition: { x: 0, y: 0 },

    // Camera state
    viewPortOffset: { x: 0, y: 0 },
    zoom: 1,

    // View settings
    animateSprites: true,
    showSprites: true,

    // Tool state
    toolState: {
      polygon: {
        drawingPolygon: [],
        originalPolygon: undefined,
      },
      select: {
        selectedVertices: [],
        selectedObjects: [],
      },
    },

    // Fit to view trigger
    fitToViewTrigger: 0,

    // Actions
    setCurrentToolId: (toolId) => set({ currentToolId: toolId }),

    activateTool: (toolId) => {
      // This will be handled by the ToolRegistry
      set({ currentToolId: toolId });
    },

    // Generic data operations
    addObject: (key, item) =>
      set((state) => ({
        [key]: [...state[key], item],
      })),

    removeObject: (key, item) =>
      set((state) => ({
        [key]: state[key].filter(
          (existing: Position) => existing.x !== item.x || existing.y !== item.y
        ),
      })),

    // Object operations
    setLevelName: (name) => set({ levelName: name }),
    setStart: (position) => set({ start: position }),
    setMousePosition: (position) => set({ mousePosition: position }),
    setCamera: (x, y) => set({ viewPortOffset: { x, y } }),
    setZoom: (zoom) => set({ zoom }),
    setPolygons: (polygons) => set({ polygons }),

    // Tool state operations
    setToolState: (toolId, state) =>
      set((prev) => ({
        toolState: {
          ...prev.toolState,
          [toolId]: { ...prev.toolState[toolId], ...state },
        },
      })),

    getToolState: (toolId) => get().toolState[toolId],

    // View operations
    toggleAnimateSprites: () =>
      set((state) => ({ animateSprites: !state.animateSprites })),

    toggleShowSprites: () =>
      set((state) => ({ showSprites: !state.showSprites })),

    importLevel: (levelData) =>
      set({
        levelName: levelData.name || defaultLevelTitle,
        polygons: levelData.polygons,
        apples: levelData.apples,
        killers: levelData.killers,
        flowers: levelData.flowers,
        start: levelData.start,
      }),

    triggerFitToView: () =>
      set((state) => ({ fitToViewTrigger: state.fitToViewTrigger + 1 })),
  }));
}
