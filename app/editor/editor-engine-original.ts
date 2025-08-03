import { useStore } from "./useStore";
import { colors } from "./constants";
import {
  isPolygonClockwise,
  shouldPolygonBeGround,
  debugPolygonOrientation,
} from "./helpers";
import type { Position, Polygon } from "elmajs";
import { SpriteManager } from "./sprite-manager";
import { LevelImporter } from "./level-importer";
import type { EditorTool } from "./useStore";

export class EditorEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private spriteManager: SpriteManager;
  private debugMode: boolean = false; // Add debug mode flag

  // Camera system (matching reference editor)
  private readonly MIN_ZOOM = 0.1;
  private readonly MAX_ZOOM = 200; // Allow much deeper zoom like reference editor
  private readonly PAN_SPEED = 1.0;

  // Navigation state
  private isPanning: boolean = false;
  private lastPanX: number = 0;
  private lastPanY: number = 0;
  private lastPinchDistance: number = 0;

  // Selection and dragging state
  private isDragging: boolean = false;
  private dragStartPos: Position = { x: 0, y: 0 };

  // Marquee selection state
  private isMarqueeSelecting: boolean = false;
  private marqueeStartPos: Position = { x: 0, y: 0 };
  private marqueeEndPos: Position = { x: 0, y: 0 };

  // Hand tool state
  private isSpacePressed: boolean = false;
  private previousTool: EditorTool = "select";

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context missing");
    this.ctx = ctx;
    this.spriteManager = new SpriteManager();

    this.setupEventListeners();
    this.setupStoreListeners();
    this.startRenderLoop();

    // Load QWQUU001.lev by default
    this.loadDefaultLevel();
  }

  private setupEventListeners() {
    // Mouse events
    this.canvas.addEventListener("mousedown", this.handleMouseDown);
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    this.canvas.addEventListener("mouseup", this.handleMouseUp);
    this.canvas.addEventListener("contextmenu", this.handleRightClick);
    this.canvas.addEventListener("wheel", this.handleWheel);

    // Touch events
    this.canvas.addEventListener("touchstart", this.handleTouchStart);
    this.canvas.addEventListener("touchmove", this.handleTouchMove);
    this.canvas.addEventListener("touchend", this.handleTouchEnd);

    // Keyboard events
    document.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("keyup", this.handleKeyUp); // Add keyup listener
    window.addEventListener("resize", this.handleResize);
  }

  private handleMouseDown = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = this.screenToWorld(screenX, screenY);

    // Middle mouse button (button 1) for panning
    if (e.button === 1) {
      e.preventDefault();
      this.isPanning = true;
      this.lastPanX = e.clientX;
      this.lastPanY = e.clientY;
      return;
    }

    // Left mouse button for tools
    if (e.button === 0) {
      const store = useStore.getState();

      if (store.currentTool === "polygon") {
        // Check if we're clicking near the first point to finish the polygon
        if (store.drawingPolygon.length >= 3) {
          const firstPoint = store.drawingPolygon[0];
          const distance = Math.sqrt(
            Math.pow(worldPos.x - firstPoint.x, 2) +
              Math.pow(worldPos.y - firstPoint.y, 2)
          );
          const threshold = 15 / store.zoom; // Allow some leeway based on zoom level

          if (distance <= threshold) {
            // Finish the polygon by adding it to the polygons array
            const newPolygon = {
              vertices: [...store.drawingPolygon],
              grass: false,
            };
            store.addPolygon(newPolygon);
            store.setDrawingPolygon([]); // Clear the drawing polygon
            return;
          }
        }

        // Add vertex to drawing polygon
        const newVertices = [...store.drawingPolygon, worldPos];
        useStore.getState().setDrawingPolygon(newVertices);
      } else if (store.currentTool === "apple") {
        useStore.getState().addApple(worldPos);
      } else if (store.currentTool === "killer") {
        useStore.getState().addKiller(worldPos);
      } else if (store.currentTool === "flower") {
        useStore.getState().addFlower(worldPos);
      } else if (store.currentTool === "hand") {
        // Start panning with hand tool
        this.isPanning = true;
        this.lastPanX = e.clientX;
        this.lastPanY = e.clientY;
      } else if (store.currentTool === "select") {
        // Handle selection and dragging
        const vertex = this.findVertexNearPosition(worldPos);
        const object = this.findObjectNearPosition(worldPos);

        if (vertex) {
          // Check if vertex is already selected
          const isSelected = store.selectedVertices.some(
            (sv) => sv.polygon === vertex.polygon && sv.vertex === vertex.vertex
          );

          if (!e.ctrlKey && !isSelected) {
            // Clear other selections if not holding Ctrl
            store.clearSelection();
          }

          if (!isSelected) {
            store.selectVertex(vertex.polygon, vertex.vertex);
          }

          // Start dragging
          this.isDragging = true;
          this.dragStartPos = worldPos;
        } else if (object) {
          // Check if object is already selected
          const isSelected = store.selectedObjects.includes(object);

          if (!e.ctrlKey && !isSelected) {
            // Clear other selections if not holding Ctrl
            store.clearSelection();
          }

          if (!isSelected) {
            store.selectObject(object);
          }

          // Start dragging
          this.isDragging = true;
          this.dragStartPos = worldPos;
        } else {
          // Clicked on empty space - start marquee selection
          if (!e.ctrlKey) {
            store.clearSelection();
          }

          // Start marquee selection
          this.isMarqueeSelecting = true;
          this.marqueeStartPos = worldPos;
          this.marqueeEndPos = worldPos;
        }
      }
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (e.button === 1) {
      this.isPanning = false;
    }

    // Stop dragging and marquee selection
    if (e.button === 0) {
      // Stop panning if hand tool is active
      if (useStore.getState().currentTool === "hand") {
        this.isPanning = false;
      }

      this.isDragging = false;

      // Finalize marquee selection
      if (this.isMarqueeSelecting) {
        this.finalizeMarqueeSelection();
        this.isMarqueeSelecting = false;
      }
    }
  };

  private handleMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = this.screenToWorld(screenX, screenY);

    // Handle panning
    if (this.isPanning) {
      const deltaX = e.clientX - this.lastPanX;
      const deltaY = e.clientY - this.lastPanY;

      const currentCamera = useStore.getState();
      useStore
        .getState()
        .setCamera(
          currentCamera.viewPortOffset.x + deltaX * this.PAN_SPEED,
          currentCamera.viewPortOffset.y + deltaY * this.PAN_SPEED
        );

      this.lastPanX = e.clientX;
      this.lastPanY = e.clientY;
      return;
    }

    // Handle dragging selected vertices and objects
    if (this.isDragging) {
      const store = useStore.getState();
      const deltaX = worldPos.x - this.dragStartPos.x;
      const deltaY = worldPos.y - this.dragStartPos.y;

      // Update selected vertices
      if (store.selectedVertices.length > 0) {
        const newVertexPositions = store.selectedVertices.map((sv) => ({
          x: sv.vertex.x + deltaX,
          y: sv.vertex.y + deltaY,
        }));
        store.updateSelectedVertices(newVertexPositions);
      }

      // Update selected objects
      if (store.selectedObjects.length > 0) {
        const newObjectPositions = store.selectedObjects.map((obj) => ({
          x: obj.x + deltaX,
          y: obj.y + deltaY,
        }));
        store.updateSelectedObjects(newObjectPositions);
      }

      // Update drag start position for next frame
      this.dragStartPos = worldPos;
      return;
    }

    // Handle marquee selection updates
    if (this.isMarqueeSelecting) {
      this.marqueeEndPos = worldPos;
      return;
    }

    // Update mouse position for polygon drawing preview
    useStore.getState().setMousePosition(worldPos);
  };

  private handleRightClick = (e: MouseEvent) => {
    e.preventDefault();
    const store = useStore.getState();

    if (store.currentTool === "polygon" && store.drawingPolygon.length >= 3) {
      // Finish the polygon
      const polygon = {
        vertices: [...store.drawingPolygon],
        grass: false,
      };
      useStore.getState().addPolygon(polygon);
      useStore.getState().setDrawingPolygon([]);
    } else if (store.drawingPolygon.length > 0) {
      // Cancel current polygon
      useStore.getState().setDrawingPolygon([]);
    }
  };

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Figma-style controls:
    // - Scroll: Pan up/down
    // - Shift+scroll: Pan left/right
    // - Cmd/Ctrl+scroll: Zoom in/out

    // Cmd/Ctrl+scroll for zooming
    if (e.metaKey || e.ctrlKey) {
      // Convert screen coordinates to world coordinates
      const worldX =
        (mouseX - useStore.getState().viewPortOffset.x) /
        useStore.getState().zoom;
      const worldY =
        (mouseY - useStore.getState().viewPortOffset.y) /
        useStore.getState().zoom;

      // Calculate zoom factor
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const currentZoom = useStore.getState().zoom;
      const newZoom = Math.max(
        this.MIN_ZOOM,
        Math.min(this.MAX_ZOOM, currentZoom * zoomFactor)
      );

      // Only update if zoom actually changed
      if (newZoom !== currentZoom) {
        useStore.getState().setZoom(newZoom);

        // Adjust viewport to keep mouse position fixed
        const newViewPortX = mouseX - worldX * newZoom;
        const newViewPortY = mouseY - worldY * newZoom;
        useStore.getState().setCamera(newViewPortX, newViewPortY);
      }
      return;
    }

    // Shift+scroll for horizontal panning
    if (e.shiftKey) {
      // When Shift is held, deltaX might be available for horizontal scrolling
      // If not, use deltaY as fallback
      const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
      const panAmount = -delta * 0.5;
      const currentCamera = useStore.getState();
      useStore
        .getState()
        .setCamera(
          currentCamera.viewPortOffset.x + panAmount,
          currentCamera.viewPortOffset.y
        );
      return;
    }

    // Normal scroll for vertical panning
    const panAmount = -e.deltaY * 0.5;
    const currentCamera = useStore.getState();
    useStore
      .getState()
      .setCamera(
        currentCamera.viewPortOffset.x,
        currentCamera.viewPortOffset.y + panAmount
      );
  };

  private handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();

    if (e.touches.length === 2) {
      // Two-finger gesture - panning and zooming
      this.isPanning = true;
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      // Calculate center point for panning
      this.lastPanX = (touch1.clientX + touch2.clientX) / 2;
      this.lastPanY = (touch1.clientY + touch2.clientY) / 2;

      // Calculate initial pinch distance for zooming
      this.lastPinchDistance = this.getDistance(touch1, touch2);

      return;
    }

    if (e.touches.length === 1) {
      // Single touch - handle like mouse down
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const screenX = (touch.clientX - rect.left) * scaleX;
      const screenY = (touch.clientY - rect.top) * scaleY;
      const worldPos = this.screenToWorld(screenX, screenY);
      console.log(useStore.getState().apples);
      console.log({ touch, worldPos });

      const store = useStore.getState();

      if (store.currentTool === "polygon") {
        // Check if we're clicking near the first point to finish the polygon
        if (store.drawingPolygon.length >= 3) {
          const firstPoint = store.drawingPolygon[0];
          const distance = Math.sqrt(
            Math.pow(worldPos.x - firstPoint.x, 2) +
              Math.pow(worldPos.y - firstPoint.y, 2)
          );
          const threshold = 15 / store.zoom; // Allow some leeway based on zoom level

          if (distance <= threshold) {
            // Finish the polygon by adding it to the polygons array
            const newPolygon = {
              vertices: [...store.drawingPolygon],
              grass: false,
            };
            store.addPolygon(newPolygon);
            store.setDrawingPolygon([]); // Clear the drawing polygon
            return;
          }
        }

        // Add vertex to drawing polygon
        const newVertices = [...store.drawingPolygon, worldPos];
        useStore.getState().setDrawingPolygon(newVertices);
      } else if (store.currentTool === "apple") {
        useStore.getState().addApple(worldPos);
      } else if (store.currentTool === "killer") {
        useStore.getState().addKiller(worldPos);
      } else if (store.currentTool === "flower") {
        useStore.getState().addFlower(worldPos);
      } else if (store.currentTool === "hand") {
        // Start panning with hand tool
        this.isPanning = true;
        this.lastPanX = touch.clientX;
        this.lastPanY = touch.clientY;
      } else if (store.currentTool === "select") {
        // Handle selection and dragging
        const vertex = this.findVertexNearPosition(worldPos);
        const object = this.findObjectNearPosition(worldPos);

        if (vertex) {
          // Select vertex
          useStore.getState().selectVertex(vertex.polygon, vertex.vertex);
          this.isDragging = true;
          this.dragStartPos = worldPos;
        } else if (object) {
          // Select object
          useStore.getState().selectObject(object);
          this.isDragging = true;
          this.dragStartPos = worldPos;
        } else {
          // Start marquee selection
          this.isMarqueeSelecting = true;
          this.marqueeStartPos = worldPos;
          this.marqueeEndPos = worldPos;
        }
      }
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();

    if (e.touches.length === 2 && this.isPanning) {
      // Two-finger gesture - zooming only (no panning)
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      const currentCamera = useStore.getState();

      // Handle zooming
      const newDist = this.getDistance(touch1, touch2);
      if (this.lastPinchDistance > 0) {
        // Only zoom if the distance change is significant enough
        const distanceChange = Math.abs(newDist - this.lastPinchDistance);
        const minDistanceChange = 5; // Minimum pixels of distance change to trigger zoom

        if (distanceChange > minDistanceChange) {
          const zoomFactor = newDist / this.lastPinchDistance;
          // Make zoom less aggressive by using a smaller factor
          const smoothedZoomFactor = 1 + (zoomFactor - 1) * 0.3;
          const newZoom = Math.max(
            this.MIN_ZOOM,
            Math.min(this.MAX_ZOOM, currentCamera.zoom * smoothedZoomFactor)
          );

          if (newZoom !== currentCamera.zoom) {
            // Get the midpoint of the two touches
            const mid = this.getMidpoint(touch1, touch2);
            const rect =
              this.canvas.parentElement?.getBoundingClientRect() ||
              this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const midScreenX = (mid.clientX - rect.left) * scaleX;
            const midScreenY = (mid.clientY - rect.top) * scaleY;

            // Calculate what world position is currently under the midpoint
            const currentWorldX =
              midScreenX / currentCamera.zoom - currentCamera.viewPortOffset.x;
            const currentWorldY =
              midScreenY / currentCamera.zoom - currentCamera.viewPortOffset.y;

            // Calculate new camera offset to keep the same world position under the midpoint
            const newOffsetX = midScreenX / newZoom - currentWorldX;
            const newOffsetY = midScreenY / newZoom - currentWorldY;

            useStore.getState().setZoom(newZoom);
            useStore.getState().setCamera(newOffsetX, newOffsetY);
          }
        }
      }

      this.lastPinchDistance = newDist;
      return;
    }

    if (e.touches.length === 1) {
      // Single touch - handle like mouse move
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const screenX = touch.clientX - rect.left;
      const screenY = touch.clientY - rect.top;
      const worldPos = this.screenToWorld(screenX, screenY);

      const store = useStore.getState();

      // Update mouse position for drawing polygon preview
      useStore.getState().setMousePosition(worldPos);

      if (store.currentTool === "select") {
        if (this.isDragging) {
          // Drag selected items - calculate total delta from original position
          const deltaX = worldPos.x - this.dragStartPos.x;
          const deltaY = worldPos.y - this.dragStartPos.y;

          // Update selected vertices
          if (store.selectedVertices.length > 0) {
            const newPositions = store.selectedVertices.map((sv) => ({
              x: sv.vertex.x + deltaX,
              y: sv.vertex.y + deltaY,
            }));
            useStore.getState().updateSelectedVertices(newPositions);
          }

          // Update selected objects
          if (store.selectedObjects.length > 0) {
            const newPositions = store.selectedObjects.map((obj) => ({
              x: obj.x + deltaX,
              y: obj.y + deltaY,
            }));
            useStore.getState().updateSelectedObjects(newPositions);
          }
        } else if (this.isMarqueeSelecting) {
          // Update marquee selection
          this.marqueeEndPos = worldPos;
        }
      } else if (store.currentTool === "hand" && this.isPanning) {
        // Handle single-touch panning with hand tool
        const deltaX = touch.clientX - this.lastPanX;
        const deltaY = touch.clientY - this.lastPanY;

        const currentCamera = useStore.getState();
        useStore
          .getState()
          .setCamera(
            currentCamera.viewPortOffset.x + deltaX * this.PAN_SPEED,
            currentCamera.viewPortOffset.y + deltaY * this.PAN_SPEED
          );

        this.lastPanX = touch.clientX;
        this.lastPanY = touch.clientY;
      }
    }
  };

  private handleTouchEnd = (e: TouchEvent) => {
    if (e.touches.length < 2) {
      this.isPanning = false;
      this.lastPinchDistance = 0;
    }

    if (e.touches.length === 0) {
      // Touch ended - handle like mouse up
      const store = useStore.getState();

      // Stop panning if hand tool is active
      if (store.currentTool === "hand") {
        this.isPanning = false;
      }

      if (store.currentTool === "select") {
        if (this.isMarqueeSelecting) {
          // Finalize marquee selection
          this.finalizeMarqueeSelection();
          this.isMarqueeSelecting = false;
        }

        if (this.isDragging) {
          this.isDragging = false;
        }
      }
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    // Don't handle keyboard shortcuts if user is typing in an input field
    const activeElement = document.activeElement;
    if (
      activeElement &&
      (activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        activeElement.tagName === "SELECT" ||
        (activeElement as HTMLElement).contentEditable === "true")
    ) {
      return;
    }

    const panAmount = 50 / useStore.getState().zoom;
    const zoomAmount = 0.1;

    switch (e.key) {
      case "Escape":
        useStore.getState().setDrawingPolygon([]);
        useStore.getState().clearSelection();
        break;

      case "ArrowLeft":
        e.preventDefault();
        const currentCamera = useStore.getState();
        useStore
          .getState()
          .setCamera(
            currentCamera.viewPortOffset.x + panAmount,
            currentCamera.viewPortOffset.y
          );
        break;

      case "ArrowRight":
        e.preventDefault();
        const currentCamera2 = useStore.getState();
        useStore
          .getState()
          .setCamera(
            currentCamera2.viewPortOffset.x - panAmount,
            currentCamera2.viewPortOffset.y
          );
        break;

      case "ArrowUp":
        e.preventDefault();
        const currentCamera3 = useStore.getState();
        useStore
          .getState()
          .setCamera(
            currentCamera3.viewPortOffset.x,
            currentCamera3.viewPortOffset.y + panAmount
          );
        break;

      case "ArrowDown":
        e.preventDefault();
        const currentCamera4 = useStore.getState();
        useStore
          .getState()
          .setCamera(
            currentCamera4.viewPortOffset.x,
            currentCamera4.viewPortOffset.y - panAmount
          );
        break;

      case "+":
      case "=":
        e.preventDefault();
        const currentZoom = useStore.getState().zoom;
        useStore
          .getState()
          .setZoom(Math.min(this.MAX_ZOOM, currentZoom + zoomAmount));
        break;

      case "-":
      case "_":
        e.preventDefault();
        const currentZoom2 = useStore.getState().zoom;
        useStore
          .getState()
          .setZoom(Math.max(this.MIN_ZOOM, currentZoom2 - zoomAmount));
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

      case " ":
        e.preventDefault();
        if (!this.isSpacePressed) {
          this.isSpacePressed = true;
          this.previousTool = useStore.getState().currentTool;
          useStore.getState().setCurrentTool("hand");
        }
        break;

      case "Delete":
      case "Backspace":
        e.preventDefault();
        this.deleteSelection();
        break;
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (e.key === " ") {
      e.preventDefault();
      if (this.isSpacePressed) {
        this.isSpacePressed = false;
        useStore.getState().setCurrentTool(this.previousTool);
      }
    }
  };

  private handleResize = () => {
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
    }
  };

  private screenToWorld(screenX: number, screenY: number): Position {
    const state = useStore.getState();
    return {
      x: (screenX - state.viewPortOffset.x) / state.zoom,
      y: (screenY - state.viewPortOffset.y) / state.zoom,
    };
  }

  private getDynamicLineWidth(baseWidth: number = 1.0): number {
    const state = useStore.getState();
    // Scale line width inversely with zoom to maintain consistent visual thickness
    // Clamp to reasonable bounds to prevent lines from becoming too thin or too thick
    const scaledWidth = baseWidth / state.zoom;
    return Math.max(0.5, Math.min(10, scaledWidth));
  }

  private findVertexNearPosition(
    pos: Position,
    threshold: number = 10
  ): { polygon: Polygon; vertex: Position } | null {
    const state = useStore.getState();

    for (const polygon of state.polygons) {
      for (const vertex of polygon.vertices) {
        const distance = Math.sqrt(
          (pos.x - vertex.x) ** 2 + (pos.y - vertex.y) ** 2
        );
        if (distance <= threshold / state.zoom) {
          return { polygon, vertex };
        }
      }
    }
    return null;
  }

  private findObjectNearPosition(
    pos: Position,
    threshold: number = 15
  ): Position | null {
    const state = useStore.getState();

    // Check apples
    for (const apple of state.apples) {
      const distance = Math.sqrt(
        (pos.x - apple.x) ** 2 + (pos.y - apple.y) ** 2
      );
      if (distance <= threshold / state.zoom) {
        return apple;
      }
    }

    // Check killers
    for (const killer of state.killers) {
      const distance = Math.sqrt(
        (pos.x - killer.x) ** 2 + (pos.y - killer.y) ** 2
      );
      if (distance <= threshold / state.zoom) {
        return killer;
      }
    }

    // Check flowers
    for (const flower of state.flowers) {
      const distance = Math.sqrt(
        (pos.x - flower.x) ** 2 + (pos.y - flower.y) ** 2
      );
      if (distance <= threshold / state.zoom) {
        return flower;
      }
    }

    // Check start position
    const startDistance = Math.sqrt(
      (pos.x - state.start.x) ** 2 + (pos.y - state.start.y) ** 2
    );
    if (startDistance <= threshold / state.zoom) {
      return state.start;
    }

    return null;
  }

  private finalizeMarqueeSelection() {
    const state = useStore.getState();

    // Calculate selection bounds
    const minX = Math.min(this.marqueeStartPos.x, this.marqueeEndPos.x);
    const maxX = Math.max(this.marqueeStartPos.x, this.marqueeEndPos.x);
    const minY = Math.min(this.marqueeStartPos.y, this.marqueeEndPos.y);
    const maxY = Math.max(this.marqueeStartPos.y, this.marqueeEndPos.y);

    // Select vertices within the marquee
    state.polygons.forEach((polygon) => {
      polygon.vertices.forEach((vertex) => {
        if (
          vertex.x >= minX &&
          vertex.x <= maxX &&
          vertex.y >= minY &&
          vertex.y <= maxY
        ) {
          // Check if already selected
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
    const allObjects = [
      ...state.apples.map((apple) => ({ obj: apple, type: "apple" })),
      ...state.killers.map((killer) => ({ obj: killer, type: "killer" })),
      ...state.flowers.map((flower) => ({ obj: flower, type: "flower" })),
      { obj: state.start, type: "start" },
    ];

    allObjects.forEach(({ obj }) => {
      if (obj.x >= minX && obj.x <= maxX && obj.y >= minY && obj.y <= maxY) {
        // Check if already selected
        const isSelected = state.selectedObjects.includes(obj);
        if (!isSelected) {
          state.selectObject(obj);
        }
      }
    });
  }

  private deleteSelection() {
    const state = useStore.getState();

    // Group selected vertices by polygon index to handle multiple deletions properly
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

    // Sort polygon indices in descending order to avoid index shifting issues
    const sortedPolygonIndices = Array.from(verticesByPolygonIndex.keys()).sort(
      (a, b) => b - a
    );

    // Delete vertices from each polygon (working backwards to avoid index issues)
    sortedPolygonIndices.forEach((polygonIndex) => {
      const polygon = state.polygons[polygonIndex];
      const verticesToDelete = verticesByPolygonIndex.get(polygonIndex)!;

      if (polygon) {
        // Remove all selected vertices from this polygon
        const updatedVertices = polygon.vertices.filter(
          (vertex) => !verticesToDelete.includes(vertex)
        );

        // If polygon has less than 3 vertices after deletion, remove it entirely
        if (updatedVertices.length < 3) {
          state.removePolygon(polygonIndex);
        } else {
          // Update the polygon with remaining vertices
          state.updatePolygon(polygonIndex, {
            ...polygon,
            vertices: updatedVertices,
          });
        }
      }
    });

    // Delete selected objects
    state.selectedObjects.forEach((object) => {
      // Check which type of object it is and remove it accordingly
      if (state.apples.includes(object)) {
        state.removeApple(object);
      } else if (state.killers.includes(object)) {
        state.removeKiller(object);
      } else if (state.flowers.includes(object)) {
        state.removeFlower(object);
      }
      // Note: We don't delete the start position as it's required
    });

    // Clear selection after deletion
    state.clearSelection();
  }

  public fitToView() {
    const state = useStore.getState();

    // Default level bounds (1000x600)
    const levelWidth = 1000;
    const levelHeight = 600;

    if (state.polygons.length === 0) {
      // If no polygons, center on the level bounds
      const centerX = this.canvas.width / 2 - (levelWidth / 2) * 1;
      const centerY = this.canvas.height / 2 - (levelHeight / 2) * 1;
      useStore.getState().setCamera(centerX, centerY);
      useStore.getState().setZoom(1);
      return;
    }

    // Find the bounding box of all polygons
    let minX = Infinity,
      minY = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity;

    state.polygons.forEach((polygon) => {
      polygon.vertices.forEach((vertex) => {
        minX = Math.min(minX, vertex.x);
        minY = Math.min(minY, vertex.y);
        maxX = Math.max(maxX, vertex.x);
        maxY = Math.max(maxY, vertex.y);
      });
    });

    // Add some padding around the polygons
    const padding = 50;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    // Calculate the center of all polygons
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Calculate the size of the polygon area
    const polygonWidth = maxX - minX;
    const polygonHeight = maxY - minY;

    // Calculate zoom to fit polygons in view
    const zoomX = (this.canvas.width * 0.9) / polygonWidth;
    const zoomY = (this.canvas.height * 0.9) / polygonHeight;
    const newZoom = Math.min(zoomX, zoomY, this.MAX_ZOOM);

    // Set camera and zoom
    const viewPortX = this.canvas.width / 2 - centerX * newZoom;
    const viewPortY = this.canvas.height / 2 - centerY * newZoom;
    useStore.getState().setCamera(viewPortX, viewPortY);
    useStore.getState().setZoom(Math.max(this.MIN_ZOOM, newZoom));
  }

  private startRenderLoop() {
    const loop = () => {
      this.render();
      this.animationId = requestAnimationFrame(loop);
    };
    loop();
  }

  // Listen for fit to view trigger from store
  private setupStoreListeners() {
    let lastFitToViewTrigger = useStore.getState().fitToViewTrigger;

    const checkFitToView = () => {
      const currentTrigger = useStore.getState().fitToViewTrigger;
      if (currentTrigger !== lastFitToViewTrigger) {
        lastFitToViewTrigger = currentTrigger;
        this.fitToView();
      }
    };

    // Check for fit to view trigger in render loop
    const originalRender = this.render.bind(this);
    this.render = () => {
      checkFitToView();
      originalRender();
    };
  }

  private render() {
    const state = useStore.getState();

    // Update cursor based on current tool
    if (this.isPanning) {
      this.canvas.style.cursor = "grabbing";
    } else if (state.currentTool === "hand" || this.isSpacePressed) {
      this.canvas.style.cursor = "grab";
    } else if (state.currentTool === "select") {
      this.canvas.style.cursor = "default";
    } else {
      this.canvas.style.cursor = "crosshair";
    }

    // Clear canvas
    this.ctx.fillStyle = colors.ground;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply camera transformation
    this.ctx.save();
    this.ctx.translate(state.viewPortOffset.x, state.viewPortOffset.y);
    this.ctx.scale(state.zoom, state.zoom);

    // Draw polygons with winding rule
    this.drawPolygonsWithWindingRule();

    // Draw the polygon being created
    this.drawDrawingPolygon();

    // Draw objects
    this.drawObjects();

    // Draw selection handles
    this.drawSelectionHandles();

    // Draw marquee selection
    this.drawMarqueeSelection();

    // Restore transformation
    this.ctx.restore();

    // Draw debug info panel
    if (this.debugMode) {
      this.drawDebugInfoPanel();
    }
  }

  private drawPolygonsWithWindingRule() {
    const state = useStore.getState();

    if (state.polygons.length === 0) return;

    // First, draw non-grass polygons with fill
    this.ctx.fillStyle = colors.sky;
    this.ctx.beginPath();

    state.polygons.forEach((polygon) => {
      if (polygon.vertices.length < 3 || polygon.grass) return;

      // Apply winding rule: reverse vertices if needed
      let vertices = [...polygon.vertices];
      const isClockwise = isPolygonClockwise(vertices);
      const shouldBeGround = shouldPolygonBeGround(polygon, state.polygons);

      if (shouldBeGround !== isClockwise) {
        vertices.reverse();
      }

      // Add polygon to the path
      this.ctx.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i++) {
        this.ctx.lineTo(vertices[i].x, vertices[i].y);
      }
      this.ctx.lineTo(vertices[0].x, vertices[0].y);
    });

    this.ctx.closePath();
    this.ctx.fill();

    // Then, draw all polygon edges (including grass polygons)
    state.polygons.forEach((polygon) => {
      if (polygon.vertices.length < 3) return;

      // For grass polygons, just draw them as-is (no orientation detection needed)
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

      // Apply winding rule: reverse vertices if needed (only for non-grass polygons)
      let vertices = [...polygon.vertices];
      const isClockwise = isPolygonClockwise(vertices);
      const shouldBeGround = shouldPolygonBeGround(polygon, state.polygons);

      if (shouldBeGround !== isClockwise) {
        vertices.reverse();
      }

      // Set stroke color for non-grass polygons
      this.ctx.strokeStyle = colors.edges;
      this.ctx.lineWidth = 1 / state.zoom; // Dynamic line width

      // Draw polygon edges
      this.ctx.beginPath();
      this.ctx.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i++) {
        this.ctx.lineTo(vertices[i].x, vertices[i].y);
      }
      this.ctx.lineTo(vertices[0].x, vertices[0].y);
      this.ctx.stroke();

      // Debug visualization (only for non-grass polygons)
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

    // Draw sample points
    this.ctx.fillStyle = shouldBeGround ? "#00ff00" : "#ff0000"; // Green for ground, red for sky
    debug.samplePoints.forEach((point, index) => {
      const result = debug.containmentResults[index];
      const pointColor = result.isGround ? "#00ff00" : "#ff0000";
      this.ctx.fillStyle = pointColor;

      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, 3 / state.zoom, 0, 2 * Math.PI);
      this.ctx.fill();

      // Draw containment count
      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = `${12 / state.zoom}px Arial`;
      this.ctx.fillText(
        `${result.containmentCount}`,
        point.x + 5 / state.zoom,
        point.y - 5 / state.zoom
      );
    });

    // Draw polygon center with orientation info
    const center = debug.samplePoints[0];
    this.ctx.fillStyle = shouldBeGround ? "#00ff00" : "#ff0000";
    this.ctx.beginPath();
    this.ctx.arc(center.x, center.y, 5 / state.zoom, 0, 2 * Math.PI);
    this.ctx.fill();

    // Draw orientation text
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

    // Draw the polygon being created
    this.ctx.strokeStyle = colors.edges;
    this.ctx.lineWidth = 1 / state.zoom; // Dynamic line width

    this.ctx.beginPath();
    this.ctx.moveTo(state.drawingPolygon[0].x, state.drawingPolygon[0].y);

    for (let i = 1; i < state.drawingPolygon.length; i++) {
      this.ctx.lineTo(state.drawingPolygon[i].x, state.drawingPolygon[i].y);
    }

    this.ctx.stroke();

    // Draw preview line to mouse position (only on desktop)
    if (state.drawingPolygon.length > 0 && !this.isMobile()) {
      const lastPoint = state.drawingPolygon[state.drawingPolygon.length - 1];
      this.ctx.strokeStyle = colors.edges;
      this.ctx.lineWidth = 1 / state.zoom; // Dynamic line width for preview
      this.ctx.setLineDash([5 / state.zoom, 5 / state.zoom]); // Dynamic dash pattern
      this.ctx.beginPath();
      this.ctx.moveTo(lastPoint.x, lastPoint.y);
      this.ctx.lineTo(state.mousePosition.x, state.mousePosition.y);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    // Draw vertices
    this.ctx.fillStyle = colors.edges;
    state.drawingPolygon.forEach((vertex) => {
      this.ctx.beginPath();
      this.ctx.arc(vertex.x, vertex.y, 2 / state.zoom, 0, 2 * Math.PI); // Dynamic vertex size
      this.ctx.fill();
    });
  }

  private drawObjects() {
    const state = useStore.getState();
    const circleRadius = 8.0; // Scale factor of 20 applied to 0.4 radius
    const spriteSize = 16.0; // Scale factor of 20 applied to 0.8 sprite size

    // Draw start bike
    if (this.spriteManager.isLoaded() && state.showSprites) {
      // Use kuski sprite for start position
      this.spriteManager.drawStaticSprite(
        this.ctx,
        "kuski",
        state.start.x,
        state.start.y,
        spriteSize * 3, // Medium bike sprite size
        spriteSize * 2.8125,
        0
      );
    } else {
      // Fallback to green circle if sprites aren't loaded yet or sprites are disabled
      this.ctx.fillStyle = colors.start;
      this.ctx.beginPath();
      this.ctx.arc(state.start.x, state.start.y, circleRadius, 0, 2 * Math.PI);
      this.ctx.fill();
    }

    // Draw flowers using sprites
    if (this.spriteManager.isLoaded() && state.showSprites) {
      state.flowers.forEach((flower) => {
        if (state.animateSprites) {
          // Animated sprite
          this.spriteManager.drawSprite(
            this.ctx,
            "qexit",
            flower.x,
            flower.y,
            spriteSize,
            spriteSize,
            Date.now()
          );
        } else {
          // Static sprite (first frame)
          this.spriteManager.drawStaticSprite(
            this.ctx,
            "qexit",
            flower.x,
            flower.y,
            spriteSize,
            spriteSize,
            0
          );
        }
      });
    } else {
      // Fallback to white circles if sprites aren't loaded yet or sprites are disabled
      state.flowers.forEach((flower) => {
        this.ctx.fillStyle = colors.flower;
        this.ctx.beginPath();
        this.ctx.arc(flower.x, flower.y, circleRadius, 0, 2 * Math.PI);
        this.ctx.fill();
      });
    }

    // Draw apples using sprites
    if (this.spriteManager.isLoaded() && state.showSprites) {
      state.apples.forEach((apple) => {
        if (state.animateSprites) {
          // Animated sprite
          this.spriteManager.drawSprite(
            this.ctx,
            "qfood1",
            apple.x,
            apple.y,
            spriteSize,
            spriteSize,
            Date.now()
          );
        } else {
          // Static sprite (first frame)
          this.spriteManager.drawStaticSprite(
            this.ctx,
            "qfood1",
            apple.x,
            apple.y,
            spriteSize,
            spriteSize,
            0
          );
        }
      });
    } else {
      // Fallback to red circles if sprites aren't loaded yet or sprites are disabled
      state.apples.forEach((apple) => {
        this.ctx.fillStyle = colors.apple;
        this.ctx.beginPath();
        this.ctx.arc(apple.x, apple.y, circleRadius, 0, 2 * Math.PI);
        this.ctx.fill();
      });
    }

    // Draw killers using sprites
    if (this.spriteManager.isLoaded() && state.showSprites) {
      state.killers.forEach((killer) => {
        if (state.animateSprites) {
          // Animated sprite
          this.spriteManager.drawSprite(
            this.ctx,
            "qkiller",
            killer.x,
            killer.y,
            spriteSize,
            spriteSize,
            Date.now()
          );
        } else {
          // Static sprite (first frame)
          this.spriteManager.drawStaticSprite(
            this.ctx,
            "qkiller",
            killer.x,
            killer.y,
            spriteSize,
            spriteSize,
            0
          );
        }
      });
    } else {
      // Fallback to black circles if sprites aren't loaded yet or sprites are disabled
      state.killers.forEach((killer) => {
        this.ctx.fillStyle = colors.killer;
        this.ctx.beginPath();
        this.ctx.arc(killer.x, killer.y, circleRadius, 0, 2 * Math.PI);
        this.ctx.fill();
      });
    }
  }

  private drawSelectionHandles() {
    const state = useStore.getState();

    this.ctx.fillStyle = colors.selection;
    const handleSize = this.getDynamicLineWidth(3); // Smaller dynamic selection handle size

    // Draw vertex selection handles
    state.selectedVertices.forEach(({ vertex }) => {
      this.ctx.fillRect(
        vertex.x - handleSize,
        vertex.y - handleSize,
        handleSize * 2,
        handleSize * 2
      );
    });

    // Draw object selection handles
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

    // Calculate selection bounds
    const minX = Math.min(this.marqueeStartPos.x, this.marqueeEndPos.x);
    const maxX = Math.max(this.marqueeStartPos.x, this.marqueeEndPos.x);
    const minY = Math.min(this.marqueeStartPos.y, this.marqueeEndPos.y);
    const maxY = Math.max(this.marqueeStartPos.y, this.marqueeEndPos.y);
    const width = maxX - minX;
    const height = maxY - minY;

    // Draw semi-transparent fill with more visible color
    this.ctx.fillStyle = "rgba(255, 255, 0, 0.2)";
    this.ctx.fillRect(minX, minY, width, height);

    // Draw border with bright yellow and thicker line
    this.ctx.strokeStyle = "#ffff00";
    this.ctx.lineWidth = this.getDynamicLineWidth(2);
    this.ctx.setLineDash([
      5 / useStore.getState().zoom,
      5 / useStore.getState().zoom,
    ]);
    this.ctx.strokeRect(minX, minY, width, height);
    this.ctx.setLineDash([]);
  }

  private async loadDefaultLevel() {
    try {
      const result = await LevelImporter.importBuiltinLevel("QWQUU001.lev");
      if (result.success && result.data) {
        useStore.getState().importLevel(result.data);

        // Center the camera on the loaded level
        this.centerCameraOnLevel(result.data);
      } else {
        console.error("Failed to load default level:", result.error);
      }
    } catch (error) {
      console.error("Error loading default level:", error);
    }
  }

  private centerCameraOnLevel(levelData: any) {
    // Calculate level bounds
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    // Check polygon vertices
    levelData.polygons.forEach((polygon: any) => {
      polygon.vertices.forEach((vertex: any) => {
        minX = Math.min(minX, vertex.x);
        minY = Math.min(minY, vertex.y);
        maxX = Math.max(maxX, vertex.x);
        maxY = Math.max(maxY, vertex.y);
      });
    });

    // Check objects (apples, killers, flowers, start)
    const allObjects = [
      ...levelData.apples,
      ...levelData.killers,
      ...levelData.flowers,
      levelData.start,
    ];
    allObjects.forEach((obj: any) => {
      minX = Math.min(minX, obj.x);
      minY = Math.min(minY, obj.y);
      maxX = Math.max(maxX, obj.x);
      maxY = Math.max(maxY, obj.y);
    });

    // Calculate level dimensions
    const levelWidth = maxX - minX;
    const levelHeight = maxY - minY;

    // Calculate center
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Calculate optimal zoom to fit level with padding
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    const padding = 0.2; // 20% padding around the level

    const zoomX = canvasWidth / (levelWidth * (1 + padding));
    const zoomY = canvasHeight / (levelHeight * (1 + padding));
    const optimalZoom = Math.min(zoomX, zoomY);

    // Set camera and zoom
    const viewPortX = this.canvas.width / 2 - centerX * optimalZoom;
    const viewPortY = this.canvas.height / 2 - centerY * optimalZoom;
    useStore.getState().setCamera(viewPortX, viewPortY);
    useStore.getState().setZoom(optimalZoom);
  }

  public destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    // Remove event listeners
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    this.canvas.removeEventListener("mouseup", this.handleMouseUp);
    this.canvas.removeEventListener("contextmenu", this.handleRightClick);
    this.canvas.removeEventListener("wheel", this.handleWheel);
    this.canvas.removeEventListener("touchstart", this.handleTouchStart);
    this.canvas.removeEventListener("touchmove", this.handleTouchMove);
    this.canvas.removeEventListener("touchend", this.handleTouchEnd);
    document.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("keyup", this.handleKeyUp); // Remove keyup listener
    window.removeEventListener("resize", this.handleResize);
  }

  // Debug method to toggle polygon orientation visualization
  public toggleDebugMode() {
    this.debugMode = !this.debugMode;
    console.debug("Debug mode:", this.debugMode ? "ON" : "OFF");
  }

  private drawDebugInfoPanel() {
    const state = useStore.getState();

    // Set font first so we can measure text
    this.ctx.font = "14px 'Courier New', monospace";
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "top";

    const line1 = "Debug Mode: ON";
    const line2 = "Press 'D' to exit debug mode";

    // Measure text to determine panel width
    const line1Width = this.ctx.measureText(line1).width;
    const line2Width = this.ctx.measureText(line2).width;
    const maxTextWidth = Math.max(line1Width, line2Width);

    const panelWidth = maxTextWidth + 20; // Add padding
    const panelHeight = 60;
    const panelX = this.canvas.width - panelWidth - 10;
    const panelY = 10;

    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillText(line1, panelX + 10, panelY + 10);
    this.ctx.fillText(line2, panelX + 10, panelY + 35);
  }

  private getDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.hypot(dx, dy);
  }

  private getMidpoint(
    t1: Touch,
    t2: Touch
  ): { clientX: number; clientY: number } {
    return {
      clientX: (t1.clientX + t2.clientX) / 2,
      clientY: (t1.clientY + t2.clientY) / 2,
    };
  }

  private isMobile(): boolean {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }
}
