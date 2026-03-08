import { type EditorState } from "./editor-state";
import {
  getEventContext,
  isUserTyping,
  type EventContext,
} from "./helpers/event-handler";
import { updateCamera, updateZoom, fitToView } from "./helpers/camera-helpers";
import { correctPolygonWinding } from "./helpers/polygon-helpers";
import {
  colors,
  debugColors,
  GRASS_FILL_DEPTH_PX,
  uiColors,
  uiStrokeWidths,
} from "./constants";
import type { Tool } from "./tools/tool-interface";
import type { Widget } from "./widgets/widget-interface";
import { createEditorStore, type EditorStore } from "./editor-store";
import { drawKuski, drawKuskiBounds } from "./draw-kuski";
import { LgrAssets } from "~/components/lgr-assets";
import { drawGravityArrow, drawObject, drawObjectBounds } from "./draw-object";
import {
  drawMaskedTexturePicture,
  drawPictureBounds,
  drawPicture,
  PICTURE_SCALE,
} from "./draw-picture";
import { worldToScreen } from "./helpers/coordinate-helpers";
import {
  Clip,
  type Apple,
  type EditorLevel,
  type Picture,
  type Position,
} from "./elma-types";
import { defaultLevel } from "./helpers/level-parser";
import { checkModifierKey } from "~/utils/misc";
import { defaultAppleState } from "./tools/apple-tools";
import type { SelectToolState } from "./tools/select-tool";

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
  initialLevel?: EditorLevel;
  initialToolId?: string;
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

export class EditorEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private debugMode = false;
  private store: EditorStore;
  private lgrAssets: LgrAssets;
  private currentCursor: string | null = null;

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
      initialLevel = defaultLevel,
      initialToolId = "select",
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

    tools.forEach((tool) => state.actions.registerTool(new tool(this.store)));
    state.actions.activateTool(initialToolId);

    widgets.forEach((widget) =>
      state.actions.registerWidget(new widget(this.store)),
    );

    this.setupEventListeners();
    this.setupStoreListeners();

    // Initialize with level data
    state.actions.loadLevel(initialLevel);
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
    const { x: mouseX, y: mouseY } = this.getCanvasPoint(
      event.clientX,
      event.clientY,
    );

    const modifier = checkModifierKey(event);
    const isLikelyPinchWheel =
      event.ctrlKey && event.deltaMode === WheelEvent.DOM_DELTA_PIXEL;
    if (modifier || isLikelyPinchWheel) {
      const zoomStepValue = isLikelyPinchWheel
        ? this.touchpadStep
        : this.wheelStep;
      const zoomFactor = Math.pow(2, -event.deltaY / zoomStepValue);
      this.zoomAtAnchor(state.zoom * zoomFactor, { x: mouseX, y: mouseY });
      return;
    }

    // Pixel-mode wheel deltas are typically trackpad two-finger gestures.
    // Let those pan freely in both axes without requiring Shift.
    const isTouchpadScroll = event.deltaMode === WheelEvent.DOM_DELTA_PIXEL;
    if (isTouchpadScroll) {
      updateCamera({
        deltaX: -event.deltaX * 0.5,
        deltaY: -event.deltaY * 0.5,
        currentOffset: state.viewPortOffset,
        setCamera: state.actions.setCamera,
        panSpeed: this.panSpeed,
      });
      return;
    }

    if (event.shiftKey) {
      const delta = event.deltaX !== 0 ? event.deltaX : event.deltaY;
      const panAmount = -delta * 0.5;
      updateCamera({
        deltaX: panAmount,
        deltaY: 0,
        currentOffset: state.viewPortOffset,
        setCamera: state.actions.setCamera,
        panSpeed: this.panSpeed,
      });
      return;
    }

    const panAmount = -event.deltaY * 0.5;
    updateCamera({
      deltaX: 0,
      deltaY: panAmount,
      currentOffset: state.viewPortOffset,
      setCamera: state.actions.setCamera,
      panSpeed: this.panSpeed,
    });
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (isUserTyping()) return;

    const state = this.store.getState();

    // Let active tool handle the key first
    const activeTool = state.actions.getActiveTool();
    if (activeTool?.onKeyDown) {
      const context = { worldPos: { x: 0, y: 0 }, screenX: 0, screenY: 0 };
      const consumed = activeTool.onKeyDown(event, context);
      if (consumed) return;
    }

    const key = event.key.toUpperCase();

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

    const modifier = checkModifierKey(event);
    if (modifier) {
      if (event.key === "y" || (event.key === "z" && event.shiftKey)) {
        this.store.temporal.getState().redo();
        event.preventDefault();
        return;
      }
      if (event.key === "z") {
        this.store.temporal.getState().undo();
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
    const panAmount = 200;
    const arrowDeltas: Record<string, { deltaX: number; deltaY: number }> = {
      ArrowLeft: { deltaX: panAmount, deltaY: 0 },
      ArrowRight: { deltaX: -panAmount, deltaY: 0 },
      ArrowUp: { deltaX: 0, deltaY: panAmount },
      ArrowDown: { deltaX: 0, deltaY: -panAmount },
    };

    if (event.key in arrowDeltas) {
      updateCamera({
        ...arrowDeltas[event.key],
        currentOffset: state.viewPortOffset,
        setCamera: state.actions.setCamera,
        panSpeed: this.panSpeed,
      });
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
    const stepFactor = 1 + stepSize / 100;
    const zoomFactor = step >= 0 ? stepFactor : 1 / stepFactor;

    this.zoomAtAnchor(state.zoom * zoomFactor, anchor);
  }

  public zoomIn(step = this.zoomStep) {
    this.zoomInOut(step);
  }

  public zoomOut(step = this.zoomStep) {
    this.zoomInOut(-step);
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

    this.store.subscribe((state) => {
      const currentTrigger = state.fitToViewTrigger;
      if (currentTrigger !== lastFitToViewTrigger) {
        lastFitToViewTrigger = currentTrigger;
        this.fitToView();
      }

      // Subscribe to tool changes
      const currentTool = state.activeToolId;
      if (currentTool !== lastCurrentTool) {
        lastCurrentTool = currentTool;
        state.actions.activateTool(currentTool);
        this.updateCanvasCursor();
      }
    });
  }

  private render() {
    const state = this.store.getState();
    this.clearCanvas();

    this.ctx.save();
    this.applyCameraTransform(state);

    const skyPath = this.buildSkyPath(state);
    const groundPath = state.levelVisibility.showPolygons
      ? this.buildGroundPath(state, skyPath)
      : this.buildViewportPath(state);
    this.drawGroundFill(state, groundPath);
    this.drawPolygons(state, groundPath);
    this.drawPolygonHandles(state);

    const queue = this.getDrawItemQueue(state);
    for (const item of queue) {
      this.ctx.save();

      if (item.clip === Clip.Sky) {
        this.ctx.clip(skyPath);
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

    this.ctx.restore();

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
    const objectProperties = { distance: 500, clip: Clip.Unclipped };
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

  private drawItem(state: EditorState, item: RenderItem) {
    const ctx = this.ctx;
    const position = item.position;

    if (item.type === "picture") {
      const { showPictureBounds, showTextureBounds, showPictures, showTextures } =
        state.levelVisibility;
      const selectState = state.actions.getToolState<SelectToolState>("select");
      const isSelectedPicture = (selectState?.selectedPictures ?? []).some(
        (selected) => selected.x === position.x && selected.y === position.y,
      );
      const boundsLineWidth = isSelectedPicture
        ? uiStrokeWidths.boundsSelectedScreen / state.zoom
        : uiStrokeWidths.boundsIdleScreen / state.zoom;

      if (item.texture && item.mask) {
        const shouldRenderContent = showTextures;
        const shouldShowBounds = showTextureBounds;
        if (!shouldRenderContent && !shouldShowBounds) return;
        const textureSprite = this.lgrAssets.getSprite(item.texture);
        const maskSprite = this.lgrAssets.getSprite(item.mask);
        if (!maskSprite) return;

        if (shouldRenderContent && textureSprite) {
          drawMaskedTexturePicture({
            ctx,
            textureSprite,
            maskSprite,
            position,
            showBounds: shouldShowBounds,
            boundsLineWidth,
          });
        } else if (shouldShowBounds) {
          drawPictureBounds({
            ctx,
            position,
            width: maskSprite.width,
            height: maskSprite.height,
            boundsLineWidth,
          });
        }
      } else {
        const shouldRenderContent = showPictures;
        const shouldShowBounds = showPictureBounds;
        if (!shouldRenderContent && !shouldShowBounds) return;
        const sprite = item.name ? this.lgrAssets.getSprite(item.name) : null;
        if (!sprite) return;

        if (shouldRenderContent) {
          drawPicture({
            ctx,
            sprite,
            position,
            showBounds: shouldShowBounds,
            boundsLineWidth,
          });
        } else if (shouldShowBounds) {
          drawPictureBounds({
            ctx,
            position,
            width: sprite.width,
            height: sprite.height,
            boundsLineWidth,
          });
        }
      }
    } else if (item.type === "apple") {
      const { showObjects, showObjectBounds } = state.levelVisibility;
      if (!showObjects && !showObjectBounds) return;
      const sprite = this.lgrAssets.getAppleSprite(
        item.animation ?? defaultAppleState.animation,
      );
      if (showObjects) {
        if (!sprite) return;
        drawObject({ ctx, sprite, position, animate: state.animateSprites });
      }
      if (showObjectBounds) {
        drawObjectBounds({
          ctx,
          position,
          lineWidth: uiStrokeWidths.boundsIdleScreen / state.zoom,
        });
      }
      if (showObjects) {
        drawGravityArrow({ ctx, position, gravity: item.gravity });
      }
    } else if (item.type === "killer") {
      const { showObjects, showObjectBounds } = state.levelVisibility;
      if (!showObjects && !showObjectBounds) return;
      const sprite = this.lgrAssets.getKillerSprite();
      if (showObjects) {
        if (!sprite) return;
        drawObject({ ctx, sprite, position, animate: state.animateSprites });
      }
      if (showObjectBounds) {
        drawObjectBounds({
          ctx,
          position,
          lineWidth: uiStrokeWidths.boundsIdleScreen / state.zoom,
        });
      }
    } else if (item.type === "flower") {
      const { showObjects, showObjectBounds } = state.levelVisibility;
      if (!showObjects && !showObjectBounds) return;
      const sprite = this.lgrAssets.getFlowerSprite();
      if (showObjects) {
        if (!sprite) return;
        drawObject({ ctx, sprite, position, animate: state.animateSprites });
      }
      if (showObjectBounds) {
        drawObjectBounds({
          ctx,
          position,
          lineWidth: uiStrokeWidths.boundsIdleScreen / state.zoom,
        });
      }
    } else if (item.type === "start") {
      const { showObjects, showObjectBounds } = state.levelVisibility;
      if (!showObjects && !showObjectBounds) return;
      if (showObjects) {
        const lgrSprites = this.lgrAssets.getKuskiSprites();
        drawKuski({ ctx, lgrSprites, start: state.start });
      }
      if (showObjectBounds) {
        drawKuskiBounds({
          ctx,
          start: state.start,
          lineWidth: uiStrokeWidths.boundsIdleScreen / state.zoom,
        });
      }
    }
  }

  private buildSkyPath(state: EditorState): Path2D {
    // Union of all non-grass polygons with corrected winding
    const activeTool = state.actions.getActiveTool();
    const draftPolygons = activeTool?.getDrafts?.()?.polygons || [];
    const allPolygons = [...state.polygons, ...draftPolygons];

    const correctedPolygons = allPolygons.map((polygon) => {
      if (polygon.vertices.length < 3 || polygon.grass) {
        return polygon;
      }
      return correctPolygonWinding(polygon, allPolygons);
    });

    const path = new Path2D();
    correctedPolygons.forEach((polygon) => {
      if (polygon.vertices.length < 3 || polygon.grass) return;

      path.moveTo(polygon.vertices[0].x, polygon.vertices[0].y);
      for (let i = 1; i < polygon.vertices.length; i++) {
        path.lineTo(polygon.vertices[i].x, polygon.vertices[i].y);
      }
      path.lineTo(polygon.vertices[0].x, polygon.vertices[0].y);
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
    const depth = GRASS_FILL_DEPTH_PX;
    const joinOverlap = 1 / 48; // 1 Elma pixel in world units to hide AA seams
    const tinyCanvasUnitPx = 1;
    const tinyCanvasUnit = tinyCanvasUnitPx / Math.max(zoom, 0.0001);
    const minTwoSidedOvershoot = tinyCanvasUnit;
    const verticalGapFix = tinyCanvasUnit;
    const verticalThreshold = 0.05;
    const collinearDotThreshold = 0.98;
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

  private drawPolygons(state: EditorState, groundPath: Path2D) {
    const { showPolygons, showPolygonBounds } = state.levelVisibility;
    if (!showPolygons && !showPolygonBounds) return;

    const activeTool = state.actions.getActiveTool();
    const draftPolygons = activeTool?.getDrafts?.()?.polygons || [];
    const allPolygons = [...state.polygons, ...draftPolygons];

    if (allPolygons.length === 0) return;

    const correctedPolygons = allPolygons.map((polygon) => {
      if (polygon.vertices.length < 3 || polygon.grass) {
        return polygon;
      }

      return correctPolygonWinding(polygon, allPolygons);
    });

    // Draw non-grass polygons with fill
    if (showPolygons) {
      const skyFill = state.levelVisibility.useGroundSkyTextures
        ? this.getTexturePattern(state.sky)
        : null;
      const skyColor = this.getFlatTextureColor(state.sky, colors.sky);
      this.ctx.fillStyle = skyFill ?? skyColor;
      this.ctx.beginPath();

      correctedPolygons.forEach((polygon) => {
        if (polygon.vertices.length < 3 || polygon.grass) return;

        this.ctx.moveTo(polygon.vertices[0].x, polygon.vertices[0].y);
        for (let i = 1; i < polygon.vertices.length; i++) {
          this.ctx.lineTo(polygon.vertices[i].x, polygon.vertices[i].y);
        }

        this.ctx.lineTo(polygon.vertices[0].x, polygon.vertices[0].y);
      });

      this.ctx.closePath();
      this.ctx.fill(); // Fill all polygons at once according to even-odd (winding) rule
    }

    // Draw grass interior shading and thin idle polygon outlines.
    correctedPolygons.forEach((polygon) => {
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

  private drawPolygonHandles(state: EditorState) {
    if (!state.levelVisibility.showPolygonHandles) return;
    if (state.polygons.length === 0) return;

    const size = 3 / state.zoom;
    const side = size * 2;
    this.ctx.fillStyle = uiColors.selectionHandleFill;
    this.ctx.strokeStyle = uiColors.selectionHandleStroke;
    this.ctx.lineWidth = uiStrokeWidths.boundsIdleScreen / state.zoom;

    state.polygons.forEach((polygon) => {
      polygon.vertices.forEach((vertex) => {
        this.ctx.fillRect(vertex.x - size, vertex.y - size, side, side);
        this.ctx.strokeRect(vertex.x - size, vertex.y - size, side, side);
      });
    });
  }

  public destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

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
