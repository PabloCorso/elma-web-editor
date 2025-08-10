import {
  createEditorStore,
  type EditorState,
  type EditorStore,
} from "./editor-store";
import { SpriteManager } from "./sprite-manager";
import { ObjectRenderer } from "./utils/object-renderer";
import { getEventContext, isUserTyping } from "./utils/event-handler";
import { updateCamera, updateZoom, fitToView } from "./utils/camera-utils";
import {
  isPolygonClockwise,
  shouldPolygonBeGround,
  debugPolygonOrientation,
} from "./helpers";
import { colors } from "./constants";
import type { Polygon } from "elmajs";
import { initialLevelData, type LevelData } from "./level-importer";
import type { Tool } from "./tools/tool-interface";

export class EditorEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private spriteManager: SpriteManager;
  private objectRenderer: ObjectRenderer;
  private debugMode = false;
  private store: EditorStore;

  // Camera system
  private minZoom;
  private maxZoom;
  private panSpeed;

  // Navigation state
  private isPanning = false;
  private lastPanX = 0;
  private lastPanY = 0;

  constructor(
    canvas: HTMLCanvasElement,
    {
      initialLevel = initialLevelData,
      tools = [],
      initialToolId = "select",
      minZoom = 0.2,
      maxZoom = 10000,
      panSpeed = 1.0,
      store,
    }: {
      initialLevel?: LevelData;
      tools?: Tool[];
      initialToolId?: string;
      minZoom?: number;
      maxZoom?: number;
      panSpeed?: number;
      store?: EditorStore;
    } = {}
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context missing");
    this.ctx = ctx;
    this.spriteManager = new SpriteManager();
    this.objectRenderer = new ObjectRenderer(this.spriteManager);
    this.minZoom = minZoom;
    this.maxZoom = maxZoom;
    this.panSpeed = panSpeed;

    // Use provided store or create a new one
    this.store = store || createEditorStore();
    const state = this.store.getState();
    tools.forEach((tool) => state.registerTool(tool));
    state.activateTool(initialToolId);

    this.setupEventListeners();
    this.setupStoreListeners();

    // Initialize with level data
    state.importLevel(initialLevel);
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
      const activeTool = state.getActiveTool();
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
        setCamera: state.setCamera,
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
    const activeTool = state.getActiveTool();
    if (activeTool?.onPointerMove) {
      const consumed = activeTool.onPointerMove(event as PointerEvent, context);
      if (consumed) return;
    }

    state.setMousePosition(context.worldPos);
  };

  private handleMouseUp = (event: MouseEvent) => {
    if (event.button === 1) {
      this.isPanning = false;
    }

    if (event.button === 0) {
      const state = this.store.getState();

      const activeTool = state.getActiveTool();
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

  private handleRightClick = (event: MouseEvent) => {
    event.preventDefault();
    const state = this.store.getState();

    const activeTool = state.getActiveTool();
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

    if (event.metaKey || event.ctrlKey) {
      const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = state.zoom * zoomFactor;
      updateZoom({
        newZoom,
        minZoom: this.minZoom,
        maxZoom: this.maxZoom,
        currentZoom: state.zoom,
        setZoom: state.setZoom,
        mousePosition: { x: mouseX, y: mouseY },
        currentOffset: state.viewPortOffset,
        setCamera: state.setCamera,
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
        setCamera: state.setCamera,
        panSpeed: this.panSpeed,
      });
      return;
    }

    const panAmount = -event.deltaY * 0.5;
    updateCamera({
      deltaX: 0,
      deltaY: panAmount,
      currentOffset: state.viewPortOffset,
      setCamera: state.setCamera,
      panSpeed: this.panSpeed,
    });
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (isUserTyping()) return;

    const state = this.store.getState();
    const panAmount = 50 / state.zoom;
    const zoomAmount = 0.1;

    // Let active tool handle the key first
    const activeTool = state.getActiveTool();
    if (activeTool?.onKeyDown) {
      const context = {
        worldPos: { x: 0, y: 0 },
        screenX: 0,
        screenY: 0,
      };
      const consumed = activeTool.onKeyDown(event, context);
      if (consumed) return;
    }

    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        updateCamera({
          deltaX: panAmount,
          deltaY: 0,
          currentOffset: state.viewPortOffset,
          setCamera: state.setCamera,
          panSpeed: this.panSpeed,
        });
        break;

      case "ArrowRight":
        event.preventDefault();
        updateCamera({
          deltaX: -panAmount,
          deltaY: 0,
          currentOffset: state.viewPortOffset,
          setCamera: state.setCamera,
          panSpeed: this.panSpeed,
        });
        break;

      case "ArrowUp":
        event.preventDefault();
        updateCamera({
          deltaX: 0,
          deltaY: panAmount,
          currentOffset: state.viewPortOffset,
          setCamera: state.setCamera,
          panSpeed: this.panSpeed,
        });
        break;

      case "ArrowDown":
        event.preventDefault();
        updateCamera({
          deltaX: 0,
          deltaY: -panAmount,
          currentOffset: state.viewPortOffset,
          setCamera: state.setCamera,
          panSpeed: this.panSpeed,
        });
        break;

      case "+":
      case "=":
        event.preventDefault();
        const currentZoom = state.zoom;
        updateZoom({
          newZoom: currentZoom + zoomAmount,
          minZoom: this.minZoom,
          maxZoom: this.maxZoom,
          currentZoom: state.zoom,
          setZoom: state.setZoom,
        });
        break;

      case "-":
      case "_":
        event.preventDefault();
        const currentZoom2 = state.zoom;
        updateZoom({
          newZoom: currentZoom2 - zoomAmount,
          minZoom: this.minZoom,
          maxZoom: this.maxZoom,
          currentZoom: state.zoom,
          setZoom: state.setZoom,
        });
        break;

      case "1":
        event.preventDefault();
        this.fitToView();
        break;

      case "d":
      case "D":
        event.preventDefault();
        this.toggleDebugMode();
        break;
    }
  };

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
      setCamera: state.setCamera,
      setZoom: state.setZoom,
    });
  }

  public loadLevel(levelData: LevelData) {
    this.store.setState({
      polygons: levelData.polygons,
      apples: levelData.apples,
      killers: levelData.killers,
      flowers: levelData.flowers,
      start: levelData.start,
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
        state.activateTool(currentTool);
      }
    });
  }

  private render() {
    const state = this.store.getState();
    this.clearCanvas();
    this.applyCameraTransform(state);
    this.drawPolygons();
    this.drawObjects();

    // Let active tool render
    const activeTool = state.getActiveTool();
    if (activeTool?.onRender) {
      activeTool.onRender(this.ctx);
    }

    this.ctx.restore();

    // Let active tool render overlay
    if (activeTool?.onRenderOverlay) {
      activeTool.onRenderOverlay(this.ctx);
    }

    if (this.debugMode) {
      this.drawDebugInfoPanel();
      this.drawMousePositionDebug(state);
    }
  }

  private clearCanvas() {
    this.ctx.fillStyle = colors.ground;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private applyCameraTransform(state: EditorState) {
    this.ctx.save();
    this.ctx.translate(state.viewPortOffset.x, state.viewPortOffset.y);
    this.ctx.scale(state.zoom, state.zoom);
  }

  private drawPolygons() {
    const state = this.store.getState();

    // Get temporary polygons from the active tool
    const activeTool = state.getActiveTool();
    const temporaryPolygons = activeTool?.getTemporaryPolygons?.() || [];

    // Include temporary polygons in the list for rendering calculations
    const allPolygonsForRendering = [...state.polygons, ...temporaryPolygons];

    if (allPolygonsForRendering.length === 0) return;

    // Draw non-grass polygons with fill
    this.ctx.fillStyle = colors.sky;
    this.ctx.beginPath();

    allPolygonsForRendering.forEach((polygon) => {
      if (polygon.vertices.length < 3 || polygon.grass) return;

      let vertices = [...polygon.vertices];
      const isClockwise = isPolygonClockwise(vertices);
      const shouldBeGround = shouldPolygonBeGround(
        polygon,
        allPolygonsForRendering
      );

      if (shouldBeGround !== isClockwise) {
        vertices.reverse();
      }

      this.ctx.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i++) {
        this.ctx.lineTo(vertices[i].x, vertices[i].y);
      }
      this.ctx.lineTo(vertices[0].x, vertices[0].y);
    });

    this.ctx.closePath();
    this.ctx.fill();

    // Draw all polygon edges
    state.polygons.forEach((polygon) => {
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

      let vertices = [...polygon.vertices];
      const isClockwise = isPolygonClockwise(vertices);
      const shouldBeGround = shouldPolygonBeGround(
        polygon,
        allPolygonsForRendering
      );

      if (shouldBeGround !== isClockwise) {
        vertices.reverse();
      }

      this.ctx.strokeStyle = colors.edges;
      this.ctx.lineWidth = 1 / state.zoom;

      this.ctx.beginPath();
      this.ctx.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i++) {
        this.ctx.lineTo(vertices[i].x, vertices[i].y);
      }
      this.ctx.lineTo(vertices[0].x, vertices[0].y);
      this.ctx.stroke();

      if (this.debugMode) {
        this.drawPolygonDebugInfo(
          polygon,
          state.polygons,
          shouldBeGround,
          isClockwise
        );
      }
    });
  }

  private drawPolygonDebugInfo(
    polygon: Polygon,
    allPolygons: Polygon[],
    shouldBeGround: boolean,
    isClockwise: boolean
  ) {
    const state = this.store.getState();
    const debug = debugPolygonOrientation(polygon, allPolygons);

    debug.samplePoints.forEach((point, index) => {
      const result = debug.containmentResults[index];
      const pointColor = result.isGround ? "#00ff00" : "#ff0000";
      this.ctx.fillStyle = pointColor;

      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, 3 / state.zoom, 0, 2 * Math.PI);
      this.ctx.fill();

      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = `${12 / state.zoom}px Arial`;
      this.ctx.fillText(
        `${result.containmentCount}`,
        point.x + 5 / state.zoom,
        point.y - 5 / state.zoom
      );
    });

    const center = debug.samplePoints[0];
    this.ctx.fillStyle = shouldBeGround ? "#00ff00" : "#ff0000";
    this.ctx.beginPath();
    this.ctx.arc(center.x, center.y, 5 / state.zoom, 0, 2 * Math.PI);
    this.ctx.fill();

    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = `${14 / state.zoom}px Arial`;
    this.ctx.fillText(
      `${shouldBeGround ? "G" : "S"}${isClockwise ? "CW" : "CCW"}`,
      center.x + 8 / state.zoom,
      center.y + 5 / state.zoom
    );
  }

  private drawObjects() {
    const state = this.store.getState();
    this.objectRenderer.renderObjects(
      this.ctx,
      state.apples,
      ObjectRenderer.CONFIGS.apple,
      state.showSprites,
      state.animateSprites
    );

    this.objectRenderer.renderObjects(
      this.ctx,
      state.killers,
      ObjectRenderer.CONFIGS.killer,
      state.showSprites,
      state.animateSprites
    );

    this.objectRenderer.renderObjects(
      this.ctx,
      state.flowers,
      ObjectRenderer.CONFIGS.flower,
      state.showSprites,
      state.animateSprites
    );

    this.objectRenderer.renderObject(
      this.ctx,
      state.start,
      ObjectRenderer.CONFIGS.start,
      state.showSprites,
      false
    );
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

  private drawMousePositionDebug(state: EditorState) {
    this.ctx.font = "12px 'Courier New', monospace";
    this.ctx.fillStyle = "#ffffff";
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "top";

    const text = `Mouse: (${state.mousePosition.x.toFixed(1)}, ${state.mousePosition.y.toFixed(1)})`;
    this.ctx.fillText(text, 10, 30);

    const cameraText = `Camera: (${state.viewPortOffset.x.toFixed(1)}, ${state.viewPortOffset.y.toFixed(1)})`;
    this.ctx.fillText(cameraText, 10, 50);

    const zoomText = `Zoom: ${state.zoom.toFixed(2)}`;
    this.ctx.fillText(zoomText, 10, 70);
  }

  private drawDebugInfoPanel() {
    this.ctx.font = "14px 'Courier New', monospace";
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "top";

    const line1 = "Debug Mode: ON";
    const line2 = "Press 'D' to exit debug mode";

    const line1Width = this.ctx.measureText(line1).width;
    const line2Width = this.ctx.measureText(line2).width;
    const maxTextWidth = Math.max(line1Width, line2Width);

    const panelWidth = maxTextWidth + 20;
    const panelHeight = 60;
    const panelX = this.canvas.width - panelWidth - 10;
    const panelY = 10;

    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillText(line1, panelX + 10, panelY + 10);
    this.ctx.fillText(line2, panelX + 10, panelY + 35);
  }
}
