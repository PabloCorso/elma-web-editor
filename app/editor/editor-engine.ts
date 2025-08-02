import { useStore } from "./useStore";
import { colors } from "./constants";
import { isPolygonClockwise, shouldPolygonBeGround } from "./helpers";
import type { Position } from "elmajs";
import { SpriteManager } from "./sprite-manager";

export class EditorEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private spriteManager: SpriteManager;

  // Camera system
  private readonly MIN_ZOOM = 0.1;
  private readonly MAX_ZOOM = 5;
  private readonly PAN_SPEED = 1.0;

  // Navigation state
  private isPanning: boolean = false;
  private lastPanX: number = 0;
  private lastPanY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context missing");
    this.ctx = ctx;
    this.spriteManager = new SpriteManager();

    this.setupEventListeners();
    this.startRenderLoop();
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
        // Add vertex to drawing polygon
        const newVertices = [...store.drawingPolygon, worldPos];
        useStore.getState().setDrawingPolygon(newVertices);
      } else if (store.currentTool === "apple") {
        useStore.getState().addApple(worldPos);
      } else if (store.currentTool === "killer") {
        useStore.getState().addKiller(worldPos);
      } else if (store.currentTool === "flower") {
        useStore.getState().addFlower(worldPos);
      } else if (store.currentTool === "select") {
        // TODO: Implement selection logic
        console.log("Select tool clicked at:", worldPos);
      }
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (e.button === 1) {
      this.isPanning = false;
    }
  };

  private handleMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = this.screenToWorld(screenX, screenY);

    // Handle panning
    if (this.isPanning) {
      const deltaX = (e.clientX - this.lastPanX) / useStore.getState().zoom;
      const deltaY = (e.clientY - this.lastPanY) / useStore.getState().zoom;

      const currentCamera = useStore.getState();
      useStore
        .getState()
        .setCamera(
          currentCamera.cameraX - deltaX * this.PAN_SPEED,
          currentCamera.cameraY - deltaY * this.PAN_SPEED
        );

      this.lastPanX = e.clientX;
      this.lastPanY = e.clientY;
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
        (mouseX - this.canvas.width / 2) / useStore.getState().zoom +
        useStore.getState().cameraX;
      const worldY =
        (mouseY - this.canvas.height / 2) / useStore.getState().zoom +
        useStore.getState().cameraY;

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

        // Adjust camera to keep mouse position fixed
        const newCameraX = worldX - (mouseX - this.canvas.width / 2) / newZoom;
        const newCameraY = worldY - (mouseY - this.canvas.height / 2) / newZoom;
        useStore.getState().setCamera(newCameraX, newCameraY);
      }
      return;
    }

    // Shift+scroll for horizontal panning
    if (e.shiftKey) {
      // When Shift is held, deltaX might be available for horizontal scrolling
      // If not, use deltaY as fallback
      const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
      const panAmount = (delta * 0.5) / useStore.getState().zoom;
      const currentCamera = useStore.getState();
      useStore
        .getState()
        .setCamera(currentCamera.cameraX + panAmount, currentCamera.cameraY);
      return;
    }

    // Normal scroll for vertical panning
    const panAmount = (e.deltaY * 0.5) / useStore.getState().zoom;
    const currentCamera = useStore.getState();
    useStore
      .getState()
      .setCamera(currentCamera.cameraX, currentCamera.cameraY + panAmount);
  };

  private handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      this.isPanning = true;
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      this.lastPanX = (touch1.clientX + touch2.clientX) / 2;
      this.lastPanY = (touch1.clientY + touch2.clientY) / 2;
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2 && this.isPanning) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentX = (touch1.clientX + touch2.clientX) / 2;
      const currentY = (touch1.clientY + touch2.clientY) / 2;

      const deltaX = (currentX - this.lastPanX) / useStore.getState().zoom;
      const deltaY = (currentY - this.lastPanY) / useStore.getState().zoom;

      const currentCamera = useStore.getState();
      useStore
        .getState()
        .setCamera(
          currentCamera.cameraX - deltaX * this.PAN_SPEED,
          currentCamera.cameraY - deltaY * this.PAN_SPEED
        );

      this.lastPanX = currentX;
      this.lastPanY = currentY;
    }
  };

  private handleTouchEnd = (e: TouchEvent) => {
    if (e.touches.length < 2) {
      this.isPanning = false;
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    const panAmount = 50 / useStore.getState().zoom;
    const zoomAmount = 0.1;

    switch (e.key) {
      case "Escape":
        useStore.getState().setDrawingPolygon([]);
        break;

      case "ArrowLeft":
      case "a":
      case "A":
        e.preventDefault();
        const currentCamera = useStore.getState();
        useStore
          .getState()
          .setCamera(currentCamera.cameraX - panAmount, currentCamera.cameraY);
        break;

      case "ArrowRight":
      case "d":
      case "D":
        e.preventDefault();
        const currentCamera2 = useStore.getState();
        useStore
          .getState()
          .setCamera(
            currentCamera2.cameraX + panAmount,
            currentCamera2.cameraY
          );
        break;

      case "ArrowUp":
      case "w":
      case "W":
        e.preventDefault();
        const currentCamera3 = useStore.getState();
        useStore
          .getState()
          .setCamera(
            currentCamera3.cameraX,
            currentCamera3.cameraY - panAmount
          );
        break;

      case "ArrowDown":
      case "s":
      case "S":
        e.preventDefault();
        const currentCamera4 = useStore.getState();
        useStore
          .getState()
          .setCamera(
            currentCamera4.cameraX,
            currentCamera4.cameraY + panAmount
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

      case "q":
      case "Q":
        e.preventDefault();
        this.fitToView();
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

  private screenToWorld(screenX: number, screenY: number): Position {
    const state = useStore.getState();
    return {
      x: (screenX - this.canvas.width / 2) / state.zoom + state.cameraX,
      y: (screenY - this.canvas.height / 2) / state.zoom + state.cameraY,
    };
  }

  private fitToView() {
    const state = useStore.getState();

    // Default level bounds (1000x600)
    const levelWidth = 1000;
    const levelHeight = 600;

    if (state.polygons.length === 0) {
      // If no polygons, center on the level bounds
      useStore.getState().setCamera(levelWidth / 2, levelHeight / 2);
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
    useStore.getState().setCamera(centerX, centerY);
    useStore.getState().setZoom(Math.max(this.MIN_ZOOM, newZoom));
  }

  private startRenderLoop() {
    const loop = () => {
      this.render();
      this.animationId = requestAnimationFrame(loop);
    };
    loop();
  }

  private render() {
    const state = useStore.getState();

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply camera transformation
    this.ctx.save();
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.scale(state.zoom, state.zoom);
    this.ctx.translate(-state.cameraX, -state.cameraY);

    // Fill entire visible area with ground color first
    this.ctx.fillStyle = colors.ground;

    // Calculate the visible world bounds based on camera and zoom
    const visibleWidth = this.canvas.width / state.zoom;
    const visibleHeight = this.canvas.height / state.zoom;
    const visibleLeft = state.cameraX - visibleWidth / 2;
    const visibleTop = state.cameraY - visibleHeight / 2;

    // Fill the entire visible area with ground color
    this.ctx.fillRect(visibleLeft, visibleTop, visibleWidth, visibleHeight);

    // Draw polygons with winding rule
    this.drawPolygonsWithWindingRule();

    // Draw current polygon being created
    if (state.currentTool === "polygon") {
      this.drawDrawingPolygon();
    }

    // Draw objects
    this.drawObjects();

    // Draw selection handles
    this.drawSelectionHandles();

    // Restore transformation
    this.ctx.restore();
  }

  private drawPolygonsWithWindingRule() {
    const state = useStore.getState();

    if (state.polygons.length === 0) return;

    // Set fill style to sky (this will create holes in the ground)
    this.ctx.fillStyle = colors.sky;
    this.ctx.strokeStyle = colors.edges;
    this.ctx.lineWidth = 1;

    this.ctx.beginPath();

    state.polygons.forEach((polygon) => {
      if (polygon.vertices.length < 3) return;

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
    this.ctx.stroke();
  }

  private drawDrawingPolygon() {
    const state = useStore.getState();

    if (state.drawingPolygon.length === 0) return;

    // Draw the polygon being created
    this.ctx.strokeStyle = colors.edges;
    this.ctx.lineWidth = 1;

    this.ctx.beginPath();
    this.ctx.moveTo(state.drawingPolygon[0].x, state.drawingPolygon[0].y);

    for (let i = 1; i < state.drawingPolygon.length; i++) {
      this.ctx.lineTo(state.drawingPolygon[i].x, state.drawingPolygon[i].y);
    }

    this.ctx.stroke();

    // Draw preview line to mouse position
    if (state.drawingPolygon.length > 0) {
      const lastPoint = state.drawingPolygon[state.drawingPolygon.length - 1];
      this.ctx.strokeStyle = colors.edges;
      this.ctx.setLineDash([5, 5]);
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
      this.ctx.arc(vertex.x, vertex.y, 2, 0, 2 * Math.PI);
      this.ctx.fill();
    });
  }

  private drawObjects() {
    const state = useStore.getState();
    const circleRadius = 20;
    const spriteSize = 40; // Size for sprite rendering

    // Draw start bike
    if (this.spriteManager.isLoaded() && state.showSprites) {
      // Use kuski sprite for start position
      this.spriteManager.drawStaticSprite(
        this.ctx,
        'kuski',
        state.start.x,
        state.start.y,
        spriteSize * 3, // Make bike smaller
        spriteSize * 2.8,
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
            'qexit',
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
            'qexit',
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
            'qfood1',
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
            'qfood1',
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
            'qkiller',
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
            'qkiller',
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

    // Draw vertex selection handles
    state.selectedVertices.forEach(({ vertex }) => {
      this.ctx.fillRect(
        vertex.x - 2.5 / state.zoom,
        vertex.y - 2.5 / state.zoom,
        5 / state.zoom,
        5 / state.zoom
      );
    });

    // Draw object selection handles
    state.selectedObjects.forEach((object) => {
      this.ctx.fillRect(
        object.x - 2.5 / state.zoom,
        object.y - 2.5 / state.zoom,
        5 / state.zoom,
        5 / state.zoom
      );
    });
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
    window.removeEventListener("resize", this.handleResize);
  }
}
