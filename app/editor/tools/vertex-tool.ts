import { Tool } from "./tool-interface";
import type { EventContext } from "../helpers/event-handler";
import type { EditorState } from "../editor-state";
import {
  isWithinThreshold,
  worldToScreen,
} from "../helpers/coordinate-helpers";
import {
  findPolygonEdgeNearPosition,
  findPolygonLineForEditing,
  findPolygonVertexForEditing,
} from "../helpers/selection-helpers";
import { colors } from "../constants";
import type { EditorStore } from "../editor-store";
import { defaultTools } from "./default-tools";
import type { Polygon, Position } from "../elma-types";
import { SELECT_POLYGON_EDGE_THRESHOLD } from "./select-tool";

const VERTEX_THRESHOLD = 15;
const DEFAULT_VARIANT: VertexToolVariant = "default";

export type VertexToolVariant = "default" | "grass";

export type VertexToolState = {
  drawingPolygon: Polygon;
  editingPolygon?: Polygon;
  variant?: VertexToolVariant;
};

export class VertexTool extends Tool<VertexToolState> {
  readonly meta = defaultTools.vertex;

  constructor(store: EditorStore) {
    super(store);
  }

  onActivate(variant: VertexToolVariant = DEFAULT_VARIANT): void {
    const { setToolState } = this.getState();
    setToolState({
      drawingPolygon: { vertices: [], grass: variant === "grass" },
      variant,
    });
  }

  onDeactivate(): void {
    const finalized = this.finalizeDrawingOrRestore();
    if (!finalized) {
      this.clear();
    }
  }

  clear(): void {
    const { toolState, setToolState } = this.getState();
    // Preserve the current variant when clearing
    const currentVariant = toolState?.variant ?? DEFAULT_VARIANT;
    setToolState({
      drawingPolygon: { vertices: [], grass: currentVariant === "grass" },
      editingPolygon: undefined,
      variant: currentVariant,
    });
  }

  getDrafts() {
    const { state, toolState } = this.getState();
    if (!toolState) return { polygons: [] };

    if (toolState.drawingPolygon.vertices.length >= 3) {
      // Create a draft polygon that includes the current mouse position
      return {
        polygons: [
          {
            vertices: [
              ...toolState.drawingPolygon.vertices,
              state.mousePosition,
            ],
            grass: toolState.drawingPolygon.grass,
          },
        ],
      };
    }

    return { polygons: [] };
  }

  onPointerDown(_event: PointerEvent, context: EventContext): boolean {
    const worldPos = context.worldPos;
    const { state, toolState, setToolState } = this.getState();
    if (!toolState) return false;

    // If we're already drawing a polygon, continue with normal drawing behavior
    if (toolState.drawingPolygon.vertices.length > 0) {
      // Check if clicking near the first point to close the polygon
      if (toolState.drawingPolygon.vertices.length >= 3) {
        const firstPoint = toolState.drawingPolygon.vertices[0];
        if (
          isWithinThreshold(worldPos, firstPoint, VERTEX_THRESHOLD / state.zoom)
        ) {
          const newPolygon = {
            vertices: [...toolState.drawingPolygon.vertices],
            grass: toolState.drawingPolygon.grass,
          };
          this.addPolygon(newPolygon);
          this.clear();
          return true;
        }
      }

      // Continue drawing the current polygon
      const newVertices = [...toolState.drawingPolygon.vertices, worldPos];
      setToolState({
        drawingPolygon: { ...toolState.drawingPolygon, vertices: newVertices },
      });
      return true;
    }

    // If we're not drawing a polygon, check if we clicked near an existing polygon vertex first
    const vertexResult = findPolygonVertexForEditing(
      worldPos,
      state.polygons,
      10,
      state.zoom,
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
      state.zoom,
    );
    if (lineResult) {
      // Start editing this polygon from the clicked line
      this.startEditingFromLine(state, lineResult);
      return true;
    }

    // Start a new polygon
    const newVertices = [worldPos];
    setToolState({
      drawingPolygon: {
        vertices: newVertices,
        grass: toolState.variant === "grass",
      },
    });
    return true;
  }

  onKeyDown(event: KeyboardEvent, _context: EventContext): boolean {
    const { state, toolState, setToolState } = this.getState();
    if (!toolState) return false;

    if (event.key === "Escape") {
      // If we're editing an existing polygon, restore it
      if (toolState.editingPolygon) {
        state.actions.setPolygons([
          ...state.polygons,
          toolState.editingPolygon,
        ]);
        this.clear();
      } else {
        this.clear();
      }
      return true;
    }

    if (event.key === "Enter") {
      return this.finalizeDrawingOrRestore();
    }

    if (event.key === " " || event.key === "Space") {
      // Reverse the direction of the polygon by reversing the vertices array
      if (toolState.drawingPolygon.vertices.length > 1) {
        const reversedVertices = [
          ...toolState.drawingPolygon.vertices,
        ].reverse();
        setToolState({
          drawingPolygon: {
            ...toolState.drawingPolygon,
            vertices: reversedVertices,
          },
        });
      }
      return true;
    }

    if (event.key.toUpperCase() === "G" || event.key.toUpperCase() === "V") {
      const targetGrass = event.key.toUpperCase() === "G";
      const targetVariant = targetGrass ? "grass" : "default";

      // Only switch if not already in target mode
      if (toolState.drawingPolygon.grass !== targetGrass) {
        setToolState({
          drawingPolygon: { ...toolState.drawingPolygon, grass: targetGrass },
          variant: targetVariant,
        });
      }
      return true;
    }

    return false;
  }

  onRightClick(_event: MouseEvent, context: EventContext): boolean {
    const { state, toolState } = this.getState();
    const isDrawing = (toolState?.drawingPolygon.vertices.length ?? 0) > 0;
    if (isDrawing) {
      this.finalizeDrawingOrRestore();
      return true;
    }

    const polygon = findPolygonEdgeNearPosition(
      context.worldPos,
      state.polygons,
      SELECT_POLYGON_EDGE_THRESHOLD / state.zoom,
    );
    if (polygon) {
      this.updatePolygon(state.polygons.indexOf(polygon), {
        ...polygon,
        grass: !polygon.grass,
      });
      return true;
    }

    return false;
  }

  private updatePolygon(index: number, polygon: Polygon): void {
    const { state } = this.getState();
    state.actions.setPolygons(
      state.polygons.map((p, i) => (i === index ? polygon : p)),
    );
  }

  onRender(ctx: CanvasRenderingContext2D): void {
    const { state, toolState } = this.getState();
    if (!toolState || toolState.drawingPolygon.vertices.length === 0) return;

    const isGrass = toolState.drawingPolygon.grass;
    ctx.strokeStyle = isGrass ? colors.grass : colors.edges;
    ctx.lineWidth = 1 / state.zoom;

    ctx.beginPath();
    ctx.moveTo(
      toolState.drawingPolygon.vertices[0].x,
      toolState.drawingPolygon.vertices[0].y,
    );

    for (let i = 1; i < toolState.drawingPolygon.vertices.length; i++) {
      ctx.lineTo(
        toolState.drawingPolygon.vertices[i].x,
        toolState.drawingPolygon.vertices[i].y,
      );
    }

    ctx.stroke();

    // Draw vertices
    ctx.fillStyle = colors.edges;
    toolState.drawingPolygon.vertices.forEach((vertex) => {
      ctx.beginPath();
      ctx.arc(vertex.x, vertex.y, 2 / state.zoom, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  onRenderOverlay(ctx: CanvasRenderingContext2D): void {
    const { state, toolState } = this.getState();
    if (!toolState || toolState.drawingPolygon.vertices.length === 0) return;

    const lastPoint =
      toolState.drawingPolygon.vertices[
        toolState.drawingPolygon.vertices.length - 1
      ];

    // Convert world coordinates to screen coordinates
    const lastScreen = worldToScreen(
      lastPoint,
      state.viewPortOffset,
      state.zoom,
    );
    const mouseScreen = worldToScreen(
      state.mousePosition,
      state.viewPortOffset,
      state.zoom,
    );

    // Draw preview line from last point to mouse cursor (solid)
    const isGrass = toolState.drawingPolygon.grass;
    ctx.strokeStyle = isGrass ? colors.grass : colors.edges;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lastScreen.x, lastScreen.y);
    ctx.lineTo(mouseScreen.x, mouseScreen.y);
    ctx.stroke();

    // Draw potential closing line from first point to mouse cursor when we have 3+ vertices (dashed)
    if (toolState.drawingPolygon.vertices.length >= 3) {
      const firstPoint = toolState.drawingPolygon.vertices[0];
      const firstScreen = worldToScreen(
        firstPoint,
        state.viewPortOffset,
        state.zoom,
      );

      // Workaround to draw dashed line on top of solid line
      // There is a solid line being drawn by EditorEngine already at drawPolygons stage
      ctx.strokeStyle = colors.ground;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]); // Dashed line for closing edge
      ctx.beginPath();
      ctx.moveTo(firstScreen.x, firstScreen.y);
      ctx.lineTo(mouseScreen.x, mouseScreen.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  private addPolygon(polygon: Polygon): void {
    const { state } = this.getState();
    state.actions.setPolygons([...state.polygons, polygon]);
  }

  private finalizeDrawingOrRestore(): boolean {
    const { state, toolState } = this.getState();
    if (!toolState) return false;

    if (toolState.drawingPolygon.vertices.length >= 3) {
      this.addPolygon({
        vertices: [...toolState.drawingPolygon.vertices],
        grass: toolState.drawingPolygon.grass,
      });
      this.clear();
      return true;
    }

    if (toolState.drawingPolygon.vertices.length > 0) {
      if (toolState.editingPolygon) {
        state.actions.setPolygons([
          ...state.polygons,
          toolState.editingPolygon,
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
    },
  ): void {
    const { setToolState } = this.getState();
    const { polygon, vertexIndex } = vertexResult;

    // Store the original polygon for potential restoration on ESCAPE
    const editingPolygon = polygon;

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
    setToolState({
      drawingPolygon: {
        vertices: drawingVertices,
        grass: editingPolygon.grass,
      },
      editingPolygon: editingPolygon,
      variant: editingPolygon.grass ? "grass" : "default",
    });
  }

  private startEditingFromLine(
    state: EditorState,
    lineResult: {
      polygon: Polygon;
      insertionIndex: number;
      insertionPoint: Position;
    },
  ): void {
    const { setToolState } = this.getState();
    const { polygon, insertionIndex, insertionPoint } = lineResult;

    // Store the original polygon for potential restoration on ESCAPE
    const editingPolygon = polygon;

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
    setToolState({
      drawingPolygon: {
        vertices: drawingVertices,
        grass: editingPolygon.grass,
      },
      editingPolygon: editingPolygon,
      variant: editingPolygon.grass ? "grass" : "default",
    });
  }
}
