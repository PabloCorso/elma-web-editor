import { create, type StoreApi } from "zustand";
import type { Polygon, Position } from "elmajs";
import type { LevelData } from "./level-importer";
import type { Tool } from "./tools/tool-interface";

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

  // Fit to view trigger
  fitToViewTrigger: number;

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

  // Tools
  toolsMap: Map<string, Tool>;
  toolState: ToolState;

  registerTool: (tool: Tool) => void;
  activateTool: (toolId: string) => void;
  getActiveTool: () => Tool | undefined;
  getTool: (toolId: string) => Tool | undefined;

  getToolState: <K extends keyof ToolState>(toolId: K) => ToolState[K];
  setToolState: <K extends keyof ToolState>(
    toolId: K,
    state: Partial<ToolState[K]>
  ) => void;

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

    // Fit to view trigger
    fitToViewTrigger: 0,

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

    // Tool state
    toolsMap: new Map<string, Tool>(),
    toolState: {
      polygon: { drawingPolygon: [], originalPolygon: undefined },
      select: { selectedVertices: [], selectedObjects: [] },
    },

    registerTool: (tool) =>
      set((prev) => ({
        toolsMap: prev.toolsMap.set(tool.id, tool),
      })),
    activateTool: (toolId: string) => {
      set({ currentToolId: toolId });
      // Validate that toolId is registered
      const state = get();
      if (!state.toolsMap.has(toolId)) {
        console.warn(
          `Tool '${toolId}' is not registered. Available tools: ${Array.from(state.toolsMap.keys()).join(", ")}`
        );
        return;
      }

      // Get current active tool from store and deactivate it
      const currentToolId = state.currentToolId;
      const currentTool = state.toolsMap.get(currentToolId);
      if (currentTool && currentTool.onDeactivate) {
        currentTool.onDeactivate();
      }

      // Update store with new tool
      set({ currentToolId: toolId });
      const tool = state.toolsMap.get(toolId);
      tool?.onActivate?.();
    },
    getTool: (toolId) => get().toolsMap.get(toolId),
    getActiveTool: () => get().toolsMap.get(get().currentToolId),

    getToolState: (toolId) => get().toolState[toolId],
    setToolState: (toolId, state) =>
      set((prev) => ({
        toolState: {
          ...prev.toolState,
          [toolId]: { ...prev.toolState[toolId], ...state },
        },
      })),

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
