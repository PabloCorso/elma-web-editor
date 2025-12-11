import { Tool } from "./tool-interface";
import type { EventContext } from "../utils/event-handler";
import type { EditorState } from "../editor-state";
import { isWithinThreshold, worldToScreen } from "../utils/coordinate-utils";
import {
  findPolygonLineForEditing,
  findPolygonVertexForEditing,
} from "../utils/selection-utils";
import { colors } from "../constants";
import type { EditorStore } from "../editor-store";
import { defaultTools } from "./default-tools";
import type { Polygon, Position } from "../elma-types";

const VERTEX_THRESHOLD = 15;

export type VertexToolState = {
  drawingPolygon: Position[];
  originalPolygon?: Polygon; // The polygon being edited (if any)
};

export class VertexTool extends Tool<VertexToolState> {
  readonly meta = defaultTools.vertex;

  constructor(store: EditorStore) {
    super(store);
  }

  onDeactivate(): void {
    const finalized = this.finalizeDrawingOrRestore();
    if (!finalized) {
      this.clear();
    }
  }

  clear(): void {
    const { setToolState } = this.getState();
    setToolState({ drawingPolygon: [], originalPolygon: undefined });
  }

  getDrafts() {
    const { state, toolState } = this.getState();
    const drawingPolygon = toolState.drawingPolygon;

    if (drawingPolygon.length >= 3) {
      // Create a draft polygon that includes the current mouse position
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
    const { state, toolState, setToolState } = this.getState();

    // If we're already drawing a polygon, continue with normal drawing behavior
    if (toolState.drawingPolygon.length > 0) {
      // Check if clicking near the first point to close the polygon
      if (toolState.drawingPolygon.length >= 3) {
        const firstPoint = toolState.drawingPolygon[0];
        if (
          isWithinThreshold(worldPos, firstPoint, VERTEX_THRESHOLD / state.zoom)
        ) {
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
      setToolState({ drawingPolygon: newVertices });
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
    state.actions.setToolState(this.meta.id, { drawingPolygon: newVertices });
    return true;
  }

  onKeyDown(event: KeyboardEvent, _context: EventContext): boolean {
    const { state, toolState, setToolState } = this.getState();

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
        setToolState({ drawingPolygon: [] });
      }
      return true;
    }

    if (event.key === "Enter") {
      return this.finalizeDrawingOrRestore();
    }

    if (event.key === " " || event.key === "Space") {
      // Reverse the direction of the polygon by reversing the vertices array
      if (toolState.drawingPolygon.length > 1) {
        const reversedVertices = [...toolState.drawingPolygon].reverse();
        setToolState({ drawingPolygon: reversedVertices });
      }
      return true;
    }

    return false;
  }

  onRightClick(_event: MouseEvent, _context: EventContext): boolean {
    this.finalizeDrawingOrRestore();
    return true;
  }

  onRender(ctx: CanvasRenderingContext2D): void {
    const { state, toolState } = this.getState();
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
    const { state, toolState } = this.getState();
    if (toolState.drawingPolygon.length > 0) {
      const lastPoint =
        toolState.drawingPolygon[toolState.drawingPolygon.length - 1];

      // Convert world coordinates to screen coordinates
      const lastScreen = worldToScreen(
        lastPoint,
        state.viewPortOffset,
        state.zoom
      );
      const mouseScreen = worldToScreen(
        state.mousePosition,
        state.viewPortOffset,
        state.zoom
      );

      // Draw preview line from last point to mouse cursor (solid)
      ctx.strokeStyle = colors.edges;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lastScreen.x, lastScreen.y);
      ctx.lineTo(mouseScreen.x, mouseScreen.y);
      ctx.stroke();

      // Draw potential closing line from first point to mouse cursor when we have 3+ vertices (dashed)
      if (toolState.drawingPolygon.length >= 3) {
        const firstPoint = toolState.drawingPolygon[0];
        const firstScreen = worldToScreen(
          firstPoint,
          state.viewPortOffset,
          state.zoom
        );

        ctx.strokeStyle = colors.edges;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]); // Dashed line for closing edge
        ctx.beginPath();
        ctx.moveTo(firstScreen.x, firstScreen.y);
        ctx.lineTo(mouseScreen.x, mouseScreen.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  private addPolygon(polygon: Polygon): void {
    const { state } = this.getState();
    state.actions.setPolygons([...state.polygons, polygon]);
  }

  private finalizeDrawingOrRestore(): boolean {
    const { state, toolState } = this.getState();
    if (!toolState) return false;

    if (toolState.drawingPolygon.length >= 3) {
      this.addPolygon({
        vertices: [...toolState.drawingPolygon],
        grass: false,
      });
      this.clear();
      return true;
    }

    if (toolState.drawingPolygon.length > 0) {
      if (toolState.originalPolygon) {
        state.actions.setPolygons([
          ...state.polygons,
          toolState.originalPolygon,
        ]);
      }
      this.clear();
      return true;
    }

    return false;
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
    state.actions.setToolState(this.meta.id, {
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
    state.actions.setToolState(this.meta.id, {
      drawingPolygon: drawingVertices,
      originalPolygon: originalPolygon,
    });
  }
}
