import type { Tool } from "../tool-interface";
import type { EventContext } from "../utils/event-handler";
import type { Position, Polygon } from "elmajs";
import { useStore, type Store } from "../useStore";
import {
  findVertexNearPosition,
  findObjectNearPosition,
  isVertexSelected,
  isObjectSelected,
  getAllObjects,
  isPointInRect,
  getSelectionBounds,
} from "../utils/selection-utils";
import { colors } from "../constants";

// Type definitions for better type safety
type VertexSelection = {
  polygon: Polygon;
  vertex: Position;
};

type ObjectSelection = Position;

export class SelectionTool implements Tool {
  id = "select";
  name = "Select";
  shortcut = "S";

  private isDragging = false;
  private dragStartPos = { x: 0, y: 0 };
  private originalPositions: Position[] = [];
  private isMarqueeSelecting = false;
  private marqueeStartPos = { x: 0, y: 0 };
  private marqueeEndPos = { x: 0, y: 0 };

  onActivate(): void {
    // Selection tool doesn't need to clear anything on activate
  }

  onDeactivate(): void {
    // Clear selections when deactivating selection tool
    this.clearSelection();
  }

  onPointerDown(event: PointerEvent, context: EventContext): boolean {
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

    return true;
  }

  onPointerMove(event: PointerEvent, context: EventContext): boolean {
    if (this.isDragging) {
      this.handleDragging(context.worldPos);
      return true;
    }

    if (this.isMarqueeSelecting) {
      this.marqueeEndPos = context.worldPos;
      return true;
    }

    return false;
  }

  onPointerUp(event: PointerEvent, context: EventContext): boolean {
    if (this.isDragging) {
      this.isDragging = false;
      return true;
    }

    if (this.isMarqueeSelecting) {
      this.finalizeMarqueeSelection();
      this.isMarqueeSelecting = false;
      return true;
    }

    return false;
  }

  onKeyDown(event: KeyboardEvent, context: EventContext): boolean {
    if (event.key === "Delete" || event.key === "Backspace") {
      this.deleteSelection();
      return true;
    }
    if (event.key === "Escape") {
      this.clearSelection();
      return true;
    }
    return false;
  }

  onRenderOverlay(ctx: CanvasRenderingContext2D, state: Store): void {
    // Draw selection handles in screen coordinates
    ctx.fillStyle = colors.selection;
    const handleSize = 3; // Fixed size in screen pixels
    const toolState = state.getToolState("select");

    toolState.selectedVertices.forEach(({ vertex }: VertexSelection) => {
      // Convert world coordinates to screen coordinates
      const screenX = vertex.x * state.zoom + state.viewPortOffset.x;
      const screenY = vertex.y * state.zoom + state.viewPortOffset.y;

      ctx.fillRect(
        screenX - handleSize,
        screenY - handleSize,
        handleSize * 2,
        handleSize * 2
      );
    });

    toolState.selectedObjects.forEach((object: ObjectSelection) => {
      // Convert world coordinates to screen coordinates
      const screenX = object.x * state.zoom + state.viewPortOffset.x;
      const screenY = object.y * state.zoom + state.viewPortOffset.y;

      ctx.fillRect(
        screenX - handleSize,
        screenY - handleSize,
        handleSize * 2,
        handleSize * 2
      );
    });

    // Draw marquee selection in screen coordinates
    if (this.isMarqueeSelecting) {
      const bounds = getSelectionBounds(
        this.marqueeStartPos,
        this.marqueeEndPos
      );
      const width = bounds.maxX - bounds.minX;
      const height = bounds.maxY - bounds.minY;

      // Convert world coordinates to screen coordinates
      const screenMinX = bounds.minX * state.zoom + state.viewPortOffset.x;
      const screenMinY = bounds.minY * state.zoom + state.viewPortOffset.y;
      const screenWidth = width * state.zoom;
      const screenHeight = height * state.zoom;

      ctx.fillStyle = "rgba(255, 255, 0, 0.2)";
      ctx.fillRect(screenMinX, screenMinY, screenWidth, screenHeight);

      ctx.strokeStyle = "#ffff00";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(screenMinX, screenMinY, screenWidth, screenHeight);
      ctx.setLineDash([]);
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

    if (this.isWithinThreshold(pos, store.start, 15, store.zoom)) {
      return store.start;
    }

    return null;
  }

  private isWithinThreshold(
    pos1: Position,
    pos2: Position,
    threshold: number,
    zoom: number
  ): boolean {
    const distance = Math.sqrt(
      Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2)
    );
    return distance <= threshold / zoom;
  }

  private handleVertexSelection(
    vertex: VertexSelection,
    isCtrlKey: boolean
  ): void {
    const store = useStore.getState();
    const toolState = store.getToolState("select");
    const isSelected = isVertexSelected(vertex, toolState.selectedVertices);

    if (!isCtrlKey && !isSelected) {
      this.clearSelection();
    }

    if (!isSelected) {
      this.selectVertex(vertex.polygon, vertex.vertex);
    }
  }

  private handleObjectSelection(
    object: ObjectSelection,
    isCtrlKey: boolean
  ): void {
    const store = useStore.getState();
    const toolState = store.getToolState("select");
    const isSelected = isObjectSelected(object, toolState.selectedObjects);

    if (!isCtrlKey && !isSelected) {
      this.clearSelection();
    }

    if (!isSelected) {
      this.selectObject(object);
    }
  }

  private startDragging(worldPos: Position): void {
    const store = useStore.getState();
    const toolState = store.getToolState("select");

    this.isDragging = true;
    this.dragStartPos = worldPos;

    // Store original positions of selected items
    this.originalPositions = [
      ...toolState.selectedVertices.map((sv: VertexSelection) => ({
        ...sv.vertex,
      })),
      ...toolState.selectedObjects.map((obj: ObjectSelection) => ({ ...obj })),
    ];
  }

  private startMarqueeSelection(worldPos: Position, isCtrlKey: boolean): void {
    const store = useStore.getState();
    if (!isCtrlKey) {
      this.clearSelection();
    }
    this.isMarqueeSelecting = true;
    this.marqueeStartPos = worldPos;
    this.marqueeEndPos = worldPos;
  }

  private handleDragging(worldPos: Position): void {
    const store = useStore.getState();
    const toolState = store.getToolState("select");
    const totalDeltaX = worldPos.x - this.dragStartPos.x;
    const totalDeltaY = worldPos.y - this.dragStartPos.y;

    if (toolState.selectedVertices.length > 0) {
      const newVertexPositions = toolState.selectedVertices.map(
        (sv: VertexSelection, index: number) => {
          const originalPos = this.originalPositions[index];
          return {
            x: originalPos.x + totalDeltaX,
            y: originalPos.y + totalDeltaY,
          };
        }
      );
      this.updateSelectedVertices(newVertexPositions);
    }

    if (toolState.selectedObjects.length > 0) {
      const vertexCount = toolState.selectedVertices.length;
      const newObjectPositions = toolState.selectedObjects.map(
        (obj: ObjectSelection, index: number) => {
          const originalPos = this.originalPositions[vertexCount + index];
          return {
            x: originalPos.x + totalDeltaX,
            y: originalPos.y + totalDeltaY,
          };
        }
      );
      this.updateSelectedObjects(newObjectPositions);
    }
  }

  private finalizeMarqueeSelection(): void {
    const state = useStore.getState();
    const toolState = state.getToolState("select");
    const bounds = getSelectionBounds(this.marqueeStartPos, this.marqueeEndPos);

    // Select vertices within the marquee
    state.polygons.forEach((polygon: Polygon) => {
      polygon.vertices.forEach((vertex: Position) => {
        if (
          isPointInRect(
            vertex,
            bounds.minX,
            bounds.maxX,
            bounds.minY,
            bounds.maxY
          )
        ) {
          const isSelected = toolState.selectedVertices.some(
            (sv: VertexSelection) =>
              sv.polygon === polygon && sv.vertex === vertex
          );
          if (!isSelected) {
            this.selectVertex(polygon, vertex);
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
    allObjects.forEach(({ obj }: { obj: Position }) => {
      if (
        isPointInRect(obj, bounds.minX, bounds.maxX, bounds.minY, bounds.maxY)
      ) {
        const isSelected = toolState.selectedObjects.includes(obj);
        if (!isSelected) {
          this.selectObject(obj);
        }
      }
    });
  }

  private clearSelection(): void {
    const store = useStore.getState();
    store.setToolState("select", {
      selectedVertices: [],
      selectedObjects: [],
    });
  }

  private selectVertex(polygon: Polygon, vertex: Position): void {
    const store = useStore.getState();
    const toolState = store.getToolState("select");
    store.setToolState("select", {
      selectedVertices: [...toolState.selectedVertices, { polygon, vertex }],
    });
  }

  private selectObject(object: ObjectSelection): void {
    const store = useStore.getState();
    const toolState = store.getToolState("select");
    store.setToolState("select", {
      selectedObjects: [...toolState.selectedObjects, object],
    });
  }

  private updateSelectedVertices(newPositions: Position[]): void {
    const store = useStore.getState();
    const toolState = store.getToolState("select");
    const updatedPolygons = [...store.polygons];
    const updatedSelectedVertices = [...toolState.selectedVertices];

    // Update each selected vertex with its new position
    toolState.selectedVertices.forEach((selection: VertexSelection, index) => {
      const polygonIndex = updatedPolygons.findIndex(
        (p) => p === selection.polygon
      );
      if (polygonIndex !== -1) {
        const vertexIndex = updatedPolygons[polygonIndex].vertices.findIndex(
          (v) => v === selection.vertex
        );
        if (vertexIndex !== -1) {
          updatedPolygons[polygonIndex].vertices[vertexIndex] =
            newPositions[index];
          updatedSelectedVertices[index] = {
            polygon: updatedPolygons[polygonIndex],
            vertex: newPositions[index],
          };
        }
      }
    });

    store.setToolState("select", {
      selectedVertices: updatedSelectedVertices,
    });

    // Update polygons in store
    store.polygons = updatedPolygons;
  }

  private updateSelectedObjects(newPositions: Position[]): void {
    const store = useStore.getState();
    const toolState = store.getToolState("select");
    const updates: any = {};
    const updatedSelectedObjects = [...toolState.selectedObjects];

    // Update each selected object with its new position
    toolState.selectedObjects.forEach((object: ObjectSelection, index) => {
      const newPos = newPositions[index];

      // Find and update the object in the appropriate array
      const appleIndex = store.apples.findIndex((a) => a === object);
      if (appleIndex !== -1) {
        if (!updates.apples) updates.apples = [...store.apples];
        updates.apples[appleIndex] = newPos;
        updatedSelectedObjects[index] = newPos;
      }

      const killerIndex = store.killers.findIndex((k) => k === object);
      if (killerIndex !== -1) {
        if (!updates.killers) updates.killers = [...store.killers];
        updates.killers[killerIndex] = newPos;
        updatedSelectedObjects[index] = newPos;
      }

      const flowerIndex = store.flowers.findIndex((f) => f === object);
      if (flowerIndex !== -1) {
        if (!updates.flowers) updates.flowers = [...store.flowers];
        updates.flowers[flowerIndex] = newPos;
        updatedSelectedObjects[index] = newPos;
      }

      // Check if it's the start position
      if (object === store.start) {
        updates.start = newPos;
        updatedSelectedObjects[index] = newPos;
      }
    });

    // Apply updates to store
    Object.assign(store, updates);

    store.setToolState("select", {
      selectedObjects: updatedSelectedObjects,
    });
  }

  private updatePolygon(index: number, polygon: Polygon): void {
    const store = useStore.getState();
    store.polygons = store.polygons.map((p, i) => (i === index ? polygon : p));
  }

  private removePolygon(index: number): void {
    const store = useStore.getState();
    store.polygons = store.polygons.filter((_, i) => i !== index);
  }

  private deleteSelection(): void {
    const state = useStore.getState();
    const toolState = state.getToolState("select");

    // Group selected vertices by polygon index
    const verticesByPolygonIndex = new Map<number, Position[]>();
    toolState.selectedVertices.forEach(
      ({ polygon, vertex }: VertexSelection) => {
        const polygonIndex = state.polygons.indexOf(polygon);
        if (polygonIndex !== -1) {
          if (!verticesByPolygonIndex.has(polygonIndex)) {
            verticesByPolygonIndex.set(polygonIndex, []);
          }
          verticesByPolygonIndex.get(polygonIndex)!.push(vertex);
        }
      }
    );

    // Delete vertices from each polygon
    const sortedPolygonIndices = Array.from(verticesByPolygonIndex.keys()).sort(
      (a, b) => b - a
    );
    sortedPolygonIndices.forEach((polygonIndex) => {
      const polygon = state.polygons[polygonIndex];
      const verticesToDelete = verticesByPolygonIndex.get(polygonIndex)!;

      if (polygon) {
        const updatedVertices = polygon.vertices.filter(
          (vertex: Position) => !verticesToDelete.includes(vertex)
        );

        if (updatedVertices.length < 3) {
          this.removePolygon(polygonIndex);
        } else {
          this.updatePolygon(polygonIndex, {
            ...polygon,
            vertices: updatedVertices,
          });
        }
      }
    });

    // Delete selected objects
    toolState.selectedObjects.forEach((object: ObjectSelection) => {
      if (state.apples.includes(object)) {
        state.removeObject("apples", object);
      } else if (state.killers.includes(object)) {
        state.removeObject("killers", object);
      } else if (state.flowers.includes(object)) {
        state.removeObject("flowers", object);
      }
    });

    this.clearSelection();
  }
}
