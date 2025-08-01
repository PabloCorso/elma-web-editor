// Reference: https://github.com/elmadev/level-editor-gui/blob/master/src/index.js

import type { Polygon, Position } from "elmajs";
import { colors } from "./constants";
import { isPolygonClockwise, shouldPolygonBeGround } from "./helpers";

export class Editor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private polygons: Polygon[] = [];
  private drawingPolygon: Position[] = [];
  private mousePos: Position = { x: 0, y: 0 };
  private currentTool: string = "polygon";
  private eventTarget: EventTarget;

  // Objects
  private startPosition: Position = { x: 0, y: 0 };
  private exitPosition: Position = { x: 0, y: 0 };
  private apples: Position[] = [];

  // Camera system
  private cameraX: number = 0;
  private cameraY: number = 0;
  private zoom: number = 1;
  private readonly MIN_ZOOM = 0.1;
  private readonly MAX_ZOOM = 5;
  private readonly LEVEL_WIDTH = 1000;
  private readonly LEVEL_HEIGHT = 600;

  // Navigation state
  private isPanning: boolean = false;
  private lastPanX: number = 0;
  private lastPanY: number = 0;
  private readonly PAN_SPEED = 1.0;
  private readonly ZOOM_SPEED = 0.1;

  constructor(canvas: HTMLCanvasElement) {
    console.log("🏗️ EDITOR CONSTRUCTOR called at", new Date().toISOString());
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.eventTarget = new EventTarget();
  }

  public init(width?: number, height?: number) {
    console.log(
      "🚀 EDITOR INIT:",
      width,
      "x",
      height,
      "at",
      new Date().toISOString()
    );
    if (width && height) {
      this.resize(width, height);
    } else {
      this.resize(window.innerWidth, window.innerHeight);
    }

    this.setupEventListeners();
    this.centerCameraOnLevel();
    this.setupDefaultLevel();
  }

  private centerCameraOnLevel() {
    this.cameraX = this.LEVEL_WIDTH / 2;
    this.cameraY = this.LEVEL_HEIGHT / 2;
  }

  private fitToView() {
    if (this.polygons.length === 0) {
      // If no polygons, just center on level
      this.centerCameraOnLevel();
      this.zoom = 1;
      return;
    }

    // Find the bounding box of all polygons
    let minX = Infinity,
      minY = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity;

    this.polygons.forEach((polygon) => {
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
    this.cameraX = centerX;
    this.cameraY = centerY;
    this.zoom = Math.max(this.MIN_ZOOM, newZoom);
  }

  public resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;

    // Set canvas background to prevent black areas
    this.canvas.style.backgroundColor = colors.ground;
  }

  private setupEventListeners() {
    this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
    this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
    this.canvas.addEventListener(
      "contextmenu",
      this.handleRightClick.bind(this)
    );
    this.canvas.addEventListener("wheel", this.handleWheel.bind(this));

    // Touch events for trackpad/mobile
    this.canvas.addEventListener(
      "touchstart",
      this.handleTouchStart.bind(this)
    );
    this.canvas.addEventListener("touchmove", this.handleTouchMove.bind(this));
    this.canvas.addEventListener("touchend", this.handleTouchEnd.bind(this));

    document.addEventListener("keydown", this.handleKeyDown.bind(this));
    window.addEventListener("resize", this.handleResize.bind(this));
  }

  public destroy() {
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

  private screenToWorld(screenX: number, screenY: number): Position {
    return {
      x: (screenX - this.canvas.width / 2) / this.zoom + this.cameraX,
      y: (screenY - this.canvas.height / 2) / this.zoom + this.cameraY,
    };
  }

  private worldToScreen(worldX: number, worldY: number): Position {
    return {
      x: (worldX - this.cameraX) * this.zoom + this.canvas.width / 2,
      y: (worldY - this.cameraY) * this.zoom + this.canvas.height / 2,
    };
  }

  private handleMouseDown = (event: MouseEvent) => {
    // Middle mouse button (button 1) for panning
    if (event.button === 1) {
      event.preventDefault();
      this.isPanning = true;
      this.lastPanX = event.clientX;
      this.lastPanY = event.clientY;
      return;
    }

    // Left mouse button for tools
    if (event.button === 0) {
      const rect = this.canvas.getBoundingClientRect();
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;
      const worldPos = this.screenToWorld(screenX, screenY);

      if (this.currentTool === "apple") {
        // Place an apple
        this.apples.push(worldPos);
        this.draw();
      } else if (this.currentTool === "polygon") {
        // Draw polygon
        this.drawingPolygon.push(worldPos);
        this.draw();
      }
    }
  };

  private handleMouseUp = (event: MouseEvent) => {
    if (event.button === 1) {
      this.isPanning = false;
    }
  };

  private handleMouseMove = (event: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    // Handle panning
    if (this.isPanning) {
      const deltaX = (event.clientX - this.lastPanX) / this.zoom;
      const deltaY = (event.clientY - this.lastPanY) / this.zoom;

      this.cameraX -= deltaX * this.PAN_SPEED;
      this.cameraY -= deltaY * this.PAN_SPEED;

      this.lastPanX = event.clientX;
      this.lastPanY = event.clientY;
      this.draw();
      return;
    }

    // Handle polygon drawing preview only when polygon tool is selected
    if (this.currentTool === "polygon") {
      const worldPos = this.screenToWorld(screenX, screenY);
      this.mousePos = worldPos;
      this.draw();
    }
  };

  private handleRightClick = (event: MouseEvent) => {
    event.preventDefault(); // Prevent context menu from appearing
    if (this.drawingPolygon.length >= 3) {
      // Finish the polygon
      this.polygons.push({
        vertices: [...this.drawingPolygon],
        grass: false, // Default to normal polygon
      });
      this.drawingPolygon = [];
      this.draw();
    } else if (this.drawingPolygon.length > 0) {
      // Cancel current polygon if it has fewer than 3 vertices
      this.drawingPolygon = [];
      this.draw();
    }
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    const panAmount = 50 / this.zoom; // Pan distance adjusted for zoom level
    const zoomAmount = 0.1;

    switch (event.key) {
      case "Escape":
        // Cancel current polygon
        this.drawingPolygon = [];
        this.draw();
        break;

      // Pan left
      case "ArrowLeft":
      case "a":
      case "A":
        event.preventDefault();
        this.cameraX -= panAmount;
        this.draw();
        break;

      // Pan right
      case "ArrowRight":
      case "d":
      case "D":
        event.preventDefault();
        this.cameraX += panAmount;
        this.draw();
        break;

      // Pan up
      case "ArrowUp":
      case "w":
      case "W":
        event.preventDefault();
        this.cameraY -= panAmount;
        this.draw();
        break;

      // Pan down
      case "ArrowDown":
      case "s":
      case "S":
        event.preventDefault();
        this.cameraY += panAmount;
        this.draw();
        break;

      // Zoom in
      case "+":
      case "=":
        event.preventDefault();
        this.zoom = Math.min(this.MAX_ZOOM, this.zoom + zoomAmount);
        this.draw();
        break;

      // Zoom out
      case "-":
      case "_":
        event.preventDefault();
        this.zoom = Math.max(this.MIN_ZOOM, this.zoom - zoomAmount);
        this.draw();
        break;

      // Reset view
      case "q":
      case "Q":
        event.preventDefault();
        this.fitToView();
        this.draw();
        break;
    }
  };

  private handleResize = () => {
    this.resize(window.innerWidth, window.innerHeight);
  };

  private handleWheel = (event: WheelEvent) => {
    event.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Convert screen coordinates to world coordinates
    const worldX = (mouseX - this.canvas.width / 2) / this.zoom + this.cameraX;
    const worldY = (mouseY - this.canvas.height / 2) / this.zoom + this.cameraY;

    // Calculate zoom factor
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(
      this.MIN_ZOOM,
      Math.min(this.MAX_ZOOM, this.zoom * zoomFactor)
    );

    // Only update if zoom actually changed
    if (newZoom !== this.zoom) {
      this.zoom = newZoom;

      // Adjust camera to keep mouse position fixed
      this.cameraX = worldX - (mouseX - this.canvas.width / 2) / this.zoom;
      this.cameraY = worldY - (mouseY - this.canvas.height / 2) / this.zoom;

      this.draw();
    }
  };

  private handleTouchStart = (event: TouchEvent) => {
    event.preventDefault();
    if (event.touches.length === 2) {
      // Two finger touch - start panning
      this.isPanning = true;
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      this.lastPanX = (touch1.clientX + touch2.clientX) / 2;
      this.lastPanY = (touch1.clientY + touch2.clientY) / 2;
    }
  };

  private handleTouchMove = (event: TouchEvent) => {
    event.preventDefault();
    if (event.touches.length === 2 && this.isPanning) {
      // Two finger panning
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const currentX = (touch1.clientX + touch2.clientX) / 2;
      const currentY = (touch1.clientY + touch2.clientY) / 2;

      const deltaX = (currentX - this.lastPanX) / this.zoom;
      const deltaY = (currentY - this.lastPanY) / this.zoom;

      this.cameraX -= deltaX * this.PAN_SPEED;
      this.cameraY -= deltaY * this.PAN_SPEED;

      this.lastPanX = currentX;
      this.lastPanY = currentY;
      this.draw();
    }
  };

  private handleTouchEnd = (event: TouchEvent) => {
    if (event.touches.length < 2) {
      this.isPanning = false;
    }
  };

  private setupDefaultLevel() {
    // Clear any existing polygons
    this.polygons = [];

    // Create a boundary rectangle for the fixed level size
    const margin = 50;
    const boundary = {
      vertices: [
        { x: margin, y: margin },
        { x: this.LEVEL_WIDTH - margin, y: margin },
        { x: this.LEVEL_WIDTH - margin, y: this.LEVEL_HEIGHT - margin },
        { x: margin, y: this.LEVEL_HEIGHT - margin },
      ],
      grass: false,
    };

    this.polygons.push(boundary);

    // Set start and exit positions within the level bounds
    this.startPosition = {
      x: margin + 100,
      y: this.LEVEL_HEIGHT - margin - 100,
    };
    this.exitPosition = {
      x: this.LEVEL_WIDTH - margin - 100,
      y: this.LEVEL_HEIGHT - margin - 100,
    };

    this.draw();
  }

  private draw() {
    // Clear canvas (no initial color fill - let polygon rendering handle it)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply camera transformation
    this.ctx.save();
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.scale(this.zoom, this.zoom);
    this.ctx.translate(-this.cameraX, -this.cameraY);

    // Draw completed polygons with winding rule
    this.drawPolygonsWithWindingRule();

    // Draw current polygon being created only when polygon tool is selected
    if (this.currentTool === "polygon") {
      this.drawDrawingPolygon();
    }

    // Draw start and exit positions
    this.drawObjects();

    // Restore transformation
    this.ctx.restore();
  }

  private drawPolygonsWithWindingRule() {
    // For now, just draw the boundary polygon with sky inside and ground outside
    if (this.polygons.length === 1) {
      // Simple case: just one boundary polygon
      const polygon = this.polygons[0];
      if (polygon.vertices.length >= 3) {
        // Fill entire canvas with ground color first
        this.ctx.fillStyle = colors.ground;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Then create a sky-colored hole using the boundary polygon
        this.ctx.fillStyle = colors.sky;
        this.ctx.strokeStyle = colors.edges;
        this.ctx.lineWidth = 1;

        this.ctx.beginPath();
        this.ctx.moveTo(polygon.vertices[0].x, polygon.vertices[0].y);
        for (let i = 1; i < polygon.vertices.length; i++) {
          this.ctx.lineTo(polygon.vertices[i].x, polygon.vertices[i].y);
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
      }
      return;
    }

    // Complex case: multiple polygons with winding rule
    // Fill entire canvas with ground color first
    this.ctx.fillStyle = colors.ground;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Set fill style to sky (this will create holes in the ground)
    this.ctx.fillStyle = colors.sky;
    this.ctx.strokeStyle = colors.edges;
    this.ctx.lineWidth = 1;

    this.ctx.beginPath();

    this.polygons.forEach((polygon) => {
      if (polygon.vertices.length < 3) return;

      // Apply winding rule: reverse vertices if needed
      let vertices = [...polygon.vertices];
      const isClockwise = isPolygonClockwise(vertices);
      const shouldBeGround = shouldPolygonBeGround(polygon, this.polygons);

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
    if (this.drawingPolygon.length === 0) return;

    // Draw the polygon being created
    this.ctx.strokeStyle = colors.edges;
    this.ctx.lineWidth = 1;

    this.ctx.beginPath();
    this.ctx.moveTo(this.drawingPolygon[0].x, this.drawingPolygon[0].y);

    for (let i = 1; i < this.drawingPolygon.length; i++) {
      this.ctx.lineTo(this.drawingPolygon[i].x, this.drawingPolygon[i].y);
    }

    this.ctx.stroke();

    // Draw preview line to mouse position
    if (this.drawingPolygon.length > 0) {
      const lastPoint = this.drawingPolygon[this.drawingPolygon.length - 1];
      this.ctx.strokeStyle = colors.edges;
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.moveTo(lastPoint.x, lastPoint.y);
      this.ctx.lineTo(this.mousePos.x, this.mousePos.y);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    // Draw vertices
    this.ctx.fillStyle = colors.edges;
    this.drawingPolygon.forEach((vertex) => {
      this.ctx.beginPath();
      this.ctx.arc(vertex.x, vertex.y, 2, 0, 2 * Math.PI);
      this.ctx.fill();
    });
  }

  private drawObjects() {
    const circleRadius = 20;

    // Draw start circle
    this.ctx.fillStyle = colors.start;
    this.ctx.beginPath();
    this.ctx.arc(
      this.startPosition.x,
      this.startPosition.y,
      circleRadius,
      0,
      2 * Math.PI
    );
    this.ctx.fill();

    // Draw exit circle
    this.ctx.fillStyle = colors.flower;
    this.ctx.beginPath();
    this.ctx.arc(
      this.exitPosition.x,
      this.exitPosition.y,
      circleRadius,
      0,
      2 * Math.PI
    );
    this.ctx.fill();

    // Draw apples
    this.drawApples();
  }

  private drawApples() {
    const appleRadius = 20;

    this.apples.forEach((apple) => {
      // Draw apple circle
      this.ctx.fillStyle = colors.apple;
      this.ctx.beginPath();
      this.ctx.arc(apple.x, apple.y, appleRadius, 0, 2 * Math.PI);
      this.ctx.fill();

      // Draw apple border
      this.ctx.strokeStyle = colors.edges;
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    });
  }

  // Public methods for external use
  public getLevelData() {
    return {
      polygons: this.polygons,
      startPosition: this.startPosition,
      exitPosition: this.exitPosition,
      apples: this.apples,
    };
  }

  public clear() {
    this.polygons = [];
    this.drawingPolygon = [];
    this.apples = [];
    this.startPosition = { x: 100, y: 600 };
    this.exitPosition = { x: 700, y: 600 };
    this.draw();
  }

  public setStartPosition(position: Position) {
    this.startPosition = position;
    this.draw();
  }

  public setExitPosition(position: Position) {
    this.exitPosition = position;
    this.draw();
  }

  public getStartPosition(): Position {
    return { ...this.startPosition };
  }

  public getExitPosition(): Position {
    return { ...this.exitPosition };
  }

  // Tool management
  public setTool(tool: string) {
    if (this.currentTool !== tool) {
      console.log(
        "🔧 TOOL CHANGE:",
        this.currentTool,
        "→",
        tool,
        "at",
        new Date().toISOString()
      );
    }

    // Cancel polygon drawing if switching to a non-polygon tool
    if (tool !== "polygon") {
      this.drawingPolygon = [];
    }

    // Reset mouse position when switching tools
    this.mousePos = { x: 0, y: 0 };

    this.currentTool = tool;
    this.emitEvent("toolChanged", { tool });
    this.draw();
  }

  public getCurrentTool(): string {
    return this.currentTool;
  }

  public redraw() {
    this.draw();
  }

  // Event communication
  public on(event: string, callback: EventListener) {
    this.eventTarget.addEventListener(event, callback);
  }

  public off(event: string, callback: EventListener) {
    this.eventTarget.removeEventListener(event, callback);
  }

  private emitEvent(eventName: string, data: any) {
    const event = new CustomEvent(eventName, { detail: data });
    this.eventTarget.dispatchEvent(event);
  }

  // Download functionality
  public downloadLevel() {
    const levelData = this.getLevelData();
    const dataStr = JSON.stringify(levelData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(dataBlob);
    link.download = "level.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }
}
