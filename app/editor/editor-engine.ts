import { useStore, type Store } from "./useStore";
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
import { ToolRegistry } from "./tool-registry";
import { PolygonTool } from "./tools/polygon-tool";
import { SelectionTool } from "./tools/selection-tool";
import { AppleTool, KillerTool, FlowerTool } from "./tools/object-tools";

export class EditorEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private spriteManager: SpriteManager;
  private objectRenderer: ObjectRenderer;
  private debugMode = false;
  private toolRegistry: ToolRegistry;

  // Camera system
  private minZoom = 0.1;
  private maxZoom = 200;
  private panSpeed = 1.0;

  // Navigation state
  private isPanning = false;
  private lastPanX = 0;
  private lastPanY = 0;

  constructor(
    canvas: HTMLCanvasElement,
    {
      initialLevel = initialLevelData,
      minZoom = 0.1,
      maxZoom = 200,
    }: {
      initialLevel?: LevelData;
      minZoom?: number;
      maxZoom?: number;
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
    this.toolRegistry = new ToolRegistry();

    this.setupTools();
    this.setupEventListeners();
    this.setupStoreListeners();

    useStore.setState(initialLevel);
    this.startRenderLoop();
    this.fitToView();
  }

  private setupTools() {
    this.toolRegistry.register(new PolygonTool());
    this.toolRegistry.register(new SelectionTool());
    this.toolRegistry.register(new AppleTool());
    this.toolRegistry.register(new KillerTool());
    this.toolRegistry.register(new FlowerTool());

    // Activate selection tool by default
    this.toolRegistry.activateTool("select");
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
      const store = useStore.getState();
      const context = getEventContext(
        event,
        this.canvas,
        store.viewPortOffset,
        store.zoom
      );
      const currentToolId = store.currentTool;
      const activeTool = this.toolRegistry.getTool(currentToolId);
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
    if (this.isPanning) {
      const deltaX = event.clientX - this.lastPanX;
      const deltaY = event.clientY - this.lastPanY;
      updateCamera(deltaX, deltaY, this.panSpeed);
      this.lastPanX = event.clientX;
      this.lastPanY = event.clientY;
      return;
    }

    const store = useStore.getState();
    const context = getEventContext(
      event,
      this.canvas,
      store.viewPortOffset,
      store.zoom
    );
    const currentToolId = store.currentTool;
    const activeTool = this.toolRegistry.getTool(currentToolId);
    if (activeTool?.onPointerMove) {
      const consumed = activeTool.onPointerMove(event as PointerEvent, context);
      if (consumed) return;
    }

    useStore.getState().setMousePosition(context.worldPos);
  };

  private handleMouseUp = (event: MouseEvent) => {
    if (event.button === 1) {
      this.isPanning = false;
    }

    if (event.button === 0) {
      const store = useStore.getState();

      const currentToolId = store.currentTool;
      const activeTool = this.toolRegistry.getTool(currentToolId);
      if (activeTool?.onPointerUp) {
        const context = getEventContext(
          event,
          this.canvas,
          store.viewPortOffset,
          store.zoom
        );
        activeTool.onPointerUp(event as PointerEvent, context);
      }
    }
  };

  private handleRightClick = (event: MouseEvent) => {
    event.preventDefault();
    const store = useStore.getState();

    const currentToolId = store.currentTool;
    const activeTool = this.toolRegistry.getTool(currentToolId);
    if (activeTool?.onRightClick) {
      const context = getEventContext(
        event,
        this.canvas,
        store.viewPortOffset,
        store.zoom
      );
      const consumed = activeTool.onRightClick(event, context);
      if (consumed) return;
    }
  };

  private handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    if (event.metaKey || event.ctrlKey) {
      const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
      const currentZoom = useStore.getState().zoom;
      const newZoom = currentZoom * zoomFactor;
      updateZoom(newZoom, this.minZoom, this.maxZoom, mouseX, mouseY);
      return;
    }

    if (event.shiftKey) {
      const delta = event.deltaX !== 0 ? event.deltaX : event.deltaY;
      const panAmount = -delta * 0.5;
      updateCamera(panAmount, 0, this.panSpeed);
      return;
    }

    const panAmount = -event.deltaY * 0.5;
    updateCamera(0, panAmount, this.panSpeed);
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (isUserTyping()) return;

    const panAmount = 50 / useStore.getState().zoom;
    const zoomAmount = 0.1;

    // Let active tool handle the key first
    const store = useStore.getState();
    const currentToolId = store.currentTool;
    const activeTool = this.toolRegistry.getTool(currentToolId);
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
        updateCamera(panAmount, 0, this.panSpeed);
        break;

      case "ArrowRight":
        event.preventDefault();
        updateCamera(-panAmount, 0, this.panSpeed);
        break;

      case "ArrowUp":
        event.preventDefault();
        updateCamera(0, panAmount, this.panSpeed);
        break;

      case "ArrowDown":
        event.preventDefault();
        updateCamera(0, -panAmount, this.panSpeed);
        break;

      case "+":
      case "=":
        event.preventDefault();
        const currentZoom = useStore.getState().zoom;
        updateZoom(currentZoom + zoomAmount, this.minZoom, this.maxZoom);
        break;

      case "-":
      case "_":
        event.preventDefault();
        const currentZoom2 = useStore.getState().zoom;
        updateZoom(currentZoom2 - zoomAmount, this.minZoom, this.maxZoom);
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
    const store = useStore.getState();
    fitToView(this.canvas, store.polygons, this.minZoom, this.maxZoom);
  }

  public loadLevel(levelData: LevelData) {
    useStore.setState({
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
    let lastFitToViewTrigger = useStore.getState().fitToViewTrigger;

    useStore.subscribe((state) => {
      const currentTrigger = state.fitToViewTrigger;
      if (currentTrigger !== lastFitToViewTrigger) {
        lastFitToViewTrigger = currentTrigger;
        this.fitToView();
      }
    });
  }

  private render() {
    const store = useStore.getState();
    this.clearCanvas();
    this.applyCameraTransform(store);
    this.drawPolygons();
    this.drawObjects();

    // Let active tool render
    const activeTool = this.toolRegistry.getActiveTool();
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
      this.drawMousePositionDebug(store);
    }
  }

  private clearCanvas() {
    this.ctx.fillStyle = colors.ground;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private applyCameraTransform(state: Store) {
    this.ctx.save();
    this.ctx.translate(state.viewPortOffset.x, state.viewPortOffset.y);
    this.ctx.scale(state.zoom, state.zoom);
  }

  private drawPolygons() {
    const store = useStore.getState();

    if (store.polygons.length === 0) return;

    // Draw non-grass polygons with fill
    this.ctx.fillStyle = colors.sky;
    this.ctx.beginPath();

    store.polygons.forEach((polygon) => {
      if (polygon.vertices.length < 3 || polygon.grass) return;

      let vertices = [...polygon.vertices];
      const isClockwise = isPolygonClockwise(vertices);
      const shouldBeGround = shouldPolygonBeGround(polygon, store.polygons);

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
    store.polygons.forEach((polygon) => {
      if (polygon.vertices.length < 3) return;

      if (polygon.grass) {
        this.ctx.strokeStyle = colors.grass;
        this.ctx.lineWidth = 1 / store.zoom;
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
      const shouldBeGround = shouldPolygonBeGround(polygon, store.polygons);

      if (shouldBeGround !== isClockwise) {
        vertices.reverse();
      }

      this.ctx.strokeStyle = colors.edges;
      this.ctx.lineWidth = 1 / store.zoom;

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
          store.polygons,
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
    const store = useStore.getState();
    const debug = debugPolygonOrientation(polygon, allPolygons);

    debug.samplePoints.forEach((point, index) => {
      const result = debug.containmentResults[index];
      const pointColor = result.isGround ? "#00ff00" : "#ff0000";
      this.ctx.fillStyle = pointColor;

      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, 3 / store.zoom, 0, 2 * Math.PI);
      this.ctx.fill();

      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = `${12 / store.zoom}px Arial`;
      this.ctx.fillText(
        `${result.containmentCount}`,
        point.x + 5 / store.zoom,
        point.y - 5 / store.zoom
      );
    });

    const center = debug.samplePoints[0];
    this.ctx.fillStyle = shouldBeGround ? "#00ff00" : "#ff0000";
    this.ctx.beginPath();
    this.ctx.arc(center.x, center.y, 5 / store.zoom, 0, 2 * Math.PI);
    this.ctx.fill();

    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = `${14 / store.zoom}px Arial`;
    this.ctx.fillText(
      `${shouldBeGround ? "G" : "S"}${isClockwise ? "CW" : "CCW"}`,
      center.x + 8 / store.zoom,
      center.y + 5 / store.zoom
    );
  }

  private drawObjects() {
    const store = useStore.getState();
    this.objectRenderer.renderObjects(
      this.ctx,
      store.apples,
      ObjectRenderer.CONFIGS.apple,
      store.showSprites,
      store.animateSprites
    );

    this.objectRenderer.renderObjects(
      this.ctx,
      store.killers,
      ObjectRenderer.CONFIGS.killer,
      store.showSprites,
      store.animateSprites
    );

    this.objectRenderer.renderObjects(
      this.ctx,
      store.flowers,
      ObjectRenderer.CONFIGS.flower,
      store.showSprites,
      store.animateSprites
    );

    this.objectRenderer.renderObject(
      this.ctx,
      store.start,
      ObjectRenderer.CONFIGS.start,
      store.showSprites,
      false
    );
  }

  public activateTool(toolId: string): boolean {
    // Update the store (which is the source of truth)
    const toolMap: Record<string, string> = {
      polygon: "polygon",
      select: "select",
      apple: "apple",
      killer: "killer",
      flower: "flower",
    };
    const storeTool = toolMap[toolId];
    if (storeTool) {
      useStore.getState().setCurrentTool(storeTool as any);
      // Also call the tool registry to handle activate/deactivate callbacks
      this.toolRegistry.activateTool(toolId);
      return true;
    }
    return false;
  }

  public getActiveTool(): string | null {
    const activeTool = this.toolRegistry.getActiveTool();
    return activeTool?.id || null;
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

  private drawMousePositionDebug(state: Store) {
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
