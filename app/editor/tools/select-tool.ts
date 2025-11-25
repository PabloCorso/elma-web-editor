import { Tool } from "./tool-interface";
import type { EventContext } from "../utils/event-handler";
import type { Position, Polygon } from "elmajs";
import {
  findVertexNearPosition,
  findObjectNearPosition,
  findPolygonEdgeNearPosition,
  isVertexSelected,
  isObjectSelected,
  getAllObjects,
  isPointInRect,
  getSelectionBounds,
} from "../utils/selection-utils";
import { colors } from "../constants";
import type { Apple } from "../editor.types";
import type { EditorStore } from "../editor-store";

export type SelectionToolState = {
  selectedVertices: Array<{ polygon: Polygon; vertex: Position }>;
  selectedObjects: Position[];
};

type VertexSelection = { polygon: Polygon; vertex: Position };
type ObjectSelection = Position;

export class SelectTool extends Tool {
  readonly id = "select";
  readonly name = "Select";
  readonly shortcut = "S";

  constructor(store: EditorStore) {
    super(store);
  }

  private isDragging = false;
  private dragStartPos = { x: 0, y: 0 };
  private dragOriginPositions: Position[] = [];
  private isMarqueeSelecting = false;
  private marqueeStartPos = { x: 0, y: 0 };
  private marqueeEndPos = { x: 0, y: 0 };

  onDeactivate(): void {
    this.clear();
  }

  clear(): void {
    const state = this.store.getState();
    state.actions.setToolState("select", {
      selectedVertices: [],
      selectedObjects: [],
    });
    this.isDragging = false;
    this.isMarqueeSelecting = false;
    this.dragOriginPositions = [];
  }

  onPointerDown(event: PointerEvent, context: EventContext): boolean {
    const state = this.store.getState();
    const vertex = findVertexNearPosition(
      context.worldPos,
      state.polygons,
      10,
      state.zoom
    );
    const object = this.findObjectNearPosition(context.worldPos);
    const polygonEdge = findPolygonEdgeNearPosition(
      context.worldPos,
      state.polygons,
      8,
      state.zoom
    );

    if (vertex) {
      this.handleVertexSelection(vertex, event.ctrlKey);
      this.startDragging(context.worldPos);
      return true;
    } else if (object) {
      this.handleObjectSelection(object, event.ctrlKey);
      this.startDragging(context.worldPos);
      return true;
    } else if (polygonEdge) {
      this.handlePolygonSelection(polygonEdge, event.ctrlKey);
      this.startDragging(context.worldPos);
      return true;
    }

    this.startMarqueeSelection(context.worldPos, event.ctrlKey);
    return true;
  }

  onPointerMove(_event: PointerEvent, context: EventContext): boolean {
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

  onPointerUp(_event: PointerEvent, _context: EventContext): boolean {
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

  onKeyDown(event: KeyboardEvent, _context: EventContext): boolean {
    if (event.key === "Delete" || event.key === "Backspace") {
      this.deleteSelection();
      return true;
    }
    if (event.key === "Escape") {
      this.clear();
      return true;
    }
    return false;
  }

  onRenderOverlay(ctx: CanvasRenderingContext2D): void {
    const state = this.store.getState();
    // Draw selection handles in screen coordinates
    ctx.fillStyle = colors.selection;
    const handleSize = 3; // Fixed size in screen pixels
    const toolState = state.actions.getToolState<SelectionToolState>("select");

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
    const state = this.store.getState();

    const apple = findObjectNearPosition(
      pos,
      state.apples.map((a) => a.position),
      15,
      state.zoom
    );
    if (apple) return apple;

    const killer = findObjectNearPosition(pos, state.killers, 15, state.zoom);
    if (killer) return killer;

    const flower = findObjectNearPosition(pos, state.flowers, 15, state.zoom);
    if (flower) return flower;

    if (this.isWithinThreshold(pos, state.start, 15, state.zoom)) {
      return state.start;
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
    const state = this.store.getState();
    const toolState = state.actions.getToolState<SelectionToolState>("select");
    const isSelected = isVertexSelected(vertex, toolState.selectedVertices);

    if (!isCtrlKey && !isSelected) {
      this.clear();
    }

    if (!isSelected) {
      this.selectVertex(vertex.polygon, vertex.vertex);
    }
  }

  private handleObjectSelection(
    object: ObjectSelection,
    isCtrlKey: boolean
  ): void {
    const state = this.store.getState();
    const toolState = state.actions.getToolState<SelectionToolState>("select");
    const isSelected = isObjectSelected(object, toolState.selectedObjects);

    if (!isCtrlKey && !isSelected) {
      this.clear();
    }

    if (!isSelected) {
      this.selectObject(object);
    }
  }

  private handlePolygonSelection(polygon: Polygon, isCtrlKey: boolean): void {
    const state = this.store.getState();
    const toolState = state.actions.getToolState<SelectionToolState>("select");
    const isSelected = toolState.selectedVertices.some(
      (sv: VertexSelection) => sv.polygon === polygon
    );

    if (!isCtrlKey && !isSelected) {
      this.clear();
    }

    if (!isSelected) {
      this.selectPolygon(polygon);
    }
  }

  private startDragging(worldPos: Position): void {
    const state = this.store.getState();
    const toolState = state.actions.getToolState<SelectionToolState>("select");

    this.isDragging = true;
    this.dragStartPos = worldPos;

    // Store original positions of selected items for delta calculations
    this.dragOriginPositions = [
      ...toolState.selectedVertices.map((sv: VertexSelection) => ({
        ...sv.vertex,
      })),
      ...toolState.selectedObjects.map((obj: ObjectSelection) => ({ ...obj })),
    ];
  }

  private startMarqueeSelection(worldPos: Position, isCtrlKey: boolean): void {
    if (!isCtrlKey) {
      this.clear();
    }
    this.isMarqueeSelecting = true;
    this.marqueeStartPos = worldPos;
    this.marqueeEndPos = worldPos;
  }

  private handleDragging(worldPos: Position): void {
    const state = this.store.getState();
    const toolState = state.actions.getToolState<SelectionToolState>("select");
    const totalDeltaX = worldPos.x - this.dragStartPos.x;
    const totalDeltaY = worldPos.y - this.dragStartPos.y;

    if (toolState.selectedVertices.length > 0) {
      const newVertexPositions = toolState.selectedVertices.map(
        (sv: VertexSelection, index: number) => {
          const originalPos = this.dragOriginPositions[index];
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
          const originPos = this.dragOriginPositions[vertexCount + index];
          return {
            x: originPos.x + totalDeltaX,
            y: originPos.y + totalDeltaY,
          };
        }
      );
      this.updateSelectedObjects(newObjectPositions);
    }
  }

  private finalizeMarqueeSelection(): void {
    const state = this.store.getState();
    const toolState = state.actions.getToolState<SelectionToolState>("select");
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
      state.apples.map((a) => a.position),
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

  private selectVertex(polygon: Polygon, vertex: Position): void {
    const state = this.store.getState();
    const toolState = state.actions.getToolState<SelectionToolState>("select");
    state.actions.setToolState("select", {
      selectedVertices: [...toolState.selectedVertices, { polygon, vertex }],
    });
  }

  private selectObject(object: ObjectSelection): void {
    const state = this.store.getState();
    const toolState = state.actions.getToolState<SelectionToolState>("select");
    state.actions.setToolState("select", {
      selectedObjects: [...toolState.selectedObjects, object],
    });
  }

  private selectPolygon(polygon: Polygon): void {
    const state = this.store.getState();
    const toolState = state.actions.getToolState<SelectionToolState>("select");

    // Filter out vertices that are already selected
    const existingSelectedVertices = toolState.selectedVertices.filter(
      (sv: VertexSelection) => sv.polygon !== polygon
    );

    const polygonVertices = polygon.vertices.map((vertex) => ({
      polygon,
      vertex,
    }));
    state.actions.setToolState("select", {
      selectedVertices: [...existingSelectedVertices, ...polygonVertices],
    });
  }

  private updateSelectedVertices(newPositions: Position[]): void {
    const state = this.store.getState();
    const toolState = state.actions.getToolState<SelectionToolState>("select");
    const updatedPolygons = [...state.polygons];
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

    state.actions.setToolState("select", {
      selectedVertices: updatedSelectedVertices,
    });

    // Update polygons in store
    state.actions.setPolygons(updatedPolygons);
  }

  private updateSelectedObjects(newPositions: Position[]): void {
    const state = this.store.getState();
    const toolState = state.actions.getToolState<SelectionToolState>("select");
    const updates: {
      apples?: Apple[];
      killers?: Position[];
      flowers?: Position[];
      start?: Position;
    } = {};
    const updatedSelectedObjects = [...toolState.selectedObjects];

    // Update each selected object with its new position
    toolState.selectedObjects.forEach((object: ObjectSelection, index) => {
      const newPos = newPositions[index];

      // Find and update the object in the appropriate array
      const appleIndex = state.apples.findIndex((a) => a.position === object);
      if (appleIndex !== -1) {
        if (!updates.apples) updates.apples = [...state.apples];
        updates.apples[appleIndex] = {
          position: newPos,
          animation: 0,
          gravity: 0,
        };
        updatedSelectedObjects[index] = newPos;
      }

      const killerIndex = state.killers.findIndex((k) => k === object);
      if (killerIndex !== -1) {
        if (!updates.killers) updates.killers = [...state.killers];
        updates.killers[killerIndex] = newPos;
        updatedSelectedObjects[index] = newPos;
      }

      const flowerIndex = state.flowers.findIndex((f) => f === object);
      if (flowerIndex !== -1) {
        if (!updates.flowers) updates.flowers = [...state.flowers];
        updates.flowers[flowerIndex] = newPos;
        updatedSelectedObjects[index] = newPos;
      }

      // Check if it's the start position
      if (object === state.start) {
        updates.start = newPos;
        updatedSelectedObjects[index] = newPos;
      }
    });

    // Apply updates to store
    Object.assign(state, updates);

    state.actions.setToolState("select", {
      selectedObjects: updatedSelectedObjects,
    });
  }

  private updatePolygon(index: number, polygon: Polygon): void {
    const state = this.store.getState();
    state.actions.setPolygons(
      state.polygons.map((p, i) => (i === index ? polygon : p))
    );
  }

  private removePolygon(index: number): void {
    const state = this.store.getState();
    state.actions.setPolygons(state.polygons.filter((_, i) => i !== index));
  }

  private deleteSelection(): void {
    const state = this.store.getState();
    const toolState = state.actions.getToolState<SelectionToolState>("select");

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
      const apple = state.apples.find((a) => a.position === object);
      if (apple) {
        state.actions.removeApple(apple);
      } else if (state.killers.some((k) => k === object)) {
        state.actions.removeKiller(object);
      } else if (state.flowers.some((f) => f === object)) {
        state.actions.removeFlower(object);
      }
    });

    this.clear();
  }
}
