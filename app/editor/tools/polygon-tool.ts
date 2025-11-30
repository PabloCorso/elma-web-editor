import { Tool } from "./tool-interface";
import type { EventContext } from "../utils/event-handler";
import type { EditorState } from "../editor-state";
import { isWithinThreshold } from "../utils/coordinate-utils";
import {
  findPolygonLineForEditing,
  findPolygonVertexForEditing,
} from "../utils/selection-utils";
import { colors } from "../constants";
import type { Polygon, Position } from "elmajs";
import type { EditorStore } from "../editor-store";

export type PolygonToolState = {
  drawingPolygon: Position[];
  originalPolygon?: Polygon; // The polygon being edited (if any)
};

export class PolygonTool extends Tool {
  readonly id = "polygon";
  readonly name = "Polygon";
  readonly shortcut = "P";

  constructor(store: EditorStore) {
    super(store);
  }

  onDeactivate(): void {
    this.clear();
  }

  clear(): void {
    const state = this.store.getState();
    state.actions.setToolState("polygon", {
      drawingPolygon: [],
      originalPolygon: undefined,
    });
  }

  getDrafts() {
    const state = this.store.getState();
    const toolState = state.actions.getToolState<PolygonToolState>("polygon");
    const drawingPolygon = toolState.drawingPolygon;

    if (drawingPolygon.length >= 3) {
      // Create a temporary polygon that includes the current mouse position
      return {
        polygons: [
          { vertices: [...drawingPolygon, state.mousePosition], grass: false },
        ],
      };
    }

    return { polygons: [] };
  }

  onPointerDown(_event: PointerEvent, context: EventContext): boolean {
    const worldPos = context.worldPos;
    const state = this.store.getState();
    const toolState = state.actions.getToolState<PolygonToolState>("polygon");

    // If we're already drawing a polygon, continue with normal drawing behavior
    if (toolState.drawingPolygon.length > 0) {
      // Check if clicking near the first point to close the polygon
      if (toolState.drawingPolygon.length >= 3) {
        const firstPoint = toolState.drawingPolygon[0];
        if (isWithinThreshold(worldPos, firstPoint, 15, state.zoom)) {
          const newPolygon = {
            vertices: [...toolState.drawingPolygon],
            grass: false,
          };
          this.addPolygon(newPolygon);
          this.clear();
          return true;
        }
      }

      // Continue drawing the current polygon
      const newVertices = [...toolState.drawingPolygon, worldPos];
      state.actions.setToolState("polygon", { drawingPolygon: newVertices });
      return true;
    }

    // If we're not drawing a polygon, check if we clicked near an existing polygon vertex first
    const vertexResult = findPolygonVertexForEditing(
      worldPos,
      state.polygons,
      10,
      state.zoom
    );
    if (vertexResult) {
      // Start editing this polygon from the clicked vertex (without adding a new point)
      this.startEditingFromVertex(state, vertexResult);
      return true;
    }

    // If not near a vertex, check if we clicked near a polygon line
    const lineResult = findPolygonLineForEditing(
      worldPos,
      state.polygons,
      8,
      state.zoom
    );
    if (lineResult) {
      // Start editing this polygon from the clicked line
      this.startEditingFromLine(state, lineResult);
      return true;
    }

    // Start a new polygon
    const newVertices = [worldPos];
    state.actions.setToolState("polygon", { drawingPolygon: newVertices });
    return true;
  }

  onKeyDown(event: KeyboardEvent, _context: EventContext): boolean {
    const state = this.store.getState();
    const toolState = state.actions.getToolState<PolygonToolState>("polygon");

    if (event.key === "Escape") {
      // If we're editing an existing polygon, restore it
      if (toolState.originalPolygon) {
        state.actions.setPolygons([
          ...state.polygons,
          toolState.originalPolygon,
        ]);
        this.clear();
      } else {
        // If we're creating a new polygon, just clear the drawing
        state.actions.setToolState("polygon", { drawingPolygon: [] });
      }
      return true;
    }

    if (event.key === " " || event.key === "Space") {
      // Reverse the direction of the polygon by reversing the vertices array
      if (toolState.drawingPolygon.length > 1) {
        const reversedVertices = [...toolState.drawingPolygon].reverse();
        state.actions.setToolState("polygon", {
          drawingPolygon: reversedVertices,
        });
      }
      return true;
    }

    return false;
  }

  onRightClick(_event: MouseEvent, _context: EventContext): boolean {
    const state = this.store.getState();
    const toolState = state.actions.getToolState<PolygonToolState>("polygon");

    if (toolState.drawingPolygon.length >= 3) {
      const newPolygon = {
        vertices: [...toolState.drawingPolygon],
        grass: false,
      };
      this.addPolygon(newPolygon);
      this.clear();
    } else if (toolState.drawingPolygon.length > 0) {
      // If we're editing an existing polygon, restore it
      if (toolState.originalPolygon) {
        state.actions.setPolygons([
          ...state.polygons,
          toolState.originalPolygon,
        ]);
      }

      this.clear();
    }
    return true;
  }

  onRender(ctx: CanvasRenderingContext2D): void {
    const state = this.store.getState();
    const toolState = state.actions.getToolState<PolygonToolState>("polygon");
    if (toolState.drawingPolygon.length === 0) return;

    ctx.strokeStyle = colors.edges;
    ctx.lineWidth = 1 / state.zoom;

    ctx.beginPath();
    ctx.moveTo(toolState.drawingPolygon[0].x, toolState.drawingPolygon[0].y);

    for (let i = 1; i < toolState.drawingPolygon.length; i++) {
      ctx.lineTo(toolState.drawingPolygon[i].x, toolState.drawingPolygon[i].y);
    }

    ctx.stroke();

    // Draw vertices
    ctx.fillStyle = colors.edges;
    toolState.drawingPolygon.forEach((vertex) => {
      ctx.beginPath();
      ctx.arc(vertex.x, vertex.y, 2 / state.zoom, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  onRenderOverlay(ctx: CanvasRenderingContext2D): void {
    const state = this.store.getState();
    const toolState = state.actions.getToolState<PolygonToolState>("polygon");
    if (toolState.drawingPolygon.length > 0) {
      const lastPoint =
        toolState.drawingPolygon[toolState.drawingPolygon.length - 1];

      // Convert world coordinates to screen coordinates
      const lastScreenX = lastPoint.x * state.zoom + state.viewPortOffset.x;
      const lastScreenY = lastPoint.y * state.zoom + state.viewPortOffset.y;
      const mouseScreenX =
        state.mousePosition.x * state.zoom + state.viewPortOffset.x;
      const mouseScreenY =
        state.mousePosition.y * state.zoom + state.viewPortOffset.y;

      // Draw preview line from last point to mouse cursor (solid)
      ctx.strokeStyle = colors.edges;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lastScreenX, lastScreenY);
      ctx.lineTo(mouseScreenX, mouseScreenY);
      ctx.stroke();

      // Draw potential closing line from first point to mouse cursor when we have 3+ vertices (dashed)
      if (toolState.drawingPolygon.length >= 3) {
        const firstPoint = toolState.drawingPolygon[0];
        const firstScreenX = firstPoint.x * state.zoom + state.viewPortOffset.x;
        const firstScreenY = firstPoint.y * state.zoom + state.viewPortOffset.y;

        ctx.strokeStyle = colors.edges;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]); // Dashed line for closing edge
        ctx.beginPath();
        ctx.moveTo(firstScreenX, firstScreenY);
        ctx.lineTo(mouseScreenX, mouseScreenY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  private addPolygon(polygon: Polygon): void {
    const state = this.store.getState();
    state.actions.setPolygons([...state.polygons, polygon]);
  }

  private startEditingFromVertex(
    state: EditorState,
    vertexResult: {
      polygon: Polygon;
      vertexIndex: number;
      vertex: Position;
    }
  ): void {
    const { polygon, vertexIndex } = vertexResult;

    // Store the original polygon for potential restoration on ESCAPE
    const originalPolygon = polygon;

    // Remove the original polygon from the store
    state.actions.setPolygons(state.polygons.filter((p) => p !== polygon));

    // Create a new drawing polygon that starts from the clicked vertex
    // and includes all vertices starting from that vertex index
    const vertices = polygon.vertices;
    const drawingVertices = [
      ...vertices.slice(vertexIndex),
      ...vertices.slice(0, vertexIndex),
    ];

    // Set this as the current drawing polygon and store the original
    state.actions.setToolState("polygon", {
      drawingPolygon: drawingVertices,
      originalPolygon: originalPolygon,
    });
  }

  private startEditingFromLine(
    state: EditorState,
    lineResult: {
      polygon: Polygon;
      insertionIndex: number;
      insertionPoint: Position;
    }
  ): void {
    const { polygon, insertionIndex, insertionPoint } = lineResult;

    // Store the original polygon for potential restoration on ESCAPE
    const originalPolygon = polygon;

    // Remove the original polygon from the store
    state.actions.setPolygons(state.polygons.filter((p) => p !== polygon));

    // Create a new drawing polygon that starts from the insertion point
    // and includes all vertices starting from the insertion index
    const vertices = polygon.vertices;
    const drawingVertices = [
      insertionPoint,
      ...vertices.slice(insertionIndex),
      ...vertices.slice(0, insertionIndex),
    ];

    // Set this as the current drawing polygon and store the original
    state.actions.setToolState("polygon", {
      drawingPolygon: drawingVertices,
      originalPolygon: originalPolygon,
    });
  }
}
