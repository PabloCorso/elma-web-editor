import type { Tool } from "./tool-interface";
import type { EventContext } from "../utils/event-handler";
import { useStore, type Store } from "../useStore";
import { isWithinThreshold } from "../utils/coordinate-utils";
import { findPolygonLineForEditing, findPolygonVertexForEditing } from "../utils/selection-utils";
import { colors } from "../constants";
import type { Polygon, Position } from "elmajs";

export class PolygonTool implements Tool {
  id = "polygon";
  name = "Polygon";
  shortcut = "P";

  onActivate(): void {
    // Polygon tool doesn't need to clear anything on activate
  }

  onDeactivate(): void {
    // Clear drawing polygon and original polygon when deactivating
    useStore.getState().setToolState("polygon", {
      drawingPolygon: [],
      originalPolygon: undefined,
    });
  }

  onPointerDown(_event: PointerEvent, context: EventContext): boolean {
    const store = useStore.getState();
    const worldPos = context.worldPos;
    const toolState = store.getToolState("polygon");

    // If we're already drawing a polygon, continue with normal drawing behavior
    if (toolState.drawingPolygon.length > 0) {
      // Check if clicking near the first point to close the polygon
      if (toolState.drawingPolygon.length >= 3) {
        const firstPoint = toolState.drawingPolygon[0];
        if (isWithinThreshold(worldPos, firstPoint, 15, store.zoom)) {
          const newPolygon = {
            vertices: [...toolState.drawingPolygon],
            grass: false,
          };
          this.addPolygon(newPolygon);
          store.setToolState("polygon", {
            drawingPolygon: [],
            originalPolygon: undefined,
          });
          return true;
        }
      }

      // Continue drawing the current polygon
      const newVertices = [...toolState.drawingPolygon, worldPos];
      store.setToolState("polygon", { drawingPolygon: newVertices });
      return true;
    }

    // If we're not drawing a polygon, check if we clicked near an existing polygon vertex first
    const vertexResult = findPolygonVertexForEditing(
      worldPos,
      store.polygons,
      10,
      store.zoom
    );
    if (vertexResult) {
      // Start editing this polygon from the clicked vertex (without adding a new point)
      this.startEditingFromVertex(vertexResult);
      return true;
    }

    // If not near a vertex, check if we clicked near a polygon line
    const lineResult = findPolygonLineForEditing(
      worldPos,
      store.polygons,
      8,
      store.zoom
    );
    if (lineResult) {
      // Start editing this polygon from the clicked line
      this.startEditingFromLine(lineResult);
      return true;
    }

    // Start a new polygon
    const newVertices = [worldPos];
    store.setToolState("polygon", { drawingPolygon: newVertices });
    return true;
  }

  onKeyDown(event: KeyboardEvent, _context: EventContext): boolean {
    const store = useStore.getState();
    const toolState = store.getToolState("polygon");

    if (event.key === "Escape") {
      // If we're editing an existing polygon, restore it
      if (toolState.originalPolygon) {
        store.polygons = [...store.polygons, toolState.originalPolygon];
        store.setToolState("polygon", {
          drawingPolygon: [],
          originalPolygon: undefined,
        });
      } else {
        // If we're creating a new polygon, just clear the drawing
        store.setToolState("polygon", { drawingPolygon: [] });
      }
      return true;
    }

    if (event.key === " " || event.key === "Space") {
      // Reverse the direction of the polygon by reversing the vertices array
      if (toolState.drawingPolygon.length > 1) {
        const reversedVertices = [...toolState.drawingPolygon].reverse();
        store.setToolState("polygon", { drawingPolygon: reversedVertices });
      }
      return true;
    }

    return false;
  }

  onRightClick(_event: MouseEvent, _context: EventContext): boolean {
    const store = useStore.getState();
    const toolState = store.getToolState("polygon");

    if (toolState.drawingPolygon.length >= 3) {
      const newPolygon = {
        vertices: [...toolState.drawingPolygon],
        grass: false,
      };
      this.addPolygon(newPolygon);
      store.setToolState("polygon", {
        drawingPolygon: [],
        originalPolygon: undefined,
      });
    } else if (toolState.drawingPolygon.length > 0) {
      // If we're editing an existing polygon, restore it
      if (toolState.originalPolygon) {
        store.polygons = [...store.polygons, toolState.originalPolygon];
      }
      store.setToolState("polygon", {
        drawingPolygon: [],
        originalPolygon: undefined,
      });
    }
    return true;
  }

  onRender(ctx: CanvasRenderingContext2D): void {
    const store = useStore.getState();
    const toolState = store.getToolState("polygon");
    if (toolState.drawingPolygon.length === 0) return;

    ctx.strokeStyle = colors.edges;
    ctx.lineWidth = 1 / store.zoom;

    ctx.beginPath();
    ctx.moveTo(toolState.drawingPolygon[0].x, toolState.drawingPolygon[0].y);

    for (let i = 1; i < toolState.drawingPolygon.length; i++) {
      ctx.lineTo(toolState.drawingPolygon[i].x, toolState.drawingPolygon[i].y);
    }

    ctx.stroke();

    // Draw vertices
    ctx.fillStyle = colors.edges;
    toolState.drawingPolygon.forEach((vertex: any) => {
      ctx.beginPath();
      ctx.arc(vertex.x, vertex.y, 2 / store.zoom, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  onRenderOverlay(ctx: CanvasRenderingContext2D): void {
    const store = useStore.getState();
    const toolState = store.getToolState("polygon");
    if (toolState.drawingPolygon.length > 0) {
      const lastPoint =
        toolState.drawingPolygon[toolState.drawingPolygon.length - 1];

      // Convert world coordinates to screen coordinates
      const lastScreenX = lastPoint.x * store.zoom + store.viewPortOffset.x;
      const lastScreenY = lastPoint.y * store.zoom + store.viewPortOffset.y;
      const mouseScreenX =
        store.mousePosition.x * store.zoom + store.viewPortOffset.x;
      const mouseScreenY =
        store.mousePosition.y * store.zoom + store.viewPortOffset.y;

      ctx.strokeStyle = colors.edges;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(lastScreenX, lastScreenY);
      ctx.lineTo(mouseScreenX, mouseScreenY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  private addPolygon(polygon: Polygon): void {
    const store = useStore.getState();
    store.polygons = [...store.polygons, polygon];
  }

  private startEditingFromVertex(vertexResult: {
    polygon: Polygon;
    vertexIndex: number;
    vertex: Position;
  }): void {
    const store = useStore.getState();
    const { polygon, vertexIndex } = vertexResult;

    // Store the original polygon for potential restoration on ESCAPE
    const originalPolygon = polygon;

    // Remove the original polygon from the store
    store.polygons = store.polygons.filter((p) => p !== polygon);

    // Create a new drawing polygon that starts from the clicked vertex
    // and includes all vertices starting from that vertex index
    const vertices = polygon.vertices;
    const drawingVertices = [
      ...vertices.slice(vertexIndex),
      ...vertices.slice(0, vertexIndex),
    ];

    // Set this as the current drawing polygon and store the original
    store.setToolState("polygon", {
      drawingPolygon: drawingVertices,
      originalPolygon: originalPolygon,
    });
  }

  private startEditingFromLine(lineResult: {
    polygon: Polygon;
    insertionIndex: number;
    insertionPoint: Position;
  }): void {
    const store = useStore.getState();
    const { polygon, insertionIndex, insertionPoint } = lineResult;

    // Store the original polygon for potential restoration on ESCAPE
    const originalPolygon = polygon;

    // Remove the original polygon from the store
    store.polygons = store.polygons.filter((p) => p !== polygon);

    // Create a new drawing polygon that starts from the insertion point
    // and includes all vertices starting from the insertion index
    const vertices = polygon.vertices;
    const drawingVertices = [
      insertionPoint,
      ...vertices.slice(insertionIndex),
      ...vertices.slice(0, insertionIndex),
    ];

    // Set this as the current drawing polygon and store the original
    store.setToolState("polygon", {
      drawingPolygon: drawingVertices,
      originalPolygon: originalPolygon,
    });
  }
}
