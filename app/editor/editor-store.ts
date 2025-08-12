import { create, type StoreApi } from "zustand";
import type { Polygon, Position } from "elmajs";
import type { LevelData } from "./level-importer";
import type { Tool, ToolState } from "./tools/tool-interface";
import type { Apple } from "./editor.types";

export type EditorState = {
  // Level data
  levelName: string;
  polygons: Polygon[];
  apples: Apple[];
  killers: Position[];
  flowers: Position[];
  start: Position;

  // Editor state
  activeToolId: string;
  mousePosition: Position;

  // Camera state (matching reference editor approach)
  viewPortOffset: { x: number; y: number };
  zoom: number;

  // View settings
  animateSprites: boolean;
  showSprites: boolean;

  // Fit to view trigger
  fitToViewTrigger: number;

  // Level data operations
  setStart: (position: Position) => void;
  addApple: (apple: Apple) => void;
  removeApple: (apple: Apple) => void;
  addKiller: (killer: Position) => void;
  removeKiller: (killer: Position) => void;
  addFlower: (flower: Position) => void;
  removeFlower: (flower: Position) => void;

  setLevelName: (name: string) => void;
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

  getToolState: <T extends ToolState>(toolId: string) => T;
  setToolState: <T extends ToolState>(
    toolId: string,
    state: Partial<T>
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
    activeToolId: initialToolId,
    mousePosition: { x: 0, y: 0 },

    // Camera state
    viewPortOffset: { x: 0, y: 0 },
    zoom: 1,

    // View settings
    animateSprites: true,
    showSprites: true,

    // Fit to view trigger
    fitToViewTrigger: 0,

    // Level data operations
    setLevelName: (name) => set({ levelName: name }),
    setStart: (position) => set({ start: position }),
    addApple: (apple) => set({ apples: [...get().apples, apple] }),
    removeApple: (apple) =>
      set({
        apples: get().apples.filter(
          (a) =>
            a.position.x !== apple.position.x ||
            a.position.y !== apple.position.y
        ),
      }),
    addKiller: (killer) => set({ killers: [...get().killers, killer] }),
    removeKiller: (killer) =>
      set({
        killers: get().killers.filter(
          (k) => k.x !== killer.x || k.y !== killer.y
        ),
      }),
    addFlower: (flower) => set({ flowers: [...get().flowers, flower] }),
    removeFlower: (flower) =>
      set({
        flowers: get().flowers.filter(
          (f) => f.x !== flower.x || f.y !== flower.y
        ),
      }),

    setMousePosition: (position) => set({ mousePosition: position }),
    setCamera: (x, y) => set({ viewPortOffset: { x, y } }),
    setZoom: (zoom) => set({ zoom }),
    setPolygons: (polygons) => set({ polygons }),

    // Tool state
    toolsMap: new Map<string, Tool>(),
    toolState: {},

    registerTool: (tool) =>
      set((prev) => ({
        toolsMap: prev.toolsMap.set(tool.id, tool),
      })),
    activateTool: (toolId: string) => {
      set({ activeToolId: toolId });
      // Validate that toolId is registered
      const state = get();
      if (!state.toolsMap.has(toolId)) {
        console.warn(
          `Tool '${toolId}' is not registered. Available tools: ${Array.from(state.toolsMap.keys()).join(", ")}`
        );
        return;
      }

      // Get current active tool from store and deactivate it
      const currentToolId = state.activeToolId;
      const currentTool = state.toolsMap.get(currentToolId);
      if (currentTool && currentTool.onDeactivate) {
        currentTool.onDeactivate();
      }

      // Update store with new tool
      set({ activeToolId: toolId });
      const tool = state.toolsMap.get(toolId);
      tool?.onActivate?.();
    },
    getTool: (toolId) => get().toolsMap.get(toolId),
    getActiveTool: () => get().toolsMap.get(get().activeToolId),

    getToolState: <T extends ToolState>(toolId: string) =>
      get().toolState[toolId] as T,
    setToolState: <T extends ToolState>(toolId: string, state: Partial<T>) =>
      set((prev) => ({
        toolState: {
          ...prev.toolState,
          [toolId]: { ...(prev.toolState[toolId] as T), ...state },
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
