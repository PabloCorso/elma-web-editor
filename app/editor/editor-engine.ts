import { useStore } from "./useStore";
import { SpriteManager } from "./sprite-manager";
import { ObjectRenderer } from "./utils/object-renderer";
import {
  getEventContext,
  getTouchContext,
  getTouchDistance,
  getTouchMidpoint,
  isUserTyping,
} from "./utils/event-handler";
import { isWithinThreshold } from "./utils/coordinate-utils";
import { updateCamera, updateZoom, fitToView } from "./utils/camera-utils";
import {
  findVertexNearPosition,
  findObjectNearPosition,
  isVertexSelected,
  isObjectSelected,
  getAllObjects,
  isPointInRect,
  getSelectionBounds,
} from "./utils/selection-utils";
import {
  isPolygonClockwise,
  shouldPolygonBeGround,
  debugPolygonOrientation,
} from "./helpers";
import { colors } from "./constants";
import type { Polygon, Position } from "elmajs";
import { initialLevelData, type LevelData } from "./level-importer";

export class EditorEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private spriteManager: SpriteManager;
  private objectRenderer: ObjectRenderer;
  private debugMode = false;

  // Camera system
  private minZoom = 0.1;
  private maxZoom = 200;
  private panSpeed = 1.0;

  // Navigation state
  private isPanning = false;
  private lastPanX = 0;
  private lastPanY = 0;
  private lastPinchDistance = 0;

  // Selection and dragging state
  private isDragging = false;
  private dragStartPos: Position = { x: 0, y: 0 };

  // Marquee selection state
  private isMarqueeSelecting = false;
  private marqueeStartPos: Position = { x: 0, y: 0 };
  private marqueeEndPos: Position = { x: 0, y: 0 };

  // Long-press detection for mobile
  private longPressThreshold: number;
  private longPressTimer: number | null = null;
  private isLongPress = false;

  constructor(
    canvas: HTMLCanvasElement,
    {
      initialLevel = initialLevelData,
      minZoom = 0.1,
      maxZoom = 200,
      longPressThreshold = 100,
    }: {
      initialLevel?: LevelData;
      minZoom?: number;
      maxZoom?: number;
      longPressThreshold?: number;
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
    this.longPressThreshold = longPressThreshold;

    this.setupEventListeners();
    this.setupStoreListeners();

    useStore.setState(initialLevel);
    this.startRenderLoop();
    this.fitToView();
  }

  private setupEventListeners() {
    this.canvas.addEventListener("mousedown", this.handleMouseDown);
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    this.canvas.addEventListener("mouseup", this.handleMouseUp);
    this.canvas.addEventListener("contextmenu", this.handleRightClick);
    this.canvas.addEventListener("wheel", this.handleWheel);
    this.canvas.addEventListener("touchstart", this.handleTouchStart);
    this.canvas.addEventListener("touchmove", this.handleTouchMove);
    this.canvas.addEventListener("touchend", this.handleTouchEnd);
    document.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("resize", this.handleResize);
  }

  private handleMouseDown = (e: MouseEvent) => {
    const state = useStore.getState();
    const context = getEventContext(
      e,
      this.canvas,
      state.viewPortOffset,
      state.zoom
    );

    if (e.button === 1) {
      e.preventDefault();
      this.startPanning(e.clientX, e.clientY);
      return;
    }

    if (e.button === 0) {
      this.handleLeftClick(context);
    }
  };

  private handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    const state = useStore.getState();
    const touchContext = getTouchContext(e.touches);

    if (touchContext.isMultiTouch) {
      this.startMultiTouchPanning(touchContext);
      return;
    }

    if (touchContext.touch1) {
      const context = getEventContext(
        touchContext.touch1,
        this.canvas,
        state.viewPortOffset,
        state.zoom
      );

      if (this.isMobile()) {
        // On mobile, handle differently based on tool
        if (state.currentTool === "select") {
          // For select tool, use long-press to activate selection
          this.isLongPress = false;
          this.longPressTimer = window.setTimeout(() => {
            this.isLongPress = true;
            this.handleSelectionClick(context);
          }, this.longPressThreshold);
        } else {
          // For other tools (polygon, apple, killer, flower), execute immediately
          this.handleLeftClick(context);
        }
      } else {
        // Desktop: immediate action for all tools
        this.handleLeftClick(context);
      }
    }
  };

  private handleLeftClick(context: any) {
    const store = useStore.getState();

    if (store.currentTool === "polygon") {
      this.handlePolygonClick(context.worldPos);
    } else if (store.currentTool === "apple") {
      store.addApple(context.worldPos);
    } else if (store.currentTool === "killer") {
      store.addKiller(context.worldPos);
    } else if (store.currentTool === "flower") {
      store.addFlower(context.worldPos);
    } else if (store.currentTool === "select") {
      this.handleSelectionClick(context);
    }
  }

  private handlePolygonClick(worldPos: Position) {
    const store = useStore.getState();

    if (store.drawingPolygon.length >= 3) {
      const firstPoint = store.drawingPolygon[0];
      if (isWithinThreshold(worldPos, firstPoint, 15, store.zoom)) {
        this.finishPolygon();
        return;
      }
    }

    const newVertices = [...store.drawingPolygon, worldPos];
    store.setDrawingPolygon(newVertices);
  }

  private handleSelectionClick(context: any) {
    const store = useStore.getState();
    const vertex = findVertexNearPosition(
      context.worldPos,
      store.polygons,
      10,
      store.zoom
    );
    const object = this.findObjectNearPosition(context.worldPos);

    if (vertex) {
      this.handleVertexSelection(vertex, context.isCtrlKey);
      this.startDragging(context.worldPos);
    } else if (object) {
      this.handleObjectSelection(object, context.isCtrlKey);
      this.startDragging(context.worldPos);
    } else {
      this.startMarqueeSelection(context.worldPos, context.isCtrlKey);
    }
  }

  private findObjectNearPosition(pos: Position): Position | null {
    const store = useStore.getState();

    const apple = findObjectNearPosition(pos, store.apples, 15, store.zoom);
    if (apple) return apple;

    const killer = findObjectNearPosition(pos, store.killers, 15, store.zoom);
    if (killer) return killer;

    const flower = findObjectNearPosition(pos, store.flowers, 15, store.zoom);
    if (flower) return flower;

    if (isWithinThreshold(pos, store.start, 15, store.zoom)) {
      return store.start;
    }

    return null;
  }

  private handleVertexSelection(vertex: any, isCtrlKey: boolean) {
    const store = useStore.getState();
    const isSelected = isVertexSelected(vertex, store.selectedVertices);

    if (!isCtrlKey && !isSelected) {
      store.clearSelection();
    }

    if (!isSelected) {
      store.selectVertex(vertex.polygon, vertex.vertex);
    }
  }

  private handleObjectSelection(object: Position, isCtrlKey: boolean) {
    const store = useStore.getState();
    const isSelected = isObjectSelected(object, store.selectedObjects);

    if (!isCtrlKey && !isSelected) {
      store.clearSelection();
    }

    if (!isSelected) {
      store.selectObject(object);
    }
  }

  private startPanning(clientX: number, clientY: number) {
    this.isPanning = true;
    this.lastPanX = clientX;
    this.lastPanY = clientY;
  }

  private startMultiTouchPanning(touchContext: any) {
    this.isPanning = true;
    if (touchContext.touch1 && touchContext.touch2) {
      this.lastPanX =
        (touchContext.touch1.clientX + touchContext.touch2.clientX) / 2;
      this.lastPanY =
        (touchContext.touch1.clientY + touchContext.touch2.clientY) / 2;
      this.lastPinchDistance = getTouchDistance(
        touchContext.touch1,
        touchContext.touch2
      );
    }
  }

  private startDragging(worldPos: Position) {
    this.isDragging = true;
    this.dragStartPos = worldPos;
  }

  private startMarqueeSelection(worldPos: Position, isCtrlKey: boolean) {
    const store = useStore.getState();
    if (!isCtrlKey) {
      store.clearSelection();
    }
    this.isMarqueeSelecting = true;
    this.marqueeStartPos = worldPos;
    this.marqueeEndPos = worldPos;
  }

  private finishPolygon() {
    const store = useStore.getState();
    const newPolygon = {
      vertices: [...store.drawingPolygon],
      grass: false,
    };
    store.addPolygon(newPolygon);
    store.setDrawingPolygon([]);
  }

  private handleMouseMove = (e: MouseEvent) => {
    const state = useStore.getState();
    const context = getEventContext(
      e,
      this.canvas,
      state.viewPortOffset,
      state.zoom
    );

    if (this.isPanning) {
      const deltaX = e.clientX - this.lastPanX;
      const deltaY = e.clientY - this.lastPanY;
      updateCamera(deltaX, deltaY, this.panSpeed);
      this.lastPanX = e.clientX;
      this.lastPanY = e.clientY;
      return;
    }

    if (this.isDragging) {
      this.handleDragging(context.worldPos);
      return;
    }

    if (this.isMarqueeSelecting) {
      this.marqueeEndPos = context.worldPos;
      return;
    }

    useStore.getState().setMousePosition(context.worldPos);
  };

  private handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    const state = useStore.getState();
    const touchContext = getTouchContext(e.touches);

    if (touchContext.isMultiTouch) {
      this.handleMultiTouchZoom(touchContext);
      return;
    }

    if (touchContext.touch1) {
      const context = getEventContext(
        touchContext.touch1,
        this.canvas,
        state.viewPortOffset,
        state.zoom
      );

      // On mobile, if we start moving before long press, cancel the timer and start panning
      if (this.isMobile() && this.longPressTimer && !this.isLongPress) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
        this.startPanning(
          touchContext.touch1.clientX,
          touchContext.touch1.clientY
        );
      }

      if (this.isDragging) {
        this.handleDragging(context.worldPos);
      } else if (this.isMarqueeSelecting) {
        this.marqueeEndPos = context.worldPos;
      } else if (this.isPanning) {
        const deltaX = e.touches[0].clientX - this.lastPanX;
        const deltaY = e.touches[0].clientY - this.lastPanY;
        updateCamera(deltaX, deltaY, this.panSpeed);
        this.lastPanX = e.touches[0].clientX;
        this.lastPanY = e.touches[0].clientY;
      }
    }
  };

  private handleMultiTouchZoom(touchContext: any) {
    if (!touchContext.touch1 || !touchContext.touch2) return;

    const newDist = getTouchDistance(touchContext.touch1, touchContext.touch2);
    if (this.lastPinchDistance > 0) {
      const distanceChange = Math.abs(newDist - this.lastPinchDistance);
      const minDistanceChange = 5;

      if (distanceChange > minDistanceChange) {
        const zoomFactor = newDist / this.lastPinchDistance;
        const smoothedZoomFactor = 1 + (zoomFactor - 1) * 0.3;
        const currentZoom = useStore.getState().zoom;
        const newZoom = Math.max(
          this.minZoom,
          Math.min(this.maxZoom, currentZoom * smoothedZoomFactor)
        );

        if (newZoom !== currentZoom) {
          const mid = getTouchMidpoint(
            touchContext.touch1,
            touchContext.touch2
          );
          const rect =
            this.canvas.parentElement?.getBoundingClientRect() ||
            this.canvas.getBoundingClientRect();
          const scaleX = this.canvas.width / rect.width;
          const scaleY = this.canvas.height / rect.height;
          const midScreenX = (mid.clientX - rect.left) * scaleX;
          const midScreenY = (mid.clientY - rect.top) * scaleY;

          updateZoom(
            newZoom,
            this.minZoom,
            this.maxZoom,
            midScreenX,
            midScreenY
          );
        }
      }
    }
    this.lastPinchDistance = newDist;
  }

  private handleDragging(worldPos: Position) {
    const store = useStore.getState();
    const deltaX = worldPos.x - this.dragStartPos.x;
    const deltaY = worldPos.y - this.dragStartPos.y;

    if (store.selectedVertices.length > 0) {
      const newVertexPositions = store.selectedVertices.map((sv) => ({
        x: sv.vertex.x + deltaX,
        y: sv.vertex.y + deltaY,
      }));
      store.updateSelectedVertices(newVertexPositions);
    }

    if (store.selectedObjects.length > 0) {
      const newObjectPositions = store.selectedObjects.map((obj) => ({
        x: obj.x + deltaX,
        y: obj.y + deltaY,
      }));
      store.updateSelectedObjects(newObjectPositions);
    }

    this.dragStartPos = worldPos;
  }

  private handleMouseUp = (e: MouseEvent) => {
    if (e.button === 1) {
      this.isPanning = false;
    }

    if (e.button === 0) {
      this.isPanning = false;
      this.isDragging = false;

      if (this.isMarqueeSelecting) {
        this.finalizeMarqueeSelection();
        this.isMarqueeSelecting = false;
      }
    }
  };

  private handleTouchEnd = (e: TouchEvent) => {
    // Clear long press timer if it exists (only set in select mode)
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    if (e.touches.length === 0) {
      const store = useStore.getState();

      // Stop panning
      this.isPanning = false;
      this.lastPinchDistance = 0;

      if (store.currentTool === "select") {
        if (this.isMarqueeSelecting) {
          this.finalizeMarqueeSelection();
          this.isMarqueeSelecting = false;
        }
        if (this.isDragging) {
          this.isDragging = false;
        }
      }

      // Reset long press state
      this.isLongPress = false;
    }
  };

  private finalizeMarqueeSelection() {
    const state = useStore.getState();
    const bounds = getSelectionBounds(this.marqueeStartPos, this.marqueeEndPos);

    // Select vertices within the marquee
    state.polygons.forEach((polygon) => {
      polygon.vertices.forEach((vertex) => {
        if (
          isPointInRect(
            vertex,
            bounds.minX,
            bounds.maxX,
            bounds.minY,
            bounds.maxY
          )
        ) {
          const isSelected = state.selectedVertices.some(
            (sv) => sv.polygon === polygon && sv.vertex === vertex
          );
          if (!isSelected) {
            state.selectVertex(polygon, vertex);
          }
        }
      });
    });

    // Select objects within the marquee
    const allObjects = getAllObjects(
      state.apples,
      state.killers,
      state.flowers,
      state.start
    );
    allObjects.forEach(({ obj }) => {
      if (
        isPointInRect(obj, bounds.minX, bounds.maxX, bounds.minY, bounds.maxY)
      ) {
        const isSelected = state.selectedObjects.includes(obj);
        if (!isSelected) {
          state.selectObject(obj);
        }
      }
    });
  }

  private handleRightClick = (e: MouseEvent) => {
    e.preventDefault();
    const store = useStore.getState();

    if (store.currentTool === "polygon" && store.drawingPolygon.length >= 3) {
      this.finishPolygon();
    } else if (store.drawingPolygon.length > 0) {
      store.setDrawingPolygon([]);
    }
  };

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (e.metaKey || e.ctrlKey) {
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const currentZoom = useStore.getState().zoom;
      const newZoom = currentZoom * zoomFactor;
      updateZoom(newZoom, this.minZoom, this.maxZoom, mouseX, mouseY);
      return;
    }

    if (e.shiftKey) {
      const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
      const panAmount = -delta * 0.5;
      updateCamera(panAmount, 0, this.panSpeed);
      return;
    }

    const panAmount = -e.deltaY * 0.5;
    updateCamera(0, panAmount, this.panSpeed);
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (isUserTyping()) return;

    const panAmount = 50 / useStore.getState().zoom;
    const zoomAmount = 0.1;

    switch (e.key) {
      case "Escape":
        useStore.getState().setDrawingPolygon([]);
        useStore.getState().clearSelection();
        break;

      case "ArrowLeft":
        e.preventDefault();
        updateCamera(panAmount, 0, this.panSpeed);
        break;

      case "ArrowRight":
        e.preventDefault();
        updateCamera(-panAmount, 0, this.panSpeed);
        break;

      case "ArrowUp":
        e.preventDefault();
        updateCamera(0, panAmount, this.panSpeed);
        break;

      case "ArrowDown":
        e.preventDefault();
        updateCamera(0, -panAmount, this.panSpeed);
        break;

      case "+":
      case "=":
        e.preventDefault();
        const currentZoom = useStore.getState().zoom;
        updateZoom(currentZoom + zoomAmount, this.minZoom, this.maxZoom);
        break;

      case "-":
      case "_":
        e.preventDefault();
        const currentZoom2 = useStore.getState().zoom;
        updateZoom(currentZoom2 - zoomAmount, this.minZoom, this.maxZoom);
        break;

      case "1":
        e.preventDefault();
        this.fitToView();
        break;

      case "d":
      case "D":
        e.preventDefault();
        this.toggleDebugMode();
        break;

      case "Delete":
      case "Backspace":
        e.preventDefault();
        this.deleteSelection();
        break;
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    // Space key handling removed - no longer needed without hand tool
  };

  private handleResize = () => {
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
    }
  };

  private deleteSelection() {
    const state = useStore.getState();

    // Group selected vertices by polygon index
    const verticesByPolygonIndex = new Map<number, Position[]>();
    state.selectedVertices.forEach(({ polygon, vertex }) => {
      const polygonIndex = state.polygons.indexOf(polygon);
      if (polygonIndex !== -1) {
        if (!verticesByPolygonIndex.has(polygonIndex)) {
          verticesByPolygonIndex.set(polygonIndex, []);
        }
        verticesByPolygonIndex.get(polygonIndex)!.push(vertex);
      }
    });

    // Delete vertices from each polygon
    const sortedPolygonIndices = Array.from(verticesByPolygonIndex.keys()).sort(
      (a, b) => b - a
    );
    sortedPolygonIndices.forEach((polygonIndex) => {
      const polygon = state.polygons[polygonIndex];
      const verticesToDelete = verticesByPolygonIndex.get(polygonIndex)!;

      if (polygon) {
        const updatedVertices = polygon.vertices.filter(
          (vertex) => !verticesToDelete.includes(vertex)
        );

        if (updatedVertices.length < 3) {
          state.removePolygon(polygonIndex);
        } else {
          state.updatePolygon(polygonIndex, {
            ...polygon,
            vertices: updatedVertices,
          });
        }
      }
    });

    // Delete selected objects
    state.selectedObjects.forEach((object) => {
      if (state.apples.includes(object)) {
        state.removeApple(object);
      } else if (state.killers.includes(object)) {
        state.removeKiller(object);
      } else if (state.flowers.includes(object)) {
        state.removeFlower(object);
      }
    });

    state.clearSelection();
  }

  public fitToView() {
    const state = useStore.getState();
    fitToView(this.canvas, state.polygons, this.minZoom, this.maxZoom);
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
    const state = useStore.getState();
    this.updateCursor(state);
    this.clearCanvas();
    this.applyCameraTransform(state);
    this.drawPolygonsWithWindingRule();
    this.drawDrawingPolygon();
    this.drawObjects();
    this.drawSelectionHandles();
    this.drawMarqueeSelection();
    this.ctx.restore();

    if (this.debugMode) {
      this.drawDebugInfoPanel();
    }
  }

  private updateCursor(state: any) {
    if (this.isPanning) {
      this.canvas.style.cursor = "grabbing";
    } else if (state.currentTool === "select") {
      this.canvas.style.cursor = "default";
    } else {
      this.canvas.style.cursor = "crosshair";
    }
  }

  private clearCanvas() {
    this.ctx.fillStyle = colors.ground;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private applyCameraTransform(state: any) {
    this.ctx.save();
    this.ctx.translate(state.viewPortOffset.x, state.viewPortOffset.y);
    this.ctx.scale(state.zoom, state.zoom);
  }

  private drawPolygonsWithWindingRule() {
    const state = useStore.getState();

    if (state.polygons.length === 0) return;

    // Draw non-grass polygons with fill
    this.ctx.fillStyle = colors.sky;
    this.ctx.beginPath();

    state.polygons.forEach((polygon) => {
      if (polygon.vertices.length < 3 || polygon.grass) return;

      let vertices = [...polygon.vertices];
      const isClockwise = isPolygonClockwise(vertices);
      const shouldBeGround = shouldPolygonBeGround(polygon, state.polygons);

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
      const shouldBeGround = shouldPolygonBeGround(polygon, state.polygons);

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
    const state = useStore.getState();
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

  private drawDrawingPolygon() {
    const state = useStore.getState();

    if (state.drawingPolygon.length === 0) return;

    this.ctx.strokeStyle = colors.edges;
    this.ctx.lineWidth = 1 / state.zoom;

    this.ctx.beginPath();
    this.ctx.moveTo(state.drawingPolygon[0].x, state.drawingPolygon[0].y);

    for (let i = 1; i < state.drawingPolygon.length; i++) {
      this.ctx.lineTo(state.drawingPolygon[i].x, state.drawingPolygon[i].y);
    }

    this.ctx.stroke();

    if (state.drawingPolygon.length > 0 && !this.isMobile()) {
      const lastPoint = state.drawingPolygon[state.drawingPolygon.length - 1];
      this.ctx.strokeStyle = colors.edges;
      this.ctx.lineWidth = 1 / state.zoom;
      this.ctx.setLineDash([5 / state.zoom, 5 / state.zoom]);
      this.ctx.beginPath();
      this.ctx.moveTo(lastPoint.x, lastPoint.y);
      this.ctx.lineTo(state.mousePosition.x, state.mousePosition.y);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    this.ctx.fillStyle = colors.edges;
    state.drawingPolygon.forEach((vertex) => {
      this.ctx.beginPath();
      this.ctx.arc(vertex.x, vertex.y, 2 / state.zoom, 0, 2 * Math.PI);
      this.ctx.fill();
    });
  }

  private drawObjects() {
    const state = useStore.getState();
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

  private drawSelectionHandles() {
    const state = useStore.getState();
    this.ctx.fillStyle = colors.selection;
    const handleSize = Math.max(0.5, Math.min(10, 3 / state.zoom));

    state.selectedVertices.forEach(({ vertex }) => {
      this.ctx.fillRect(
        vertex.x - handleSize,
        vertex.y - handleSize,
        handleSize * 2,
        handleSize * 2
      );
    });

    state.selectedObjects.forEach((object) => {
      this.ctx.fillRect(
        object.x - handleSize,
        object.y - handleSize,
        handleSize * 2,
        handleSize * 2
      );
    });
  }

  private drawMarqueeSelection() {
    if (!this.isMarqueeSelecting) return;

    const bounds = getSelectionBounds(this.marqueeStartPos, this.marqueeEndPos);
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;

    this.ctx.fillStyle = "rgba(255, 255, 0, 0.2)";
    this.ctx.fillRect(bounds.minX, bounds.minY, width, height);

    this.ctx.strokeStyle = "#ffff00";
    this.ctx.lineWidth = Math.max(
      0.5,
      Math.min(10, 2 / useStore.getState().zoom)
    );
    this.ctx.setLineDash([
      5 / useStore.getState().zoom,
      5 / useStore.getState().zoom,
    ]);
    this.ctx.strokeRect(bounds.minX, bounds.minY, width, height);
    this.ctx.setLineDash([]);
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
    this.canvas.removeEventListener("touchstart", this.handleTouchStart);
    this.canvas.removeEventListener("touchmove", this.handleTouchMove);
    this.canvas.removeEventListener("touchend", this.handleTouchEnd);
    document.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("resize", this.handleResize);
  }

  public toggleDebugMode() {
    this.debugMode = !this.debugMode;
    console.debug("Debug mode:", this.debugMode ? "ON" : "OFF");
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

  private isMobile(): boolean {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }
}
