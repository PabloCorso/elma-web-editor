import { type EditorState } from "./editor-state";
import {
  getEventContext,
  isUserTyping,
  type EventContext,
} from "./helpers/event-handler";
import { updateCamera, updateZoom, fitToView } from "./helpers/camera-helpers";
import {
  colors,
  debugColors,
  ELMA_PIXEL_SCALE,
  GRASS_FILL_DEPTH,
  OBJECT_DIAMETER,
  uiColors,
  uiSelectionHandle,
  uiStrokeWidths,
} from "./constants";
import type { Tool } from "./tools/tool-interface";
import type { Widget } from "./widgets/widget-interface";
import { createEditorStore, type EditorStore } from "./editor-store";
import type { DefaultLevelPreset } from "./helpers/level-parser";
import {
  drawKuski,
  drawKuskiBounds,
  isPointInKuskiSelectionBounds,
} from "./draw-kuski";
import { LgrAssets } from "~/components/lgr-assets";
import { drawGravityArrow, drawObject, drawObjectBounds } from "./draw-object";
import {
  drawMaskedTexturePicture,
  drawPictureBounds,
  drawPicture,
  PICTURE_SCALE,
} from "./draw-picture";
import { screenToWorld, worldToScreen } from "./helpers/coordinate-helpers";
import {
  Clip,
  type Apple,
  type Picture,
  type Polygon,
  type Position,
} from "./elma-types";
import { getDefaultLevel } from "./helpers/level-parser";
import { checkModifierKey } from "~/utils/misc";
import { defaultAppleState } from "./tools/apple-tools";
import { SelectTool, type SelectToolState } from "./tools/select-tool";
import type { VertexToolState } from "./tools/vertex-tool";
import type { EditorDocumentInput } from "./editor-state";

enum RenderType {
  Picture = "picture",
  Killer = "killer",
  Flower = "flower",
  Start = "start",
  Apple = "apple",
}

type RenderItem =
  | (Picture & { type: RenderType.Picture })
  | {
      type: RenderType.Killer | RenderType.Flower | RenderType.Start;
      position: Position;
      distance: number;
      clip: Clip;
    }
  | (Apple & { type: RenderType.Apple; distance: number; clip: Clip });

type EditorEngineOptions = {
  initialDocument?: EditorDocumentInput;
  initialToolId?: string;
  defaultLevelPreset?: DefaultLevelPreset;
  readOnly?: boolean;
  tools?: Array<new (store: EditorStore) => Tool>;
  widgets?: Array<new (store: EditorStore) => Widget>;
  minZoom?: number;
  maxZoom?: number;
  panSpeed?: number;
  zoomStep?: number;
  touchpadStep?: number;
  wheelStep?: number;
  pinchPower?: number;
  store?: EditorStore;
  lgrAssets?: LgrAssets;
};

const DEFAULT_OBJECT_RENDER_DISTANCE = 500;
const KEYBOARD_PAN_STEP = 200;
const KEYBOARD_ZOOM_STEP_DIVISOR = 100;
const WHEEL_PAN_MULTIPLIER = 0.5;
const GRASS_TINY_CANVAS_UNIT_PX = 1;
const MIN_ZOOM_EPSILON = 0.0001;
const GRASS_VERTICAL_EDGE_THRESHOLD = 0.05;
const GRASS_COLLINEAR_DOT_THRESHOLD = 0.98;

export class EditorEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private debugMode = false;
  private store: EditorStore;
  private lgrAssets: LgrAssets;
  private currentCursor: string | null = null;
  private unsubscribeStore?: () => void;

  // Camera system
  private minZoom;
  private maxZoom;
  private panSpeed;
  private zoomStep;
  private touchpadStep;
  private wheelStep;
  private pinchPower;

  // Navigation state
  private isPanning = false;
  private lastPanX = 0;
  private lastPanY = 0;
  private pinchDistance: number | null = null;
  private pinchCenter: { x: number; y: number } | null = null;
  private activeTouchToolPointerId: number | null = null;
  private touchPointers = new Map<number, { x: number; y: number }>();

  constructor(
    canvas: HTMLCanvasElement,
    {
      initialDocument,
      initialToolId = "select",
      defaultLevelPreset = "default",
      readOnly = false,
      tools = [],
      widgets = [],
      minZoom = 0.2,
      maxZoom = 10000,
      panSpeed = 1.0,
      zoomStep = 20,
      touchpadStep = 100,
      wheelStep = 420,
      pinchPower = 1,
      store,
      lgrAssets,
    }: EditorEngineOptions = {},
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context missing");

    this.canvas = canvas;
    this.ctx = ctx;

    this.minZoom = minZoom;
    this.maxZoom = maxZoom;
    this.panSpeed = panSpeed;
    this.zoomStep = zoomStep;
    this.touchpadStep = touchpadStep;
    this.wheelStep = wheelStep;
    this.pinchPower = pinchPower;

    this.lgrAssets = lgrAssets || new LgrAssets();
    if (!this.lgrAssets.isReady()) {
      void this.lgrAssets.load();
    }

    this.store = store || createEditorStore();
    const state = this.store.getState();
    const resolvedInitialDocument = initialDocument ?? {
      level: getDefaultLevel(defaultLevelPreset),
      origin: { kind: "default", label: "Untitled", canOverwrite: false },
      displayName: "Untitled",
      hasExternalHandle: false,
    };

    tools.forEach((tool) => state.actions.registerTool(new tool(this.store)));
    if (tools.length > 0) {
      state.actions.activateTool(initialToolId);
    }

    widgets.forEach((widget) =>
      state.actions.registerWidget(new widget(this.store)),
    );

    if (!readOnly) {
      this.setupEventListeners();
    }
    this.setupStoreListeners();

    // Initialize with level data
    state.actions.replaceDocument(resolvedInitialDocument);
    this.startRenderLoop();
    this.fitToView();
    this.updateCanvasCursor();
  }

  // Expose store for React integration
  getStore(): EditorStore {
    return this.store;
  }

  private setupEventListeners() {
    this.canvas.addEventListener("pointerdown", this.handlePointerDown, {
      passive: false,
    });
    this.canvas.addEventListener("pointermove", this.handlePointerMove, {
      passive: false,
    });
    this.canvas.addEventListener("pointerup", this.handlePointerUp, {
      passive: false,
    });
    this.canvas.addEventListener("pointercancel", this.handlePointerCancel, {
      passive: false,
    });
    this.canvas.addEventListener("pointerleave", this.handlePointerLeave);
    this.canvas.addEventListener("contextmenu", this.handleRightClick);
    this.canvas.addEventListener("wheel", this.handleWheel, { passive: false });
    document.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("resize", this.handleResize);
  }

  private startPanning(clientX: number, clientY: number) {
    this.isPanning = true;
    this.lastPanX = clientX;
    this.lastPanY = clientY;
  }

  private trySetPointerCapture(pointerId: number) {
    if (this.canvas.hasPointerCapture(pointerId)) return;
    try {
      this.canvas.setPointerCapture(pointerId);
    } catch {
      // Pointer may already be released by the browser.
    }
  }

  private tryReleasePointerCapture(pointerId: number) {
    if (!this.canvas.hasPointerCapture(pointerId)) return;
    try {
      this.canvas.releasePointerCapture(pointerId);
    } catch {
      // Ignore release races.
    }
  }

  private dispatchToolPointerEvent(
    phase: "down" | "move" | "up",
    event: PointerEvent,
  ) {
    const state = this.store.getState();
    const context = getEventContext(
      event as unknown as MouseEvent,
      this.canvas,
      state.viewPortOffset,
      state.zoom,
    );
    const activeTool = state.actions.getActiveTool();
    this.updateSelectHoverState(state, context.worldPos);

    if (phase === "down") {
      activeTool?.onPointerDown?.(event, context);
      state.actions.setMousePosition(context.worldPos);
      state.actions.setMouseOnCanvas(true);
      this.updateCanvasCursor(context);
      return;
    }

    if (phase === "move") {
      activeTool?.onPointerMove?.(event, context);
      state.actions.setMousePosition(context.worldPos);
      state.actions.setMouseOnCanvas(true);
      this.updateCanvasCursor(context);
      return;
    }

    activeTool?.onPointerUp?.(event, context);
    this.updateCanvasCursor(context);
  }

  private setCanvasCursor(cursor: string) {
    if (this.currentCursor === cursor) return;
    this.currentCursor = cursor;
    this.canvas.style.cursor = cursor;
  }

  private getMouseEventContext(state: EditorState): EventContext {
    const screenPos = worldToScreen(
      state.mousePosition,
      state.viewPortOffset,
      state.zoom,
    );
    return {
      worldPos: state.mousePosition,
      screenX: screenPos.x,
      screenY: screenPos.y,
    };
  }

  private updateCanvasCursor(context?: EventContext): void {
    const state = this.store.getState();
    if (!state.mouseOnCanvas) {
      this.setCanvasCursor("");
      return;
    }

    const activeTool = state.actions.getActiveTool();
    if (!activeTool) {
      this.setCanvasCursor("");
      return;
    }

    const resolvedContext = context ?? this.getMouseEventContext(state);
    const cursor = activeTool.getCursor?.(resolvedContext)?.trim();
    this.setCanvasCursor(cursor || "");
  }

  private getTouchPinchState() {
    if (this.touchPointers.size < 2) return null;

    const [first, second] = Array.from(this.touchPointers.values());
    const pointA = this.getCanvasPoint(first.x, first.y);
    const pointB = this.getCanvasPoint(second.x, second.y);

    return {
      center: {
        x: (pointA.x + pointB.x) / 2,
        y: (pointA.y + pointB.y) / 2,
      },
      distance: Math.hypot(pointB.x - pointA.x, pointB.y - pointA.y),
    };
  }

  private createSyntheticTouchPointerEvent(
    pointerId: number,
    clientX: number,
    clientY: number,
  ): PointerEvent {
    return {
      pointerId,
      pointerType: "touch",
      isPrimary: true,
      button: 0,
      buttons: 0,
      clientX,
      clientY,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
      preventDefault() {},
      stopPropagation() {},
    } as PointerEvent;
  }

  private endActiveTouchToolInteraction() {
    if (this.activeTouchToolPointerId === null) return;

    const pointerPos = this.touchPointers.get(this.activeTouchToolPointerId);
    if (pointerPos) {
      const syntheticEvent = this.createSyntheticTouchPointerEvent(
        this.activeTouchToolPointerId,
        pointerPos.x,
        pointerPos.y,
      );
      this.dispatchToolPointerEvent("up", syntheticEvent);
    }

    this.activeTouchToolPointerId = null;
  }

  private handlePointerDown = (event: PointerEvent) => {
    if (event.pointerType === "touch") {
      event.preventDefault();
      this.trySetPointerCapture(event.pointerId);
      this.touchPointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      const pinch = this.getTouchPinchState();
      if (pinch) {
        this.endActiveTouchToolInteraction();
        this.pinchDistance = pinch.distance;
        this.pinchCenter = pinch.center;
        return;
      }

      this.resetPinchState();
      this.activeTouchToolPointerId = event.pointerId;
      this.dispatchToolPointerEvent("down", event);
      return;
    }

    if (event.button === 1) {
      event.preventDefault();
      this.trySetPointerCapture(event.pointerId);
      this.store.getState().actions.setMouseOnCanvas(true);
      this.startPanning(event.clientX, event.clientY);
      this.updateCanvasCursor();
      return;
    }

    if (event.button === 0) {
      this.trySetPointerCapture(event.pointerId);
      this.dispatchToolPointerEvent("down", event);
    }
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (event.pointerType === "touch") {
      if (!this.touchPointers.has(event.pointerId)) return;

      event.preventDefault();
      this.touchPointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      const pinch = this.getTouchPinchState();
      if (pinch) {
        this.endActiveTouchToolInteraction();
        const previousCenter = this.pinchCenter;
        const previousDistance = this.pinchDistance;

        if (previousCenter) {
          const state = this.store.getState();
          updateCamera({
            deltaX: pinch.center.x - previousCenter.x,
            deltaY: pinch.center.y - previousCenter.y,
            currentOffset: state.viewPortOffset,
            setCamera: state.actions.setCamera,
            panSpeed: this.panSpeed,
          });
        }

        if (previousDistance && previousDistance > 0) {
          const state = this.store.getState();
          const rawZoomFactor = pinch.distance / previousDistance;
          const zoomFactor = Math.pow(rawZoomFactor, this.pinchPower);
          this.zoomAtAnchor(state.zoom * zoomFactor, pinch.center);
        }

        this.pinchDistance = pinch.distance;
        this.pinchCenter = pinch.center;
        return;
      }

      this.resetPinchState();
      if (this.activeTouchToolPointerId === event.pointerId) {
        this.dispatchToolPointerEvent("move", event);
      }
      return;
    }

    const state = this.store.getState();
    if (this.isPanning) {
      const deltaX = event.clientX - this.lastPanX;
      const deltaY = event.clientY - this.lastPanY;
      updateCamera({
        deltaX,
        deltaY,
        currentOffset: state.viewPortOffset,
        setCamera: state.actions.setCamera,
        panSpeed: this.panSpeed,
      });
      this.lastPanX = event.clientX;
      this.lastPanY = event.clientY;
      this.updateCanvasCursor();
      return;
    }

    this.dispatchToolPointerEvent("move", event);
  };

  private handlePointerUp = (event: PointerEvent) => {
    if (event.pointerType === "touch") {
      event.preventDefault();
      this.touchPointers.delete(event.pointerId);

      if (this.activeTouchToolPointerId === event.pointerId) {
        this.dispatchToolPointerEvent("up", event);
        this.activeTouchToolPointerId = null;
      }

      if (this.touchPointers.size < 2) {
        this.resetPinchState();
      }
      if (this.touchPointers.size === 0) {
        this.store.getState().actions.setMouseOnCanvas(false);
        this.updateCanvasCursor();
      }

      this.tryReleasePointerCapture(event.pointerId);
      return;
    }

    if (event.button === 1) {
      this.isPanning = false;
      this.tryReleasePointerCapture(event.pointerId);
      this.updateCanvasCursor();
      return;
    }

    if (event.button === 0) {
      this.dispatchToolPointerEvent("up", event);
      this.tryReleasePointerCapture(event.pointerId);
    }
  };

  private handlePointerCancel = (event: PointerEvent) => {
    if (event.pointerType === "touch") {
      this.touchPointers.delete(event.pointerId);

      if (this.activeTouchToolPointerId === event.pointerId) {
        this.dispatchToolPointerEvent("up", event);
        this.activeTouchToolPointerId = null;
      }

      if (this.touchPointers.size < 2) {
        this.resetPinchState();
      }
      if (this.touchPointers.size === 0) {
        this.store.getState().actions.setMouseOnCanvas(false);
        this.updateCanvasCursor();
      }
    }

    this.isPanning = false;
    this.tryReleasePointerCapture(event.pointerId);
    this.updateCanvasCursor();
  };

  private handlePointerLeave = () => {
    const state = this.store.getState();
    state.actions.setMouseOnCanvas(false);
    this.clearSelectHoverState(state);
    this.updateCanvasCursor();
  };

  private handleRightClick = (event: MouseEvent) => {
    event.preventDefault();
    const state = this.store.getState();

    const activeTool = state.actions.getActiveTool();
    if (activeTool?.onRightClick) {
      const context = getEventContext(
        event,
        this.canvas,
        state.viewPortOffset,
        state.zoom,
      );
      const consumed = activeTool.onRightClick(event, context);
      if (consumed) return;
    }
  };

  private getCanvasPoint(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  private getCurrentMouseScreenPoint(state: EditorState) {
    return worldToScreen(state.mousePosition, state.viewPortOffset, state.zoom);
  }

  private getKeyboardEventContext(state: EditorState): EventContext {
    const screenPoint = {
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
    };
    const worldPos = screenToWorld(
      screenPoint,
      state.viewPortOffset,
      state.zoom,
    );

    return {
      worldPos,
      screenX: screenPoint.x,
      screenY: screenPoint.y,
    };
  }

  private syncMousePositionFromScreenPoint(screenPoint: Position) {
    const state = this.store.getState();
    const worldPos = screenToWorld(
      screenPoint,
      state.viewPortOffset,
      state.zoom,
    );

    state.actions.setMousePosition(worldPos);
    state.actions.setMouseOnCanvas(true);
    this.updateSelectHoverState(state, worldPos);
    this.updateCanvasCursor({
      worldPos,
      screenX: screenPoint.x,
      screenY: screenPoint.y,
    });
  }

  private zoomAtAnchor(newZoom: number, anchor: { x: number; y: number }) {
    const state = this.store.getState();
    updateZoom({
      newZoom,
      minZoom: this.minZoom,
      maxZoom: this.maxZoom,
      currentZoom: state.zoom,
      setZoom: state.actions.setZoom,
      anchor,
      currentOffset: state.viewPortOffset,
      setCamera: state.actions.setCamera,
    });
  }

  private resetPinchState() {
    this.pinchDistance = null;
    this.pinchCenter = null;
  }

  private handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    const state = this.store.getState();
    const screenPoint = this.getCanvasPoint(event.clientX, event.clientY);
    const { x: mouseX, y: mouseY } = screenPoint;

    const modifier = checkModifierKey(event);
    const isLikelyPinchWheel =
      event.ctrlKey && event.deltaMode === WheelEvent.DOM_DELTA_PIXEL;
    if (modifier || isLikelyPinchWheel) {
      const zoomStepValue = isLikelyPinchWheel
        ? this.touchpadStep
        : this.wheelStep;
      const zoomFactor = Math.pow(2, -event.deltaY / zoomStepValue);
      this.zoomAtAnchor(state.zoom * zoomFactor, { x: mouseX, y: mouseY });
      this.syncMousePositionFromScreenPoint(screenPoint);
      return;
    }

    // Pixel-mode wheel deltas are typically trackpad two-finger gestures.
    // Let those pan freely in both axes without requiring Shift.
    const isTouchpadScroll = event.deltaMode === WheelEvent.DOM_DELTA_PIXEL;
    if (isTouchpadScroll) {
      updateCamera({
        deltaX: -event.deltaX * WHEEL_PAN_MULTIPLIER,
        deltaY: -event.deltaY * WHEEL_PAN_MULTIPLIER,
        currentOffset: state.viewPortOffset,
        setCamera: state.actions.setCamera,
        panSpeed: this.panSpeed,
      });
      this.syncMousePositionFromScreenPoint(screenPoint);
      return;
    }

    if (event.shiftKey) {
      const delta = event.deltaX !== 0 ? event.deltaX : event.deltaY;
      const panAmount = -delta * WHEEL_PAN_MULTIPLIER;
      updateCamera({
        deltaX: panAmount,
        deltaY: 0,
        currentOffset: state.viewPortOffset,
        setCamera: state.actions.setCamera,
        panSpeed: this.panSpeed,
      });
      this.syncMousePositionFromScreenPoint(screenPoint);
      return;
    }

    const panAmount = -event.deltaY * WHEEL_PAN_MULTIPLIER;
    updateCamera({
      deltaX: 0,
      deltaY: panAmount,
      currentOffset: state.viewPortOffset,
      setCamera: state.actions.setCamera,
      panSpeed: this.panSpeed,
    });
    this.syncMousePositionFromScreenPoint(screenPoint);
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (isUserTyping()) return;

    const state = this.store.getState();
    const keyboardContext = this.getKeyboardEventContext(state);

    // Let active tool handle the key first
    const activeTool = state.actions.getActiveTool();
    if (activeTool?.onKeyDown) {
      const consumed = activeTool.onKeyDown(event, keyboardContext);
      if (consumed) return;
    }

    const key = event.key.toUpperCase();
    const modifier = checkModifierKey(event);

    if (modifier && key === "A") {
      if (state.activeToolId !== "select") {
        state.actions.activateTool("select");
      }
      this.selectAllVisible();
      event.preventDefault();
      return;
    }

    for (const tool of state.toolsMap.values()) {
      if (tool.meta.shortcut.toUpperCase() === key) {
        state.actions.activateTool(tool.meta.id);
        return;
      }

      for (const [variantKey, variantMeta] of Object.entries(
        tool.meta.variants || {},
      )) {
        if (variantMeta.shortcut.toUpperCase() === key) {
          // If tool is already active, let onKeyDown handle it (toggle)
          if (state.activeToolId === tool.meta.id) {
            return; // Falls through to tool's onKeyDown
          }
          state.actions.activateTool(tool.meta.id, variantKey);
          return;
        }
      }
    }

    if (modifier) {
      if (event.key === "y" || (event.key === "z" && event.shiftKey)) {
        this.redo();
        event.preventDefault();
        return;
      }
      if (event.key === "z") {
        this.undo();
        event.preventDefault();
        return;
      }
      if (event.key === "d" && event.shiftKey) {
        this.toggleDebugMode();
        event.preventDefault();
        return;
      }
    }

    // Handle arrow keys
    const panAmount = KEYBOARD_PAN_STEP;
    const arrowDeltas: Record<string, { deltaX: number; deltaY: number }> = {
      ArrowLeft: { deltaX: panAmount, deltaY: 0 },
      ArrowRight: { deltaX: -panAmount, deltaY: 0 },
      ArrowUp: { deltaX: 0, deltaY: panAmount },
      ArrowDown: { deltaX: 0, deltaY: -panAmount },
    };

    if (event.key in arrowDeltas) {
      const screenPoint = this.getCurrentMouseScreenPoint(state);
      updateCamera({
        ...arrowDeltas[event.key],
        currentOffset: state.viewPortOffset,
        setCamera: state.actions.setCamera,
        panSpeed: this.panSpeed,
      });
      this.syncMousePositionFromScreenPoint(screenPoint);
      return;
    }

    // Handle other shortcuts
    const shortcuts: Record<string, () => void> = {
      Escape: () => state.actions.activateTool("select"),
      "+": () => this.zoomInOut(this.zoomStep),
      "=": () => this.zoomInOut(this.zoomStep),
      "-": () => this.zoomInOut(-this.zoomStep),
      _: () => this.zoomInOut(-this.zoomStep),
      "1": () => this.fitToView(),
    };
    shortcuts[event.key]?.();
  };

  private zoomInOut(step: number) {
    const state = this.store.getState();
    const anchor = { x: this.canvas.width / 2, y: this.canvas.height / 2 };
    const stepSize = Math.max(0, Math.abs(step));
    const stepFactor = 1 + stepSize / KEYBOARD_ZOOM_STEP_DIVISOR;
    const zoomFactor = step >= 0 ? stepFactor : 1 / stepFactor;

    this.zoomAtAnchor(state.zoom * zoomFactor, anchor);
  }

  public zoomIn(step = this.zoomStep) {
    this.zoomInOut(step);
  }

  public zoomOut(step = this.zoomStep) {
    this.zoomInOut(-step);
  }

  public undo() {
    this.discardPendingVertexEditBeforeHistory();
    this.store.temporal.getState().undo();
  }

  public redo() {
    this.discardPendingVertexEditBeforeHistory();
    this.store.temporal.getState().redo();
  }

  private selectAllVisible(): boolean {
    const state = this.store.getState();
    const selectTool = state.actions.getTool<SelectTool>("select");
    if (!selectTool) return false;

    return selectTool.selectAllVisible((picture) =>
      Boolean(this.getPictureWorldDimensions(picture)),
    );
  }

  private handleResize = () => {
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
    }
  };

  public fitToView() {
    const state = this.store.getState();
    fitToView({
      canvas: this.canvas,
      polygons: state.polygons,
      apples: state.apples,
      killers: state.killers,
      flowers: state.flowers,
      start: state.start,
      minZoom: this.minZoom,
      maxZoom: this.maxZoom,
      setCamera: state.actions.setCamera,
      setZoom: state.actions.setZoom,
    });
  }

  private discardPendingVertexEditBeforeHistory() {
    const state = this.store.getState();
    if (state.activeToolId !== "vertex") return;

    const toolState = state.actions.getToolState<VertexToolState>("vertex");
    if (!toolState?.editingPolygon || toolState.drawingPolygon.vertices.length === 0) {
      return;
    }

    const activeTool = state.actions.getActiveTool();
    activeTool?.clear?.();
  }

  private startRenderLoop() {
    const loop = () => {
      this.render();
      this.animationId = requestAnimationFrame(loop);
    };
    loop();
  }

  private setupStoreListeners() {
    // Subscribe directly to fitToViewTrigger changes
    const state = this.store.getState();
    let lastFitToViewTrigger = state.fitToViewTrigger;
    let lastCurrentTool = state.activeToolId;

    this.unsubscribeStore = this.store.subscribe((state) => {
      const currentTrigger = state.fitToViewTrigger;
      if (currentTrigger !== lastFitToViewTrigger) {
        lastFitToViewTrigger = currentTrigger;
        this.fitToView();
      }

      // Subscribe to tool changes
      const currentTool = state.activeToolId;
      if (currentTool !== lastCurrentTool) {
        lastCurrentTool = currentTool;
        this.updateCanvasCursor();
      }
    });
  }

  private render() {
    const state = this.store.getState();
    if (state.mouseOnCanvas) {
      this.updateSelectHoverState(state, state.mousePosition);
    } else {
      this.clearSelectHoverState(state);
    }
    this.clearCanvas();

    this.ctx.save();
    this.applyCameraTransform(state);

    const scenePolygons = this.getScenePolygons(state);
    const skyPath = this.buildPolygonPath(scenePolygons);
    const groundPath = state.levelVisibility.showPolygons
      ? this.buildGroundPath(state, skyPath)
      : this.buildViewportPath(state);
    this.drawGroundFill(state, groundPath);
    this.drawPolygons(state, scenePolygons, groundPath, skyPath);

    const queue = this.getDrawItemQueue(state);
    for (const item of queue) {
      this.ctx.save();

      if (item.clip === Clip.Sky) {
        this.ctx.clip(skyPath, "evenodd");
      } else if (item.clip === Clip.Ground) {
        this.ctx.clip(groundPath, "evenodd");
      }

      this.drawItem(state, item);

      this.ctx.restore();
    }

    // Let active tool render on world-space canvas
    const activeTool = state.actions.getActiveTool();
    if (activeTool?.onRender) {
      activeTool.onRender(this.ctx, this.lgrAssets);
    }

    this.drawPictureBoundsOverlay(state);

    this.ctx.restore();

    this.drawPolygonHandlesOverlay(state);

    // Screen-space overlay (tools, UI)
    if (activeTool?.onRenderOverlay) {
      activeTool.onRenderOverlay(this.ctx, this.lgrAssets);
    }

    if (this.debugMode) {
      this.drawDebugDistance(state, queue);
      this.drawDebugInfoPanel(state);
    }
  }

  private getDrawItemQueue(state: EditorState): RenderItem[] {
    const objectProperties = {
      distance: DEFAULT_OBJECT_RENDER_DISTANCE,
      clip: Clip.Unclipped,
    };
    const {
      showObjects,
      showPictures,
      showTextures,
      showObjectBounds,
      showPictureBounds,
      showTextureBounds,
    } = state.levelVisibility;
    const showAnyObjects = showObjects || showObjectBounds;
    const showAnyPictures =
      showPictures || showTextures || showPictureBounds || showTextureBounds;
    return [
      ...(showAnyPictures
        ? state.pictures.map((picture) => ({
            type: RenderType.Picture as const,
            ...picture,
          }))
        : []),
      ...(showAnyObjects
        ? state.killers.map((killer) => ({
            type: RenderType.Killer as const,
            ...objectProperties,
            position: killer,
          }))
        : []),
      ...(showAnyObjects
        ? state.apples.map((apple) => ({
            ...apple,
            type: RenderType.Apple as const,
            ...objectProperties,
          }))
        : []),
      ...(showAnyObjects
        ? state.flowers.map((flower) => ({
            type: RenderType.Flower as const,
            ...objectProperties,
            position: flower,
          }))
        : []),
      ...(showAnyObjects
        ? [
            {
              type: RenderType.Start as const,
              ...objectProperties,
              position: state.start,
            },
          ]
        : []),
    ].sort((a, b) => b.distance - a.distance);
  }

  private getScenePolygons(state: EditorState): Polygon[] {
    const activeTool = state.actions.getActiveTool();
    const draftPolygons = activeTool?.getDrafts?.()?.polygons || [];
    const vertexToolState = state.actions.getToolState<VertexToolState>("vertex");
    const scenePolygons = vertexToolState?.editingPolygon
      ? state.polygons.filter(
          (polygon) => polygon !== vertexToolState.editingPolygon,
        )
      : state.polygons;
    return [...scenePolygons, ...draftPolygons];
  }

  private drawItem(state: EditorState, item: RenderItem) {
    const ctx = this.ctx;
    const position = item.position;
    const selectState = state.actions.getToolState<SelectToolState>("select");
    const isSelectedObject = (selectState?.selectedObjects ?? []).some(
      (selected) => selected.x === position.x && selected.y === position.y,
    );
    const objectBoundsLineWidth = isSelectedObject
      ? uiStrokeWidths.boundsSelectedScreen / state.zoom
      : uiStrokeWidths.boundsIdleScreen / state.zoom;

    if (item.type === "picture") {
      const { showPictures, showTextures } = state.levelVisibility;

      if (item.texture && item.mask) {
        if (!showTextures) return;
        const textureSprite = this.lgrAssets.getSprite(item.texture);
        const maskSprite = this.lgrAssets.getSprite(item.mask);
        if (!maskSprite || !textureSprite) return;

        drawMaskedTexturePicture({
          ctx,
          textureSprite,
          maskSprite,
          position,
        });
      } else {
        if (!showPictures) return;
        const sprite = item.name ? this.lgrAssets.getSprite(item.name) : null;
        if (!sprite) return;

        drawPicture({
          ctx,
          sprite,
          position,
        });
      }
    } else if (item.type === "apple") {
      const { showObjects, showObjectBounds, showObjectAnimations } =
        state.levelVisibility;
      const shouldShowBounds = showObjectBounds || isSelectedObject;
      if (!showObjects && !shouldShowBounds) return;
      const sprite = this.lgrAssets.getAppleSprite(
        item.animation ?? defaultAppleState.animation,
      );
      if (showObjects) {
        if (!sprite) return;
        drawObject({
          ctx,
          sprite,
          position,
          animate: state.animateSprites && showObjectAnimations,
        });
      }
      if (shouldShowBounds) {
        drawObjectBounds({
          ctx,
          position,
          lineWidth: objectBoundsLineWidth,
        });
      }
      if (showObjects) {
        drawGravityArrow({ ctx, position, gravity: item.gravity });
      }
    } else if (item.type === "killer") {
      const { showObjects, showObjectBounds, showObjectAnimations } =
        state.levelVisibility;
      const shouldShowBounds = showObjectBounds || isSelectedObject;
      if (!showObjects && !shouldShowBounds) return;
      const sprite = this.lgrAssets.getKillerSprite();
      if (showObjects) {
        if (!sprite) return;
        drawObject({
          ctx,
          sprite,
          position,
          animate: state.animateSprites && showObjectAnimations,
        });
      }
      if (shouldShowBounds) {
        drawObjectBounds({
          ctx,
          position,
          lineWidth: objectBoundsLineWidth,
        });
      }
    } else if (item.type === "flower") {
      const { showObjects, showObjectBounds, showObjectAnimations } =
        state.levelVisibility;
      const shouldShowBounds = showObjectBounds || isSelectedObject;
      if (!showObjects && !shouldShowBounds) return;
      const sprite = this.lgrAssets.getFlowerSprite();
      if (showObjects) {
        if (!sprite) return;
        drawObject({
          ctx,
          sprite,
          position,
          animate: state.animateSprites && showObjectAnimations,
        });
      }
      if (shouldShowBounds) {
        drawObjectBounds({
          ctx,
          position,
          lineWidth: objectBoundsLineWidth,
        });
      }
    } else if (item.type === "start") {
      const { showObjects, showObjectBounds } = state.levelVisibility;
      const shouldShowBounds = showObjectBounds || isSelectedObject;
      if (!showObjects && !shouldShowBounds) return;
      if (showObjects) {
        const lgrSprites = this.lgrAssets.getKuskiSprites();
        drawKuski({ ctx, lgrSprites, start: state.start });
      }
      if (shouldShowBounds) {
        drawKuskiBounds({
          ctx,
          start: state.start,
          lineWidth: objectBoundsLineWidth,
        });
      }
    }
  }

  private updateSelectHoverState(state: EditorState, worldPos: Position) {
    const activeTool = state.actions.getActiveTool();
    if (activeTool?.meta.id !== "select") {
      this.clearSelectHoverState(state);
      return;
    }

    const nextHover = this.resolveSelectHoverTarget(state, worldPos);
    const currentHover = state.actions.getToolState<SelectToolState>("select");
    const currentPictureBounds = currentHover?.hoveredPictureBounds;
    const nextPictureBounds = nextHover.hoveredPictureBounds;

    const isSameHover =
      currentHover?.hoveredObject === nextHover.hoveredObject &&
      currentPictureBounds?.position === nextPictureBounds?.position &&
      currentPictureBounds?.width === nextPictureBounds?.width &&
      currentPictureBounds?.height === nextPictureBounds?.height;
    if (isSameHover) return;

    state.actions.setToolState<SelectToolState>("select", nextHover);
  }

  private clearSelectHoverState(state: EditorState) {
    const selectState = state.actions.getToolState<SelectToolState>("select");
    if (!selectState?.hoveredObject && !selectState?.hoveredPictureBounds) {
      return;
    }

    state.actions.setToolState<SelectToolState>("select", {
      hoveredObject: undefined,
      hoveredPictureBounds: undefined,
    });
  }

  private resolveSelectHoverTarget(
    state: EditorState,
    worldPos: Position,
  ): Pick<SelectToolState, "hoveredObject" | "hoveredPictureBounds"> {
    const queue = this.getDrawItemQueue(state);

    // Objects take precedence over pictures/textures when overlapping.
    for (let index = queue.length - 1; index >= 0; index--) {
      const item = queue[index];
      if (!this.isObjectSelectable(state)) break;
      if (
        item.type !== RenderType.Killer &&
        item.type !== RenderType.Flower &&
        item.type !== RenderType.Start &&
        item.type !== RenderType.Apple
      ) {
        continue;
      }
      const isHovered =
        item.type === RenderType.Start
          ? isPointInKuskiSelectionBounds({
              point: worldPos,
              start: item.position,
            })
          : Math.hypot(
              worldPos.x - item.position.x,
              worldPos.y - item.position.y,
            ) <=
            OBJECT_DIAMETER / 2;
      if (!isHovered) continue;
      return {
        hoveredObject: item.position,
        hoveredPictureBounds: undefined,
      };
    }

    for (let index = queue.length - 1; index >= 0; index--) {
      const item = queue[index];
      if (item.type !== RenderType.Picture) continue;
      if (!this.isPictureSelectable(state, item)) continue;
      const pictureDimensions = this.getPictureWorldDimensions(item);
      if (!pictureDimensions) continue;

      const { width, height } = pictureDimensions;
      if (
        worldPos.x >= item.position.x &&
        worldPos.x <= item.position.x + width &&
        worldPos.y >= item.position.y &&
        worldPos.y <= item.position.y + height
      ) {
        return {
          hoveredObject: undefined,
          hoveredPictureBounds: {
            position: item.position,
            width,
            height,
          },
        };
      }
    }

    return {
      hoveredObject: undefined,
      hoveredPictureBounds: undefined,
    };
  }

  private isObjectSelectable(state: EditorState) {
    const { showObjects, showObjectBounds } = state.levelVisibility;
    return showObjects || showObjectBounds;
  }

  private isPolygonSelectable(state: EditorState) {
    const { showPolygons, showPolygonBounds, showPolygonHandles } =
      state.levelVisibility;
    return showPolygons || showPolygonBounds || showPolygonHandles;
  }

  private isPictureSelectable(state: EditorState, picture: Picture) {
    const { showPictureBounds, showTextureBounds, showPictures, showTextures } =
      state.levelVisibility;
    const hasTexture = Boolean(picture.texture && picture.mask);
    return hasTexture
      ? showTextures || showTextureBounds
      : showPictures || showPictureBounds;
  }

  private getPictureWorldDimensions(picture: Picture) {
    if (picture.texture && picture.mask) {
      const maskSprite = this.lgrAssets.getSprite(picture.mask);
      if (!maskSprite) return null;
      return {
        width: maskSprite.width * PICTURE_SCALE,
        height: maskSprite.height * PICTURE_SCALE,
      };
    }

    const sprite = picture.name ? this.lgrAssets.getSprite(picture.name) : null;
    if (!sprite) return null;
    return {
      width: sprite.width * PICTURE_SCALE,
      height: sprite.height * PICTURE_SCALE,
    };
  }

  private buildPolygonPath(polygons: Polygon[]): Path2D {
    const path = new Path2D();
    polygons.forEach((polygon) => {
      if (polygon.vertices.length < 3 || polygon.grass) return;

      path.moveTo(polygon.vertices[0].x, polygon.vertices[0].y);
      for (let i = 1; i < polygon.vertices.length; i++) {
        path.lineTo(polygon.vertices[i].x, polygon.vertices[i].y);
      }
      path.closePath();
    });

    return path;
  }

  private buildGroundPath(state: EditorState, skyPath: Path2D): Path2D {
    // Viewport rectangle in world coords (inverse transform)
    const topLeft = {
      x: -state.viewPortOffset.x / state.zoom,
      y: -state.viewPortOffset.y / state.zoom,
    };
    const bottomRight = {
      x: topLeft.x + this.canvas.width / state.zoom,
      y: topLeft.y + this.canvas.height / state.zoom,
    };

    const path = new Path2D();

    // Outer viewport rectangle (will be subtracted via even-odd)
    path.rect(
      topLeft.x,
      topLeft.y,
      bottomRight.x - topLeft.x,
      bottomRight.y - topLeft.y,
    );

    // Inner sky polygon (will be subtracted via even-odd)
    path.addPath(skyPath);

    return path;
  }

  private buildViewportPath(state: EditorState): Path2D {
    const topLeft = {
      x: -state.viewPortOffset.x / state.zoom,
      y: -state.viewPortOffset.y / state.zoom,
    };
    const bottomRight = {
      x: topLeft.x + this.canvas.width / state.zoom,
      y: topLeft.y + this.canvas.height / state.zoom,
    };

    const path = new Path2D();
    path.rect(
      topLeft.x,
      topLeft.y,
      bottomRight.x - topLeft.x,
      bottomRight.y - topLeft.y,
    );
    return path;
  }

  private clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private getTexturePattern(textureName: string) {
    const textureSprite = this.lgrAssets.getSprite(textureName);
    if (!textureSprite) return null;

    const pattern = this.ctx.createPattern(textureSprite, "repeat");
    if (!pattern) return null;

    pattern.setTransform(new DOMMatrix().scale(PICTURE_SCALE, PICTURE_SCALE));
    return pattern;
  }

  private getFlatTextureColor(textureName: string, fallback: string) {
    const textureColor = colors[textureName as keyof typeof colors];
    return textureColor ?? fallback;
  }

  private drawGroundFill(state: EditorState, groundPath: Path2D) {
    const groundPattern = state.levelVisibility.useGroundSkyTextures
      ? this.getTexturePattern(state.ground)
      : null;
    const groundColor = this.getFlatTextureColor(state.ground, colors.ground);

    this.ctx.save();
    this.ctx.fillStyle = groundPattern ?? groundColor;
    this.ctx.fill(groundPath, "evenodd");
    this.ctx.restore();
  }

  private applyCameraTransform(state: EditorState) {
    this.ctx.translate(state.viewPortOffset.x, state.viewPortOffset.y);
    this.ctx.scale(state.zoom, state.zoom);
  }

  private getGrassEdgeIndices(vertices: Position[]): number[] {
    const n = vertices.length;
    if (n < 2) return [];

    let longestEdgeIndex = -1;
    let longestEdgeLength = -1;
    for (let i = 0; i < n; i++) {
      const from = vertices[i];
      const to = vertices[(i + 1) % n];
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      if (length > longestEdgeLength) {
        longestEdgeLength = length;
        longestEdgeIndex = i;
      }
    }
    return [...Array(n).keys()].filter((i) => i !== longestEdgeIndex);
  }

  private drawGrassFill(
    polygon: { vertices: Position[] },
    groundPath: Path2D,
    zoom: number,
  ) {
    const depth = GRASS_FILL_DEPTH;
    const joinOverlap = ELMA_PIXEL_SCALE; // 1 Elma pixel in world units to hide AA seams
    const tinyCanvasUnit =
      GRASS_TINY_CANVAS_UNIT_PX / Math.max(zoom, MIN_ZOOM_EPSILON);
    const minTwoSidedOvershoot = tinyCanvasUnit;
    const verticalGapFix = tinyCanvasUnit;
    const verticalThreshold = GRASS_VERTICAL_EDGE_THRESHOLD;
    const collinearDotThreshold = GRASS_COLLINEAR_DOT_THRESHOLD;
    const n = polygon.vertices.length;
    const grassEdgeIndices = this.getGrassEdgeIndices(polygon.vertices);
    const grassEdgesSet = new Set(grassEdgeIndices);

    this.ctx.save();
    this.ctx.clip(groundPath, "evenodd");
    this.ctx.fillStyle = colors.grass;

    for (const i of grassEdgeIndices) {
      const from = polygon.vertices[i];
      const to = polygon.vertices[(i + 1) % n];
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      if (length === 0) continue;

      const prevEdgeIndex = (i - 1 + n) % n;
      const nextEdgeIndex = (i + 1) % n;
      const hasPrevGrass = grassEdgesSet.has(prevEdgeIndex);
      const hasNextGrass = grassEdgesSet.has(nextEdgeIndex);
      const edgeDir = {
        x: (to.x - from.x) / length,
        y: (to.y - from.y) / length,
      };
      const edgeOverlap = Math.min(joinOverlap, length * 0.25);
      const prevFrom = polygon.vertices[prevEdgeIndex];
      const prevTo = polygon.vertices[i];
      const prevLength = Math.hypot(
        prevTo.x - prevFrom.x,
        prevTo.y - prevFrom.y,
      );
      const nextFrom = polygon.vertices[(i + 1) % n];
      const nextTo = polygon.vertices[(i + 2) % n];
      const nextLength = Math.hypot(
        nextTo.x - nextFrom.x,
        nextTo.y - nextFrom.y,
      );

      let fromX = from.x;
      let fromY = from.y;
      let toX = to.x;
      let toY = to.y;

      let fromExtend = 0;
      let toExtend = 0;

      // Overlap only on painted joins that are close to collinear to avoid corner spikes.
      if (hasPrevGrass && prevLength > 0) {
        const prevDir = {
          x: (prevTo.x - prevFrom.x) / prevLength,
          y: (prevTo.y - prevFrom.y) / prevLength,
        };
        const dot = prevDir.x * edgeDir.x + prevDir.y * edgeDir.y;
        if (dot >= collinearDotThreshold) {
          fromExtend = edgeOverlap;
        }
      }
      if (hasNextGrass && nextLength > 0) {
        const nextDir = {
          x: (nextTo.x - nextFrom.x) / nextLength,
          y: (nextTo.y - nextFrom.y) / nextLength,
        };
        const dot = edgeDir.x * nextDir.x + edgeDir.y * nextDir.y;
        if (dot >= collinearDotThreshold) {
          toExtend = edgeOverlap;
        }
      }

      // If this edge is connected to grass on both ends, guarantee overlap on one side.
      if (hasPrevGrass && hasNextGrass) {
        toExtend = Math.max(
          toExtend,
          Math.min(minTwoSidedOvershoot, length * 0.25),
        );
      }

      fromX -= edgeDir.x * fromExtend;
      fromY -= edgeDir.y * fromExtend;
      toX += edgeDir.x * toExtend;
      toY += edgeDir.y * toExtend;

      // Vertical edges can show a 1px AA seam; overdraw one side slightly.
      if (Math.abs(edgeDir.x) <= verticalThreshold) {
        const fix = edgeDir.y < 0 ? verticalGapFix : -verticalGapFix;
        fromX += fix;
        toX += fix;
      }

      const p3 = {
        x: toX,
        y: toY - depth,
      };
      const p4 = {
        x: fromX,
        y: fromY - depth,
      };

      this.ctx.beginPath();
      this.ctx.moveTo(fromX, fromY);
      this.ctx.lineTo(toX, toY);
      this.ctx.lineTo(p3.x, p3.y);
      this.ctx.lineTo(p4.x, p4.y);
      this.ctx.closePath();
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  private drawPolygons(
    state: EditorState,
    polygons: Polygon[],
    groundPath: Path2D,
    skyPath: Path2D,
  ) {
    const { showPolygons, showPolygonBounds } = state.levelVisibility;
    if (!showPolygons && !showPolygonBounds) return;

    if (polygons.length === 0) return;

    // Use even-odd filling in the editor so temporary overlaps stay visible
    // and deterministic while editing invalid intermediate geometry.
    if (showPolygons) {
      const skyFill = state.levelVisibility.useGroundSkyTextures
        ? this.getTexturePattern(state.sky)
        : null;
      const skyColor = this.getFlatTextureColor(state.sky, colors.sky);
      this.ctx.save();
      this.ctx.fillStyle = skyFill ?? skyColor;
      this.ctx.fill(skyPath, "evenodd");
      this.ctx.restore();
    }

    // Draw grass interior shading and thin idle polygon outlines.
    polygons.forEach((polygon) => {
      if (polygon.vertices.length < 3) return;

      if (polygon.grass) {
        if (showPolygons) {
          this.drawGrassFill(polygon, groundPath, state.zoom);
        }
        if (!showPolygonBounds) return;
        this.ctx.strokeStyle = colors.grass;
        this.ctx.lineWidth = 1 / state.zoom;
        this.ctx.lineCap = "butt";
        this.ctx.lineJoin = "miter";

        const grassEdgeIndices = this.getGrassEdgeIndices(polygon.vertices);
        this.ctx.beginPath();
        for (const i of grassEdgeIndices) {
          const from = polygon.vertices[i];
          const to = polygon.vertices[(i + 1) % polygon.vertices.length];
          this.ctx.moveTo(from.x, from.y);
          this.ctx.lineTo(to.x, to.y);
        }
        this.ctx.stroke();
        return;
      }

      if (!showPolygonBounds) return;
      this.ctx.strokeStyle = colors.edges;
      this.ctx.lineWidth = 1 / state.zoom;
      this.ctx.lineCap = "butt";
      this.ctx.lineJoin = "miter";

      this.ctx.beginPath();
      this.ctx.moveTo(polygon.vertices[0].x, polygon.vertices[0].y);
      for (let i = 1; i < polygon.vertices.length; i++) {
        this.ctx.lineTo(polygon.vertices[i].x, polygon.vertices[i].y);
      }
      this.ctx.lineTo(polygon.vertices[0].x, polygon.vertices[0].y);
      this.ctx.stroke();
    });
  }

  private drawPictureBoundsOverlay(state: EditorState) {
    const selectState = state.actions.getToolState<SelectToolState>("select");

    state.pictures.forEach((picture) => {
      const hasTexture = Boolean(picture.texture && picture.mask);
      const shouldShowBounds = hasTexture
        ? state.levelVisibility.showTextureBounds
        : state.levelVisibility.showPictureBounds;
      const isSelectedPicture = (selectState?.selectedPictures ?? []).some(
        (selected) =>
          selected.x === picture.position.x &&
          selected.y === picture.position.y,
      );
      if (!shouldShowBounds && !isSelectedPicture) return;

      const dimensions = this.getPictureWorldDimensions(picture);
      if (!dimensions) return;

      const boundsLineWidth = isSelectedPicture
        ? uiStrokeWidths.boundsSelectedScreen / state.zoom
        : uiStrokeWidths.boundsIdleScreen / state.zoom;

      drawPictureBounds({
        ctx: this.ctx,
        position: picture.position,
        width: dimensions.width / PICTURE_SCALE,
        height: dimensions.height / PICTURE_SCALE,
        boundsLineWidth,
      });
    });
  }

  private drawPolygonHandlesOverlay(state: EditorState) {
    if (!state.levelVisibility.showPolygonHandles) return;
    if (state.polygons.length === 0) return;

    const size = uiSelectionHandle.halfWidthPx;
    const side = size * 2;
    this.ctx.save();
    this.ctx.fillStyle = uiColors.selectionHandleFill;
    this.ctx.strokeStyle = uiColors.selectionHandleStroke;
    this.ctx.lineWidth = uiSelectionHandle.strokeWidthPx;

    state.polygons.forEach((polygon) => {
      polygon.vertices.forEach((vertex) => {
        const position = worldToScreen(
          vertex,
          state.viewPortOffset,
          state.zoom,
        );
        this.ctx.fillRect(position.x - size, position.y - size, side, side);
        this.ctx.strokeRect(position.x - size, position.y - size, side, side);
      });
    });

    this.ctx.restore();
  }

  public destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    this.unsubscribeStore?.();

    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("pointerup", this.handlePointerUp);
    this.canvas.removeEventListener("pointercancel", this.handlePointerCancel);
    this.canvas.removeEventListener("pointerleave", this.handlePointerLeave);
    this.canvas.removeEventListener("contextmenu", this.handleRightClick);
    this.canvas.removeEventListener("wheel", this.handleWheel);
    document.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("resize", this.handleResize);
  }

  public toggleDebugMode() {
    this.debugMode = !this.debugMode;
    console.debug("Debug mode:", this.debugMode ? "ON" : "OFF");
  }

  private drawDebugDistance(state: EditorState, queue: RenderItem[]) {
    queue.forEach(({ clip, distance, position }) => {
      const screenPos = worldToScreen(
        position,
        state.viewPortOffset,
        state.zoom,
      );

      this.ctx.fillStyle = debugColors.distanceLabel;
      this.ctx.font = `12px monospace`;
      this.ctx.textAlign = "left";
      this.ctx.textBaseline = "bottom";
      const label = `${distance} ${Clip[clip].charAt(0)}`;
      this.ctx.fillText(label, screenPos.x, screenPos.y);
    });
  }

  private drawDebugInfoPanel(state: EditorState) {
    this.ctx.font = "14px 'Courier New', monospace";
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "top";

    // Calculate screen mouse position (inverse of what getEventContext does)
    const screenMouse = worldToScreen(
      state.mousePosition,
      state.viewPortOffset,
      state.zoom,
    );

    const lines = [
      "Debug Mode: ON",
      "Press 'D' to exit debug mode",
      `Mouse (World): (${state.mousePosition.x.toFixed(1)}, ${state.mousePosition.y.toFixed(1)})`,
      `Mouse (Screen): (${screenMouse.x.toFixed(1)}, ${screenMouse.y.toFixed(1)})`,
      `Camera: (${state.viewPortOffset.x.toFixed(1)}, ${state.viewPortOffset.y.toFixed(1)})`,
      `Zoom: ${state.zoom.toFixed(2)}`,
    ];

    const padding = 10;
    const lineHeight = 20;
    const maxTextWidth = Math.max(
      ...lines.map((line) => this.ctx.measureText(line).width),
    );

    const panelWidth = maxTextWidth + padding * 2;
    const panelHeight = lines.length * lineHeight + padding * 2;
    const panelX = this.canvas.width - panelWidth - 10;
    const panelY = 10;

    this.ctx.fillStyle = debugColors.panelFill;
    this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    this.ctx.fillStyle = debugColors.panelText;
    lines.forEach((line, index) => {
      this.ctx.fillText(
        line,
        panelX + padding,
        panelY + padding + index * lineHeight,
      );
    });
  }
}
