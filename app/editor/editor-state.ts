import { create, type StoreApi } from "zustand";
import type { Polygon, Position } from "elmajs";
import type { LevelData } from "./level-importer";
import type { Tool, ToolState } from "./tools/tool-interface";
import type { Apple } from "./editor.types";
import type { Widget } from "./widgets/widget-interface";

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

  // Tools
  toolsMap: Map<string, Tool>;
  toolState: ToolState;

  // Widgets
  widgetsMap: Map<string, Widget>;

  actions: {
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

    registerTool: (tool: Tool) => void;
    activateTool: (toolId: string) => void;
    getActiveTool: () => Tool | undefined;
    getTool: (toolId: string) => Tool | undefined;

    // Tools
    getToolState: <T extends ToolState>(toolId: string) => T;
    setToolState: <T extends ToolState>(
      toolId: string,
      state: Partial<T>
    ) => void;

    // Widgets
    registerWidget: (widget: Widget) => void;
    activateWidget: (widgetId: string) => void;
    deactivateWidget: (widgetId: string) => void;

    // View operations
    toggleAnimateSprites: () => void;
    toggleShowSprites: () => void;
    importLevel: (levelData: LevelData) => void;
    triggerFitToView: () => void;
  };
};

export type EditorStore = StoreApi<EditorState>;
