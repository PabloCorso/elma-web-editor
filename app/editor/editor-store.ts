import { create, type StoreApi, type UseBoundStore } from "zustand";
import { temporal, type TemporalState } from "zundo";
import type { EditorState } from "./editor-state";
import type { Widget } from "./widgets/widget-interface";
import type { Tool, ToolState } from "./tools/tool-interface";
import { FileSession } from "~/editor/helpers/file-session";
import { LevelFolder } from "~/editor/helpers/level-folder";
import type { DefaultToolId } from "./tools/default-tools";
import fastDeepEqual from "fast-deep-equal";
import throttle from "just-throttle";

type CreateEditorStoreOptions = {
  initialToolId?: DefaultToolId | string;
  defaultLevelTitle?: string;
  historyUpdateThrottle?: number;
};

export type PartialEditorState = Pick<
  EditorState,
  | "levelName"
  | "polygons"
  | "apples"
  | "killers"
  | "flowers"
  | "start"
  | "pictures"
>;
export type TemporalEditorState = TemporalState<PartialEditorState>;
export type EditorStore = UseBoundStore<StoreApi<EditorState>> & {
  temporal: StoreApi<TemporalEditorState>;
};

export function createEditorStore({
  initialToolId = "select",
  defaultLevelTitle = "Untitled",
  historyUpdateThrottle = 50,
}: CreateEditorStoreOptions = {}) {
  return create<EditorState>()(
    temporal(
      (set, get, store) => ({
        // Initial state - level data will be injected via constructor
        levelName: defaultLevelTitle,
        polygons: [],
        apples: [],
        killers: [],
        flowers: [],
        start: { x: 0, y: 0 },
        pictures: [],

        // Editor state
        activeToolId: initialToolId,
        mousePosition: { x: 0, y: 0 },
        mouseOnCanvas: false,

        // Camera state
        viewPortOffset: { x: 0, y: 0 },
        zoom: 1,

        // View settings
        animateSprites: true,
        showSprites: true,

        // Fit to view trigger
        fitToViewTrigger: 0,

        // Tool state
        toolsMap: new Map<string, Tool>(),
        toolState: {},

        // Widgets
        widgetsMap: new Map<string, Widget>(),

        // File system access
        fileSession: new FileSession(store as EditorStore),
        levelFolder: new LevelFolder(store as EditorStore),

        actions: {
          // Level data operations
          setLevelName: (name) => set({ levelName: name }),
          setStart: (position) => set({ start: position }),
          addApple: (apple) => set({ apples: [...get().apples, apple] }),
          updateApple: (values) =>
            set({
              apples: get().apples.map((apple) =>
                apple.position.x === values?.position?.x &&
                apple.position.y === values?.position?.y
                  ? { ...apple, ...values }
                  : apple
              ),
            }),
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
          addPicture: (picture) =>
            set({ pictures: [...(get().pictures || []), picture] }),
          removePicture: (picture) =>
            set({
              pictures: (get().pictures || []).filter(
                (p) =>
                  p.position.x !== picture.position.x ||
                  p.position.y !== picture.position.y
              ),
            }),

          setMousePosition: (position) => set({ mousePosition: position }),
          setMouseOnCanvas: (onCanvas) => set({ mouseOnCanvas: onCanvas }),
          setCamera: (x, y) => set({ viewPortOffset: { x, y } }),
          setZoom: (zoom) => set({ zoom }),
          setPolygons: (polygons) => set({ polygons }),

          // Tools
          registerTool: (tool) =>
            set((prev) => {
              const toolsMap = new Map(prev.toolsMap);
              toolsMap.set(tool.meta.id, tool);
              return { toolsMap };
            }),
          activateTool: (toolId: string) => {
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
            get().toolState[toolId] as T | undefined,
          setToolState: <T extends ToolState>(
            toolId: string,
            state: Partial<T>
          ) =>
            set((prev) => ({
              toolState: {
                ...prev.toolState,
                [toolId]: { ...(prev.toolState[toolId] as T), ...state },
              },
            })),

          // Widgets
          registerWidget: (widget: Widget) =>
            set((prev) => {
              const widgetsMap = new Map(prev.widgetsMap);
              widgetsMap.set(widget.id, widget);
              return { widgetsMap };
            }),
          activateWidget: (widgetId: string) => {
            const state = get();
            const widget = state.widgetsMap.get(widgetId);
            if (!widget) {
              console.warn(
                `Widget '${widgetId}' is not registered. Available widgets: ${Array.from(state.widgetsMap.keys()).join(", ")}`
              );
              return;
            }
            widget.onActivate?.();
          },
          deactivateWidget: (widgetId: string) => {
            const state = get();
            const widget = state.widgetsMap.get(widgetId);
            if (!widget) {
              console.warn(
                `Widget '${widgetId}' is not registered. Available widgets: ${Array.from(state.widgetsMap.keys()).join(", ")}`
              );
              return;
            }
            widget.onDeactivate?.();
          },

          // File system access
          setFileSession: (session) => set({ fileSession: session }),
          setLevelFolder: (folder) => set({ levelFolder: folder }),

          // View operations
          toggleAnimateSprites: () =>
            set((state) => ({ animateSprites: !state.animateSprites })),

          toggleShowSprites: () =>
            set((state) => ({ showSprites: !state.showSprites })),

          loadLevel: (level) => {
            set({
              ...level,
              levelName: level.levelName || defaultLevelTitle,
            });
            const temporal = (store as EditorStore).temporal.getState();
            temporal.clear();
          },

          triggerFitToView: () =>
            set((state) => ({
              fitToViewTrigger: state.fitToViewTrigger + 1,
            })),
        },
      }),
      {
        equality: fastDeepEqual,
        handleSet: (handleSet) => throttle(handleSet, historyUpdateThrottle),
        partialize: (state) => ({
          levelName: state.levelName,
          polygons: state.polygons,
          apples: state.apples,
          killers: state.killers,
          flowers: state.flowers,
          start: state.start,
          pictures: state.pictures,
          activeToolId: state.activeToolId,
          toolState: state.toolState,
        }),
      }
    )
  );
}
