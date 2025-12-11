import { type EditorState } from "./editor-state";
import { getEventContext, isUserTyping } from "./helpers/event-handler";
import { updateCamera, updateZoom, fitToView } from "./helpers/camera-helpers";
import { correctPolygonWinding } from "./helpers/polygon-helpers";
import { colors } from "./constants";
import type { Tool } from "./tools/tool-interface";
import type { Widget } from "./widgets/widget-interface";
import { createEditorStore, type EditorStore } from "./editor-store";
import { drawKuski } from "./draw-kuski";
import { LgrAssets } from "~/components/lgr-assets";
import { drawGravityArrow, drawObject } from "./draw-object";
import { drawPicture } from "./draw-picture";
import { worldToScreen } from "./helpers/coordinate-helpers";
import type { Level } from "./elma-types";
import { defaultLevel } from "./helpers/level-parser";
import { checkModifierKey } from "~/utils/misc";

type EditorEngineOptions = {
  initialLevel?: Level;
  initialToolId?: string;
  tools?: Array<new (store: EditorStore) => Tool>;
  widgets?: Array<new (store: EditorStore) => Widget>;
  minZoom?: number;
  maxZoom?: number;
  panSpeed?: number;
  zoomStep?: number;
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

  // Camera system
  private minZoom;
  private maxZoom;
  private panSpeed;
  private zoomStep;

  // Navigation state
  private isPanning = false;
  private lastPanX = 0;
  private lastPanY = 0;

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
      zoomStep = 5,
      store,
      lgrAssets,
    }: EditorEngineOptions = {}
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context missing");

    this.canvas = canvas;
    this.ctx = ctx;

    this.minZoom = minZoom;
    this.maxZoom = maxZoom;
    this.panSpeed = panSpeed;
    this.zoomStep = zoomStep;

    this.lgrAssets = lgrAssets || new LgrAssets();
    if (!this.lgrAssets.isReady()) {
      void this.lgrAssets.load();
    }

    this.store = store || createEditorStore();
    const state = this.store.getState();

    tools.forEach((tool) => state.actions.registerTool(new tool(this.store)));
    state.actions.activateTool(initialToolId);

    widgets.forEach((widget) =>
      state.actions.registerWidget(new widget(this.store))
    );

    this.setupEventListeners();
    this.setupStoreListeners();

    // Initialize with level data
    state.actions.loadLevel(initialLevel);
    this.startRenderLoop();
    this.fitToView();
  }

  // Expose store for React integration
  getStore(): EditorStore {
    return this.store;
  }

  private setupEventListeners() {
    this.canvas.addEventListener("mousedown", this.handleMouseDown);
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    this.canvas.addEventListener("mouseup", this.handleMouseUp);
    this.canvas.addEventListener("mouseleave", this.handleMouseLeave);
    this.canvas.addEventListener("contextmenu", this.handleRightClick);
    this.canvas.addEventListener("wheel", this.handleWheel);
    document.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("resize", this.handleResize);
  }

  private handleMouseDown = (event: MouseEvent) => {
    if (event.button === 1) {
      event.preventDefault();
      this.startPanning(event.clientX, event.clientY);
      return;
    }
    if (event.button === 0) {
      const state = this.store.getState();
      const context = getEventContext(
        event,
        this.canvas,
        state.viewPortOffset,
        state.zoom
      );
      const activeTool = state.actions.getActiveTool();
      if (activeTool?.onPointerDown) {
        const consumed = activeTool.onPointerDown(
          event as PointerEvent,
          context
        );
        if (consumed) return;
      }
    }
  };

  private startPanning(clientX: number, clientY: number) {
    this.isPanning = true;
    this.lastPanX = clientX;
    this.lastPanY = clientY;
  }

  private handleMouseMove = (event: MouseEvent) => {
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
      return;
    }

    const context = getEventContext(
      event,
      this.canvas,
      state.viewPortOffset,
      state.zoom
    );
    const activeTool = state.actions.getActiveTool();
    if (activeTool?.onPointerMove) {
      const consumed = activeTool.onPointerMove(event as PointerEvent, context);
      if (consumed) return;
    }

    state.actions.setMousePosition(context.worldPos);
    state.actions.setMouseOnCanvas(true);
  };

  private handleMouseUp = (event: MouseEvent) => {
    if (event.button === 1) {
      this.isPanning = false;
    }

    if (event.button === 0) {
      const state = this.store.getState();

      const activeTool = state.actions.getActiveTool();
      if (activeTool?.onPointerUp) {
        const context = getEventContext(
          event,
          this.canvas,
          state.viewPortOffset,
          state.zoom
        );
        activeTool.onPointerUp(event as PointerEvent, context);
      }
    }
  };

  private handleMouseLeave = () => {
    const state = this.store.getState();
    state.actions.setMouseOnCanvas(false);
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
        state.zoom
      );
      const consumed = activeTool.onRightClick(event, context);
      if (consumed) return;
    }
  };

  private handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    const state = this.store.getState();
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const modifier = checkModifierKey(event);
    if (modifier) {
      const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = state.zoom * zoomFactor;
      updateZoom({
        newZoom,
        minZoom: this.minZoom,
        maxZoom: this.maxZoom,
        currentZoom: state.zoom,
        setZoom: state.actions.setZoom,
        anchor: { x: mouseX, y: mouseY },
        currentOffset: state.viewPortOffset,
        setCamera: state.actions.setCamera,
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
      const context = {
        worldPos: { x: 0, y: 0 },
        screenX: 0,
        screenY: 0,
      };
      const consumed = activeTool.onKeyDown(event, context);
      if (consumed) return;
    }

    const key = event.key.toUpperCase();
    const tool = Array.from(state.toolsMap.values()).find(
      (tool) => tool.meta.shortcut?.toUpperCase() === key
    );
    if (tool) {
      state.actions.activateTool(tool.meta.id);
      return;
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

    updateZoom({
      newZoom: state.zoom + step,
      minZoom: this.minZoom,
      maxZoom: this.maxZoom,
      currentZoom: state.zoom,
      setZoom: state.actions.setZoom,
      anchor: anchor,
      currentOffset: state.viewPortOffset,
      setCamera: anchor ? state.actions.setCamera : undefined,
    });
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
      }
    });
  }

  private render() {
    const state = this.store.getState();
    this.clearCanvas();

    this.ctx.save();
    this.applyCameraTransform(state);
    this.drawPolygons();
    this.drawObjects();
    this.drawPictures();

    // Let active tool render on world-space canvas
    const activeTool = state.actions.getActiveTool();
    if (activeTool?.onRender) {
      activeTool.onRender(this.ctx, this.lgrAssets);
    }

    this.ctx.restore();

    // Let active tool render overlay on screen-space UI
    if (activeTool?.onRenderOverlay) {
      activeTool.onRenderOverlay(this.ctx, this.lgrAssets);
    }

    if (this.debugMode) {
      this.drawDebugInfoPanel(state);
    }
  }

  private clearCanvas() {
    this.ctx.fillStyle = colors.ground;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private applyCameraTransform(state: EditorState) {
    this.ctx.translate(state.viewPortOffset.x, state.viewPortOffset.y);
    this.ctx.scale(state.zoom, state.zoom);
  }

  private drawPolygons() {
    const state = this.store.getState();

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
    this.ctx.fillStyle = colors.sky;
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

    // Draw all polygon edges (only permanent polygons, not drafts)
    correctedPolygons.forEach((polygon) => {
      if (polygon.vertices.length < 3) return;

      if (polygon.grass) {
        this.ctx.strokeStyle = colors.grass;
        this.ctx.lineWidth = 1 / state.zoom;
        this.ctx.beginPath();
        this.ctx.moveTo(polygon.vertices[0].x, polygon.vertices[0].y);
        for (let i = 1; i < polygon.vertices.length; i++) {
          this.ctx.lineTo(polygon.vertices[i].x, polygon.vertices[i].y);
        }
        this.ctx.lineTo(polygon.vertices[0].x, polygon.vertices[0].y);
        this.ctx.stroke();
        return;
      }

      const vertices = polygon.vertices;
      this.ctx.strokeStyle = colors.edges;
      this.ctx.lineWidth = 1 / state.zoom;

      this.ctx.beginPath();
      this.ctx.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i++) {
        this.ctx.lineTo(vertices[i].x, vertices[i].y);
      }
      this.ctx.lineTo(vertices[0].x, vertices[0].y);
      this.ctx.stroke();
    });
  }

  private drawObjects() {
    if (!this.lgrAssets.isReady()) return;

    const state = this.store.getState();

    drawKuski({
      ctx: this.ctx,
      lgrSprites: this.lgrAssets.getKuskiSprites(),
      startX: state.start.x,
      startY: state.start.y,
    });

    const animate = state.animateSprites;

    state.apples.forEach((apple) => {
      const sprite = this.lgrAssets.getAppleSprite(apple.animation);
      if (sprite) {
        drawObject({
          ctx: this.ctx,
          sprite,
          position: apple.position,
          animate,
        });
        drawGravityArrow({
          ctx: this.ctx,
          position: apple.position,
          gravity: apple.gravity,
        });
      }
    });

    const killerSprite = this.lgrAssets.getKillerSprite();
    state.killers.forEach((killer) => {
      if (killerSprite) {
        drawObject({
          ctx: this.ctx,
          sprite: killerSprite,
          position: killer,
          animate,
        });
      }
    });

    const exitSprite = this.lgrAssets.getFlowerSprite();
    state.flowers.forEach((flower) => {
      if (exitSprite) {
        drawObject({
          ctx: this.ctx,
          sprite: exitSprite,
          position: flower,
          animate,
        });
      }
    });
  }

  private drawPictures() {
    if (!this.lgrAssets.isReady()) return;

    const state = this.store.getState();

    state.pictures.forEach((picture) => {
      const sprite = this.lgrAssets.getSprite(picture.name);
      if (sprite) {
        drawPicture({ ctx: this.ctx, sprite, position: picture.position });
      }
    });
  }

  public destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    this.canvas.removeEventListener("mouseup", this.handleMouseUp);
    this.canvas.removeEventListener("contextmenu", this.handleRightClick);
    this.canvas.removeEventListener("wheel", this.handleWheel);
    document.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("resize", this.handleResize);
  }

  public toggleDebugMode() {
    this.debugMode = !this.debugMode;
    console.debug("Debug mode:", this.debugMode ? "ON" : "OFF");
  }

  private drawDebugInfoPanel(state: EditorState) {
    this.ctx.font = "14px 'Courier New', monospace";
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "top";

    // Calculate screen mouse position (inverse of what getEventContext does)
    const screenMouse = worldToScreen(
      state.mousePosition,
      state.viewPortOffset,
      state.zoom
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
      ...lines.map((line) => this.ctx.measureText(line).width)
    );

    const panelWidth = maxTextWidth + padding * 2;
    const panelHeight = lines.length * lineHeight + padding * 2;
    const panelX = this.canvas.width - panelWidth - 10;
    const panelY = 10;

    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    this.ctx.fillStyle = "#ffffff";
    lines.forEach((line, index) => {
      this.ctx.fillText(
        line,
        panelX + padding,
        panelY + padding + index * lineHeight
      );
    });
  }
}
