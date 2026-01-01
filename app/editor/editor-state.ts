import type { Tool, ToolState } from "./tools/tool-interface";
import type {
  Apple,
  EditorLevel,
  Picture,
  Polygon,
  Position,
} from "./elma-types";
import type { Widget } from "./widgets/widget-interface";
import { FileSession } from "./helpers/file-session";
import { LevelFolder } from "./helpers/level-folder";

export type EditorState = EditorLevel & {
  // Editor state
  activeToolId: string;
  mousePosition: Position;
  mouseOnCanvas: boolean;

  // Camera state
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

  // File system access
  fileSession: FileSession;
  levelFolder: LevelFolder;

  actions: {
    // Level data operations
    setStart: (position: Position) => void;
    addApple: (apple: Apple) => void;
    updateApple: (apple: Partial<Apple>) => void;
    removeApple: (apple: Apple) => void;
    addKiller: (killer: Position) => void;
    removeKiller: (killer: Position) => void;
    addFlower: (flower: Position) => void;
    removeFlower: (flower: Position) => void;
    addPicture: (picture: Picture) => void;
    removePicture: (picture: Picture) => void;

    setLevelName: (name: string) => void;
    setMousePosition: (position: Position) => void;
    setMouseOnCanvas: (onCanvas: boolean) => void;
    setCamera: (x: number, y: number) => void;
    setZoom: (zoom: number) => void;
    setPolygons: (polygons: Polygon[]) => void;

    registerTool: (tool: Tool) => void;
    activateTool: (toolId: string) => void;
    getActiveTool: <T extends Tool>(toolId?: string) => T | undefined;
    getTool: (toolId: string) => Tool | undefined;

    // Tools
    getToolState: <T extends ToolState>(toolId: string) => T | undefined;
    setToolState: <T extends ToolState>(
      toolId: string,
      state: Partial<T>
    ) => void;

    // Widgets
    registerWidget: (widget: Widget) => void;
    activateWidget: (widgetId: string) => void;
    deactivateWidget: (widgetId: string) => void;

    // File system access
    setFileSession: (session?: FileSession) => void;
    setLevelFolder: (folder?: LevelFolder) => void;

    // View operations
    toggleAnimateSprites: () => void;
    toggleShowSprites: () => void;
    loadLevel: (level: EditorLevel) => void;
    triggerFitToView: () => void;
  };
};
