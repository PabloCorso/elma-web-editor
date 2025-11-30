import { type EditorState } from "./editor-state";
import { getEventContext, isUserTyping } from "./utils/event-handler";
import { updateCamera, updateZoom, fitToView } from "./utils/camera-utils";
import {
  isPolygonClockwise,
  shouldPolygonBeGround,
  debugPolygonOrientation,
} from "./helpers";
import { colors } from "./constants";
import { type Polygon } from "elmajs";
import { initialLevelData, type LevelData } from "./level-importer";
import type { Tool } from "./tools/tool-interface";
import type { Widget } from "./widgets/widget-interface";
import { createEditorStore, type EditorStore } from "./editor-store";
import * as elmajs from "elmajs";
import { decodeLgrPictureBitmap } from "./utils/pcx-loader";
import { OBJECT_DIAMETER } from "elmajs";
import { bikeRender } from "./bike-render";

const OBJECT_FRAME_PX = 40; // width of a single frame in object sprite sheet
const OBJECT_FPS = 30; // animation speed for object sprites

type EditorEngineOptions = {
  initialLevel?: LevelData;
  initialLgr?: elmajs.LGR;
  tools?: Array<new (store: EditorStore) => Tool>;
  widgets?: Array<new (store: EditorStore) => Widget>;
  initialToolId?: string;
  minZoom?: number;
  maxZoom?: number;
  panSpeed?: number;
  zoomStep?: number;
  store?: EditorStore;
};

export class EditorEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private debugMode = false;
  private store: EditorStore;
  private lgr: elmajs.LGR;
  private lgrSprites: Record<string, ImageBitmap> = {};
  private lgrLoaded = false;

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
      initialLevel = initialLevelData,
      tools = [],
      widgets = [],
      initialToolId = "select",
      minZoom = 0.2,
      maxZoom = 10000,
      panSpeed = 1.0,
      zoomStep = 5,
      store,
      initialLgr,
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
    this.lgr = initialLgr || new elmajs.LGR();

    this.loadLgrPictures().catch((err) =>
      console.error("Failed to load LGR pictures", err)
    );

    // Use provided store or create a new one
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
    state.actions.loadLevelData(initialLevel);
    this.startRenderLoop();
    this.fitToView();
  }

  // Expose store for React integration
  getStore(): EditorStore {
    return this.store;
  }

  private async loadLgrPictures() {
    for (const picture of this.lgr.pictureData) {
      const name = picture.name
        .trim()
        .toLowerCase()
        .replace(/\.pcx$/, "");
      const bmp = await decodeLgrPictureBitmap(picture);
      if (bmp) this.lgrSprites[name] = bmp;
      else console.warn(`${picture.name} sprite not found in LGR`);
    }

    this.lgrLoaded = true;
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

    if (event.metaKey || event.ctrlKey) {
      const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = state.zoom * zoomFactor;
      updateZoom({
        newZoom,
        minZoom: this.minZoom,
        maxZoom: this.maxZoom,
        currentZoom: state.zoom,
        setZoom: state.actions.setZoom,
        mousePosition: { x: mouseX, y: mouseY },
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
    const panAmount = 50 / state.zoom;

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

    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        updateCamera({
          deltaX: panAmount,
          deltaY: 0,
          currentOffset: state.viewPortOffset,
          setCamera: state.actions.setCamera,
          panSpeed: this.panSpeed,
        });
        break;

      case "ArrowRight":
        event.preventDefault();
        updateCamera({
          deltaX: -panAmount,
          deltaY: 0,
          currentOffset: state.viewPortOffset,
          setCamera: state.actions.setCamera,
          panSpeed: this.panSpeed,
        });
        break;

      case "ArrowUp":
        event.preventDefault();
        updateCamera({
          deltaX: 0,
          deltaY: panAmount,
          currentOffset: state.viewPortOffset,
          setCamera: state.actions.setCamera,
          panSpeed: this.panSpeed,
        });
        break;

      case "ArrowDown":
        event.preventDefault();
        updateCamera({
          deltaX: 0,
          deltaY: -panAmount,
          currentOffset: state.viewPortOffset,
          setCamera: state.actions.setCamera,
          panSpeed: this.panSpeed,
        });
        break;

      case "+":
      case "=":
        event.preventDefault();
        this.zoomInOut(this.zoomStep);
        break;

      case "-":
      case "_":
        event.preventDefault();
        this.zoomInOut(-this.zoomStep);
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

  private zoomInOut(value: number) {
    const state = this.store.getState();
    const anchor = { x: this.canvas.width / 2, y: this.canvas.height / 2 };
    updateZoom({
      newZoom: state.zoom + value,
      minZoom: this.minZoom,
      maxZoom: this.maxZoom,
      currentZoom: state.zoom,
      setZoom: state.actions.setZoom,
      mousePosition: anchor,
      currentOffset: state.viewPortOffset,
      setCamera: anchor ? state.actions.setCamera : undefined,
    });
  }

  public zoomIn(zoom = this.zoomStep) {
    this.zoomInOut(zoom);
  }

  public zoomOut(zoom = this.zoomStep) {
    this.zoomInOut(-zoom);
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
        state.actions.activateTool(currentTool);
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
    const activeTool = state.actions.getActiveTool();
    if (activeTool?.onRender) {
      activeTool.onRender(this.ctx);
    }

    this.ctx.restore();

    // Let active tool render overlay
    if (activeTool?.onRenderOverlay) {
      activeTool.onRenderOverlay(this.ctx);
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
    this.ctx.save();
    this.ctx.translate(state.viewPortOffset.x, state.viewPortOffset.y);
    this.ctx.scale(state.zoom, state.zoom);
  }

  private drawPolygons() {
    const state = this.store.getState();

    // Get temporary polygons from the active tool
    const activeTool = state.actions.getActiveTool();
    const temporaryPolygons = activeTool?.getDrafts?.()?.polygons || [];

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

    // Label each vertex with its coordinates
    polygon.vertices.forEach((v) => {
      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = `${12 / state.zoom}px Arial`;
      const label = `${v.x}, ${v.y}`;
      this.ctx.fillText(label, v.x + 8 / state.zoom, v.y - 16 / state.zoom);
    });

    const center = debug.samplePoints[0];
    this.ctx.fillStyle = shouldBeGround ? "#00ff00" : "#ff0000";
    this.ctx.beginPath();
    this.ctx.arc(center.x, center.y, 5 / state.zoom, 0, 2 * Math.PI);
    this.ctx.fill();

    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = `${14 / state.zoom}px Arial`;
    this.ctx.fillText(
      `${shouldBeGround ? "ground" : "sky"}-${isClockwise ? "clockwise" : "counter-clockwise"}`,
      center.x + 8 / state.zoom,
      center.y + 5 / state.zoom
    );
  }

  private drawObjects() {
    if (!this.lgrLoaded) return;

    const state = this.store.getState();

    bikeRender({
      ctx: this.ctx,
      lgrSprites: this.lgrSprites,
      startX: state.start.x,
      startY: state.start.y,
    });

    const appleSprite = this.lgrSprites["qfood1"];
    if (appleSprite) {
      this.drawObjectSprite(
        appleSprite,
        state.apples.map(({ position }) => position),
        state.animateSprites
      );
    }

    const killerSprite = this.lgrSprites["qkiller"];
    if (killerSprite) {
      this.drawObjectSprite(killerSprite, state.killers, state.animateSprites);
    }

    const exitSprite = this.lgrSprites["qexit"];
    if (exitSprite) {
      this.drawObjectSprite(exitSprite, state.flowers, state.animateSprites);
    }
  }

  private drawObjectSprite(
    sprite: ImageBitmap,
    positions: Array<{ x: number; y: number }>,
    animate = false,
    opacity = 1
  ) {
    const frameWidth = OBJECT_FRAME_PX;
    const frameHeight = Math.min(OBJECT_FRAME_PX, sprite.height);
    const frames = Math.max(1, Math.floor(sprite.width / frameWidth));
    const frameIndex = animate
      ? Math.floor((performance.now() / 1000) * OBJECT_FPS) % frames
      : 0;
    const sx = frameIndex * frameWidth;
    const sy = 0;

    const targetHeight = OBJECT_DIAMETER;
    const targetWidth = (frameWidth / frameHeight) * targetHeight;

    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    positions.forEach((position) => {
      this.ctx.drawImage(
        sprite,
        sx,
        sy,
        frameWidth,
        frameHeight,
        position.x - targetWidth / 2,
        position.y - targetHeight / 2,
        targetWidth,
        targetHeight
      );
    });
    this.ctx.restore();
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

    const lines = [
      "Debug Mode: ON",
      "Press 'D' to exit debug mode",
      `Mouse: (${state.mousePosition.x.toFixed(1)}, ${state.mousePosition.y.toFixed(1)})`,
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
