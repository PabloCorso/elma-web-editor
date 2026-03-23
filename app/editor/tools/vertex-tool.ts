import { Tool } from "./tool-interface";
import type { EventContext } from "../helpers/event-handler";
import type { EditorState } from "../editor-state";
import type { PartialEditorState } from "../editor-store";
import {
  isWithinThreshold,
  worldToScreen,
} from "../helpers/coordinate-helpers";
import {
  findPolygonEdgeNearPosition,
  findPolygonLineForEditing,
  findPolygonVertexForEditing,
} from "../helpers/selection-helpers";
import { isPolygonClockwise } from "../helpers/polygon-helpers";
import {
  colors,
  selectionThresholds,
  uiColors,
  uiSelectionHandle,
  uiStrokeWidths,
} from "../constants";
import type { EditorStore } from "../editor-store";
import { defaultTools } from "./default-tools";
import type { Polygon, Position } from "../elma-types";
import { checkModifierKey } from "~/utils/misc";
import fastDeepEqual from "fast-deep-equal";

const CLOSE_POLYGON_THRESHOLD = 15;
const DEFAULT_VARIANT: VertexToolVariant = "default";

export type VertexToolVariant = "default" | "grass";

export type VertexToolState = {
  drawingPolygon: Polygon;
  editingPolygon?: Polygon;
  editPivot?: Position;
  variant?: VertexToolVariant;
};

export function canToggleVertexToolDirection(
  toolState?: VertexToolState,
): toolState is VertexToolState {
  return (toolState?.drawingPolygon.vertices.length ?? 0) > 1;
}

export function getToggledVertexToolState(
  toolState: VertexToolState,
): Pick<VertexToolState, "drawingPolygon" | "editPivot"> | null {
  if (!canToggleVertexToolDirection(toolState)) {
    return null;
  }

  const pivot =
    toolState.editPivot ??
    toolState.drawingPolygon.vertices[
      toolState.drawingPolygon.vertices.length - 1
    ];
  const pivotIndex = toolState.drawingPolygon.vertices.indexOf(pivot);
  if (pivotIndex === -1) {
    return null;
  }

  const surroundingVertices = [
    ...toolState.drawingPolygon.vertices.slice(pivotIndex + 1),
    ...toolState.drawingPolygon.vertices.slice(0, pivotIndex),
  ];

  return {
    drawingPolygon: {
      ...toolState.drawingPolygon,
      vertices: [pivot, ...surroundingVertices.reverse()],
    },
    editPivot: pivot,
  };
}

export class VertexTool extends Tool<VertexToolState> {
  readonly meta = defaultTools.vertex;

  constructor(store: EditorStore) {
    super(store);
  }

  onActivate(variant?: VertexToolVariant): void {
    const { toolState, setToolState } = this.getState();
    const nextVariant = variant ?? toolState?.variant ?? DEFAULT_VARIANT;
    setToolState({
      drawingPolygon: { vertices: [], grass: nextVariant === "grass" },
      editPivot: undefined,
      variant: nextVariant,
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
      editPivot: undefined,
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

  onPointerDown(event: PointerEvent, context: EventContext): boolean {
    const worldPos = context.worldPos;
    const { state, toolState, setToolState } = this.getState();
    if (!toolState) return false;

    // If we're already drawing a polygon, continue with normal drawing behavior
    if (toolState.drawingPolygon.vertices.length > 0) {
      // Check if clicking near the first point to close the polygon
      if (toolState.drawingPolygon.vertices.length >= 3) {
        const firstPoint = toolState.drawingPolygon.vertices[0];
        if (
          isWithinThreshold(
            worldPos,
            firstPoint,
            CLOSE_POLYGON_THRESHOLD / state.zoom,
          )
        ) {
          return this.finalizeDrawingOrRestore();
        }
      }

      // When editing an existing polygon, keep inserting from the active
      // start side so the preview direction remains consistent.
      const newVertices = toolState.editingPolygon
        ? [worldPos, ...toolState.drawingPolygon.vertices]
        : [...toolState.drawingPolygon.vertices, worldPos];
      setToolState({
        drawingPolygon: { ...toolState.drawingPolygon, vertices: newVertices },
        editPivot: worldPos,
      });
      return true;
    }

    // If we're not drawing a polygon, check if we clicked near an existing polygon vertex first
    const vertexResult = findPolygonVertexForEditing(
      worldPos,
      state.polygons,
      selectionThresholds.vertex,
      state.zoom,
    );
    if (vertexResult) {
      // Start editing this polygon from the clicked vertex (without adding a new point)
      this.startEditingFromVertex(state, vertexResult);
      return true;
    }

    // If not near a vertex, check if we clicked near a polygon line
    if (checkModifierKey(event)) {
      const lineResult = findPolygonLineForEditing(
        worldPos,
        state.polygons,
        selectionThresholds.polygonEdge,
        state.zoom,
      );
      if (lineResult) {
        // Start editing this polygon from the closest existing edge vertex.
        this.startEditingFromLine(state, lineResult);
        return true;
      }
    }

    // Start a new polygon
    const newVertices = [worldPos];
    setToolState({
      drawingPolygon: {
        vertices: newVertices,
        grass: toolState.variant === "grass",
      },
      editPivot: worldPos,
    });
    return true;
  }

  onKeyDown(event: KeyboardEvent, _context: EventContext): boolean {
    const { toolState, setToolState } = this.getState();
    if (!toolState) return false;

    if (event.key === "Escape") {
      const isDrawing = toolState.drawingPolygon.vertices.length > 0;
      const isEditing = !!toolState.editingPolygon;

      if (!isDrawing && !isEditing) {
        // Let the editor-level Escape shortcut switch to the default/select tool.
        return false;
      }

      return this.finalizeDrawingOrRestore();
    }

    if (event.key === "Enter") {
      return this.finalizeDrawingOrRestore();
    }

    if (event.key === " " || event.key === "Space") {
      // Reverse around the current edit pivot without changing the open-chain
      // behavior used by polygon editing.
      const nextToolState = getToggledVertexToolState(toolState);
      if (nextToolState) {
        setToolState(nextToolState);
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
      selectionThresholds.polygonEdge / state.zoom,
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

  getCursor(_context: EventContext): string {
    return "crosshair";
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
    ctx.strokeStyle = isGrass ? colors.grass : uiColors.vertexDraftLine;
    ctx.lineWidth = uiStrokeWidths.boundsSelectedScreen / state.zoom;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

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

    // Draw vertex handles (square, matching selection handle styling)
    toolState.drawingPolygon.vertices.forEach((vertex) => {
      const size = uiSelectionHandle.halfWidthPx / state.zoom;
      const side = size * 2;
      ctx.fillStyle = uiColors.vertexDraftPointFill;
      ctx.fillRect(vertex.x - size, vertex.y - size, side, side);
      ctx.strokeStyle = uiColors.vertexDraftPointStroke;
      ctx.lineWidth = uiStrokeWidths.boundsIdleScreen / state.zoom;
      ctx.strokeRect(vertex.x - size, vertex.y - size, side, side);
    });
  }

  onRenderOverlay(ctx: CanvasRenderingContext2D): void {
    const { state, toolState } = this.getState();
    if (!toolState || toolState.drawingPolygon.vertices.length === 0) return;

    const isEditingExistingPolygon = !!toolState.editingPolygon;
    const startPoint = toolState.drawingPolygon.vertices[0];
    const lastPoint =
      toolState.drawingPolygon.vertices[
        toolState.drawingPolygon.vertices.length - 1
      ];

    // Convert world coordinates to screen coordinates
    const startScreen = worldToScreen(
      startPoint,
      state.viewPortOffset,
      state.zoom,
    );
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

    // For polygon edits, the solid preview should grow from the pivot/start
    // vertex and the dashed preview should point toward the opposite endpoint
    // of the open edge. New polygon drawing keeps the original behavior.
    const isGrass = toolState.drawingPolygon.grass;
    ctx.strokeStyle = isGrass ? colors.grass : uiColors.vertexDraftLine;
    ctx.lineWidth = uiStrokeWidths.boundsSelectedScreen;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(
      isEditingExistingPolygon ? startScreen.x : lastScreen.x,
      isEditingExistingPolygon ? startScreen.y : lastScreen.y,
    );
    ctx.lineTo(mouseScreen.x, mouseScreen.y);
    ctx.stroke();

    // Draw potential closing line from first point to mouse cursor when we have 3+ vertices (dashed)
    if (toolState.drawingPolygon.vertices.length >= 3) {
      ctx.strokeStyle = uiColors.vertexDraftClosingLine;
      ctx.lineWidth = uiStrokeWidths.boundsSelectedScreen;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(
        isEditingExistingPolygon ? lastScreen.x : startScreen.x,
        isEditingExistingPolygon ? lastScreen.y : startScreen.y,
      );
      ctx.lineTo(mouseScreen.x, mouseScreen.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  private addPolygon(polygon: Polygon): void {
    const { state } = this.getState();
    state.actions.setPolygons([...state.polygons, polygon]);
  }

  private replacePolygon(previousPolygon: Polygon, nextPolygon: Polygon): void {
    const { state } = this.getState();
    const polygonIndex = state.polygons.indexOf(previousPolygon);
    if (polygonIndex === -1) return;

    state.actions.setPolygons(
      state.polygons.map((polygon, index) =>
        index === polygonIndex ? nextPolygon : polygon,
      ),
    );
  }

  private finalizeDrawingOrRestore(): boolean {
    const { toolState } = this.getState();
    if (!toolState) return false;

    if (toolState.drawingPolygon.vertices.length >= 3) {
      const finalizedPolygon = {
        vertices: [...toolState.drawingPolygon.vertices],
        grass: toolState.drawingPolygon.grass,
      };
      this.runHistoryBatch(() => {
        if (toolState.editingPolygon) {
          this.replacePolygon(toolState.editingPolygon, finalizedPolygon);
        } else {
          this.addPolygon(finalizedPolygon);
        }
        this.clear();
      });
      return true;
    }

    if (toolState.drawingPolygon.vertices.length > 0) {
      this.clear();
      return true;
    }

    return false;
  }

  private startEditingFromVertex(
    _state: EditorState,
    vertexResult: {
      polygon: Polygon;
      vertexIndex: number;
      vertex: Position;
    },
  ): void {
    const { setToolState } = this.getState();
    const { polygon, vertexIndex } = vertexResult;

    const editingPolygon = polygon;

    // Always start vertex editing in the same canvas direction regardless of
    // the stored polygon winding. Clockwise polygons move to the next vertex;
    // counterclockwise polygons move to the previous vertex.
    const vertices = polygon.vertices;
    const drawingVertices = this.buildEditingVertices(
      vertices,
      vertexIndex,
      isPolygonClockwise(vertices) ? "previous" : "next",
    );

    // Set this as the current drawing polygon and store the original
    setToolState({
      drawingPolygon: {
        vertices: drawingVertices,
        grass: editingPolygon.grass,
      },
      editingPolygon: editingPolygon,
      editPivot: vertices[vertexIndex],
      variant: editingPolygon.grass ? "grass" : "default",
    });
  }

  private startEditingFromLine(
    _state: EditorState,
    lineResult: {
      polygon: Polygon;
      pivotVertexIndex: number;
      side: "next" | "previous";
    },
  ): void {
    const { setToolState } = this.getState();
    const { polygon, pivotVertexIndex, side } = lineResult;

    const editingPolygon = polygon;

    // Start from the closest endpoint and follow the side of that endpoint
    // that belongs to the clicked edge.
    const vertices = polygon.vertices;
    const drawingVertices = this.buildEditingVertices(
      vertices,
      pivotVertexIndex,
      side,
    );

    // Set this as the current drawing polygon and store the original
    setToolState({
      drawingPolygon: {
        vertices: drawingVertices,
        grass: editingPolygon.grass,
      },
      editingPolygon: editingPolygon,
      editPivot: vertices[pivotVertexIndex],
      variant: editingPolygon.grass ? "grass" : "default",
    });
  }

  private buildEditingVertices(
    vertices: Position[],
    pivotVertexIndex: number,
    side: "next" | "previous",
  ): Position[] {
    const result = [vertices[pivotVertexIndex]];
    const totalVertices = vertices.length;

    for (let offset = 1; offset < totalVertices; offset++) {
      const index =
        side === "next"
          ? (pivotVertexIndex + offset) % totalVertices
          : (pivotVertexIndex - offset + totalVertices) % totalVertices;
      result.push(vertices[index]);
    }

    return result;
  }

  private getHistorySnapshot(): PartialEditorState {
    const { state } = this.getState();
    return {
      levelName: state.levelName,
      ground: state.ground,
      sky: state.sky,
      polygons: state.polygons,
      apples: state.apples,
      killers: state.killers,
      flowers: state.flowers,
      start: state.start,
      pictures: state.pictures,
    };
  }

  private runHistoryBatch(mutate: () => void) {
    const historyStart = this.getHistorySnapshot();
    this.store.temporal.getState().pause();

    try {
      mutate();
    } finally {
      this.store.temporal.getState().resume();
    }

    const historyEnd = this.getHistorySnapshot();
    if (fastDeepEqual(historyStart, historyEnd)) return;

    const temporalState = this.store.temporal.getState() as {
      _handleSet?: (
        pastState: PartialEditorState,
        replace: undefined,
        currentState: PartialEditorState,
        deltaState?: Partial<PartialEditorState> | null,
      ) => void;
    };

    temporalState._handleSet?.(historyStart, undefined, historyEnd);
  }
}
