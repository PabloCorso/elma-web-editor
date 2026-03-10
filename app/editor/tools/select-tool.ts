import { Tool } from "./tool-interface";
import type { EventContext } from "../helpers/event-handler";
import {
  findVertexNearPosition,
  findObjectNearPosition,
  findPolygonEdgeNearPosition,
  isVertexSelected,
  isObjectSelected,
  getAllObjects,
  isPointInRect,
  getSelectionBounds,
} from "../helpers/selection-helpers";
import {
  colors,
  OBJECT_DIAMETER,
  uiColors,
  uiStrokeWidths,
} from "../constants";
import type { Apple, Polygon, Position } from "../elma-types";
import type { EditorStore, PartialEditorState } from "../editor-store";
import { defaultTools } from "./default-tools";
import { worldToScreen } from "../helpers/coordinate-helpers";
import { checkModifierKey } from "~/utils/misc";
import {
  getKuskiSelectionCircles,
  isPointInKuskiSelectionBounds,
} from "../draw-kuski";

const SELECT_OBJECT_THRESHOLD = 15;
const SELECT_VERTEX_THRESHOLD = 10;
export const SELECT_POLYGON_EDGE_THRESHOLD = 8;

export type SelectToolState = {
  selectedVertices: Array<{ polygon: Polygon; vertex: Position }>;
  selectedObjects: Position[];
  selectedPictures: Position[];
  hoveredObject?: Position;
  hoveredPictureBounds?: {
    position: Position;
    width: number;
    height: number;
  };
  contextMenuType?: "apple" | "killer" | "flower" | "picture";
};

type VertexSelection = { polygon: Polygon; vertex: Position };
type ObjectSelection = Position;

export class SelectTool extends Tool<SelectToolState> {
  readonly meta = defaultTools.select;

  constructor(store: EditorStore) {
    super(store);
  }

  private isDragging = false;
  private dragStartPos = { x: 0, y: 0 };
  private dragOriginPositions: Position[] = [];
  private isMarqueeSelecting = false;
  private marqueeStartPos = { x: 0, y: 0 };
  private marqueeEndPos = { x: 0, y: 0 };
  private dragHistoryStart: PartialEditorState | null = null;
  private dragHasChanges = false;
  private isHistoryPaused = false;

  onDeactivate(): void {
    this.clear();
  }

  clear(): void {
    const { setToolState } = this.getState();
    setToolState({
      selectedVertices: [],
      selectedObjects: [],
      selectedPictures: [],
      hoveredObject: undefined,
      hoveredPictureBounds: undefined,
      contextMenuType: undefined,
    });
    this.isDragging = false;
    this.isMarqueeSelecting = false;
    this.dragOriginPositions = [];
    this.endDragHistoryBatch(false);
  }

  onRightClick(_event: MouseEvent, context: EventContext) {
    const { state, setToolState } = this.getState();
    this.pruneHiddenSelection();

    const object = this.isObjectSelectable()
      ? this.findObjectNearPosition(context.worldPos)
      : null;
    const isApple = object
      ? state.apples.some((a) => a.position === object)
      : false;
    if (object && isApple) {
      this.clear();
      this.selectObject(object);
      setToolState({ contextMenuType: "apple" });
      return true;
    }

    const polygon = this.isPolygonSelectable()
      ? findPolygonEdgeNearPosition(
          context.worldPos,
          state.polygons,
          SELECT_POLYGON_EDGE_THRESHOLD / state.zoom,
          this.isSelectablePolygonEdge,
        )
      : null;
    if (polygon) {
      this.updatePolygon(state.polygons.indexOf(polygon), {
        ...polygon,
        grass: !polygon.grass,
      });
      return true;
    }

    return false;
  }

  onPointerDown(event: PointerEvent, context: EventContext): boolean {
    this.pruneHiddenSelection();
    const { state, toolState } = this.getState();
    const hoveredObject = toolState?.hoveredObject;
    const hoveredPicture = toolState?.hoveredPictureBounds?.position;

    const modifier = checkModifierKey(event);
    const isSingleSelect = !modifier;

    const hasSelectedItems =
      toolState &&
      (toolState.selectedVertices.length > 0 ||
        toolState.selectedObjects.length > 0 ||
        toolState.selectedPictures.length > 0);
    if (isSingleSelect && !hasSelectedItems) {
      this.clear();
    }

    const clearIfNewSingleSelect = (isSelected: boolean | undefined) => {
      if (isSingleSelect && !isSelected) {
        this.clear();
      }
    };

    const vertex = this.isPolygonSelectable()
      ? findVertexNearPosition(
          context.worldPos,
          state.polygons,
          SELECT_VERTEX_THRESHOLD / state.zoom,
        )
      : null;
    if (vertex) {
      const isSelected = isVertexSelected(
        { polygon: vertex.polygon, vertex: vertex.vertex },
        toolState?.selectedVertices ?? [],
      );

      clearIfNewSingleSelect(isSelected);
      this.selectVertex(vertex.polygon, vertex.vertex);
      this.startDragging(context.worldPos);
      return true;
    }

    const polygonEdge = this.isPolygonSelectable()
      ? findPolygonEdgeNearPosition(
          context.worldPos,
          state.polygons,
          SELECT_POLYGON_EDGE_THRESHOLD / state.zoom,
          this.isSelectablePolygonEdge,
        )
      : null;
    if (polygonEdge) {
      const polygonSelectionCount = toolState
        ? toolState.selectedVertices.filter(
            (sv: VertexSelection) => sv.polygon === polygonEdge,
          ).length
        : 0;
      const isSelected =
        polygonSelectionCount === polygonEdge.vertices.length &&
        polygonSelectionCount > 0;
      clearIfNewSingleSelect(isSelected);
      this.selectPolygon(polygonEdge);
      this.startDragging(context.worldPos);
      return true;
    }

    if (hoveredObject) {
      const isSelected = isObjectSelected(
        hoveredObject,
        toolState?.selectedObjects ?? [],
      );
      clearIfNewSingleSelect(isSelected);
      this.selectObject(hoveredObject);
      this.startDragging(context.worldPos);
      return true;
    }

    if (hoveredPicture) {
      const isSelected = toolState?.selectedPictures.includes(hoveredPicture);
      clearIfNewSingleSelect(isSelected);
      this.selectPicture(hoveredPicture);
      this.startDragging(context.worldPos);
      return true;
    }

    const selectablePictures = state.pictures.filter((picture) =>
      this.isPictureSelectable(picture),
    );
    const picture = findObjectNearPosition(
      context.worldPos,
      selectablePictures.map((p) => p.position),
      SELECT_OBJECT_THRESHOLD / state.zoom,
    );
    if (picture) {
      const isSelected = toolState?.selectedPictures.includes(picture);
      clearIfNewSingleSelect(isSelected);
      this.selectPicture(picture);
      this.startDragging(context.worldPos);
      return true;
    }

    const object = this.isObjectSelectable()
      ? this.findObjectNearPosition(context.worldPos)
      : null;
    if (object) {
      const isSelected = isObjectSelected(
        object,
        toolState?.selectedObjects ?? [],
      );
      clearIfNewSingleSelect(isSelected);
      this.selectObject(object);
      this.startDragging(context.worldPos);
      return true;
    }

    this.startMarqueeSelection(context.worldPos, modifier);
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
      this.endDragHistoryBatch(true);
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
    this.pruneHiddenSelection();

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
    this.pruneHiddenSelection();
    const { state, toolState } = this.getState();
    if (!toolState) return;

    if (!this.isMarqueeSelecting && state.mouseOnCanvas) {
      const { hoveredObject, hoveredPictureBounds } = toolState;
      const isHoveredPictureSelected =
        hoveredPictureBounds &&
        toolState.selectedPictures.includes(hoveredPictureBounds.position);
      if (hoveredPictureBounds && !isHoveredPictureSelected) {
        const topLeft = worldToScreen(
          hoveredPictureBounds.position,
          state.viewPortOffset,
          state.zoom,
        );
        ctx.strokeStyle = uiColors.selectionHandleFill;
        ctx.lineWidth = uiStrokeWidths.boundsIdleScreen;
        ctx.strokeRect(
          topLeft.x,
          topLeft.y,
          hoveredPictureBounds.width * state.zoom,
          hoveredPictureBounds.height * state.zoom,
        );
      }

      if (hoveredObject && !toolState.selectedObjects.includes(hoveredObject)) {
        ctx.strokeStyle = uiColors.selectionHandleFill;
        ctx.lineWidth = uiStrokeWidths.boundsIdleScreen;
        if (hoveredObject === state.start) {
          const circles = getKuskiSelectionCircles({ start: state.start });
          circles.forEach((circle) => {
            const center = worldToScreen(
              { x: circle.x, y: circle.y },
              state.viewPortOffset,
              state.zoom,
            );
            ctx.beginPath();
            ctx.arc(
              center.x,
              center.y,
              circle.radius * state.zoom,
              0,
              Math.PI * 2,
            );
            ctx.stroke();
          });
        } else {
          const center = worldToScreen(
            hoveredObject,
            state.viewPortOffset,
            state.zoom,
          );
          ctx.beginPath();
          ctx.arc(
            center.x,
            center.y,
            (OBJECT_DIAMETER / 2) * state.zoom,
            0,
            Math.PI * 2,
          );
          ctx.stroke();
        }
      }

      if (!this.isDragging && this.isPolygonSelectable()) {
        const hoveredVertex = findVertexNearPosition(
          state.mousePosition,
          state.polygons,
          SELECT_VERTEX_THRESHOLD / state.zoom,
        );
        if (hoveredVertex) {
          const hoveredVertexScreenPos = worldToScreen(
            hoveredVertex.vertex,
            state.viewPortOffset,
            state.zoom,
          );
          drawSelectHandle(ctx, hoveredVertexScreenPos);
        }

        const hoveredPolygon = findPolygonEdgeNearPosition(
          state.mousePosition,
          state.polygons,
          SELECT_POLYGON_EDGE_THRESHOLD / state.zoom,
          this.isSelectablePolygonEdge,
        );
        if (!hoveredVertex && hoveredPolygon) {
          const polygonSelectionCount = toolState.selectedVertices.filter(
            (sv) => sv.polygon === hoveredPolygon,
          ).length;
          const isHoveredPolygonSelected =
            polygonSelectionCount === hoveredPolygon.vertices.length &&
            polygonSelectionCount > 0;
          if (!isHoveredPolygonSelected) {
            const first = worldToScreen(
              hoveredPolygon.vertices[0],
              state.viewPortOffset,
              state.zoom,
            );
            ctx.beginPath();
            ctx.moveTo(first.x, first.y);
            for (let i = 1; i < hoveredPolygon.vertices.length; i++) {
              const point = worldToScreen(
                hoveredPolygon.vertices[i],
                state.viewPortOffset,
                state.zoom,
              );
              ctx.lineTo(point.x, point.y);
            }
            ctx.closePath();
            ctx.strokeStyle = uiColors.selectionHandleFill;
            ctx.lineWidth = uiStrokeWidths.boundsIdleScreen;
            ctx.stroke();
          }
        }
      }
    }

    const selectedPolygons = Array.from(
      new Set(toolState.selectedVertices.map(({ polygon }) => polygon)),
    );
    selectedPolygons.forEach((polygon) => {
      if (polygon.vertices.length < 2) return;

      const first = worldToScreen(
        polygon.vertices[0],
        state.viewPortOffset,
        state.zoom,
      );

      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < polygon.vertices.length; i++) {
        const point = worldToScreen(
          polygon.vertices[i],
          state.viewPortOffset,
          state.zoom,
        );
        ctx.lineTo(point.x, point.y);
      }
      ctx.closePath();
      ctx.strokeStyle = polygon.grass ? colors.grass : uiColors.marqueeStroke;
      ctx.lineWidth = uiStrokeWidths.boundsSelectedScreen;
      ctx.stroke();
    });

    // Draw selection handles in screen coordinates
    const { selectedVertices, selectedObjects, selectedPictures } = toolState;
    const allSelected = [
      ...selectedVertices.map(({ vertex }) => vertex),
      ...selectedObjects,
      ...selectedPictures,
    ];
    allSelected.forEach((pos: Position) => {
      const position = worldToScreen(pos, state.viewPortOffset, state.zoom);
      drawSelectHandle(ctx, position);
    });

    // Draw marquee selection in screen coordinates
    if (this.isMarqueeSelecting) {
      drawSelectMarquee({
        ctx,
        start: this.marqueeStartPos,
        end: this.marqueeEndPos,
        zoom: state.zoom,
        viewPortOffset: state.viewPortOffset,
      });
    }
  }

  private findObjectNearPosition(position: Position): Position | null {
    const { state } = this.getState();

    const apple = findObjectNearPosition(
      position,
      state.apples.map((a) => a.position),
      SELECT_OBJECT_THRESHOLD / state.zoom,
    );
    if (apple) return apple;

    const killer = findObjectNearPosition(
      position,
      state.killers,
      SELECT_OBJECT_THRESHOLD / state.zoom,
    );
    if (killer) return killer;

    const flower = findObjectNearPosition(
      position,
      state.flowers,
      SELECT_OBJECT_THRESHOLD / state.zoom,
    );
    if (flower) return flower;

    const start = isPointInKuskiSelectionBounds({
      point: position,
      start: state.start,
    });
    if (start) return state.start;

    return null;
  }

  private isSelectablePolygonEdge = (polygon: Polygon, edgeIndex: number) => {
    const { toolState } = this.getState();
    const polygonSelectionCount =
      toolState?.selectedVertices.filter((sv) => sv.polygon === polygon)
        .length ?? 0;
    const isPolygonFullySelected =
      polygonSelectionCount === polygon.vertices.length &&
      polygonSelectionCount > 0;
    if (isPolygonFullySelected) return true;

    if (!polygon.grass) return true;
    const n = polygon.vertices.length;
    if (n < 2) return false;

    let longestEdgeIndex = -1;
    let longestEdgeLength = -1;
    for (let i = 0; i < n; i++) {
      const from = polygon.vertices[i];
      const to = polygon.vertices[(i + 1) % n];
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      if (length > longestEdgeLength) {
        longestEdgeLength = length;
        longestEdgeIndex = i;
      }
    }

    return edgeIndex !== longestEdgeIndex;
  };

  private startDragging(worldPos: Position): void {
    const { toolState } = this.getState();
    if (!toolState) return;

    this.isDragging = true;
    this.dragStartPos = worldPos;
    this.dragHasChanges = false;
    this.beginDragHistoryBatch();

    // Store original positions of selected items for delta calculations
    this.dragOriginPositions = [
      ...toolState.selectedVertices.map((sv: VertexSelection) => ({
        ...sv.vertex,
      })),
      ...toolState.selectedObjects.map((obj: ObjectSelection) => ({ ...obj })),
      ...toolState.selectedPictures.map((pic: Position) => ({ ...pic })),
    ];
  }

  private startMarqueeSelection(worldPos: Position, modifier: boolean): void {
    if (!modifier) {
      this.clear();
    }
    this.isMarqueeSelecting = true;
    this.marqueeStartPos = worldPos;
    this.marqueeEndPos = worldPos;
  }

  private handleDragging(worldPos: Position): void {
    const { toolState } = this.getState();
    if (!toolState) return;

    const totalDeltaX = worldPos.x - this.dragStartPos.x;
    const totalDeltaY = worldPos.y - this.dragStartPos.y;
    if (totalDeltaX === 0 && totalDeltaY === 0) return;
    this.dragHasChanges = true;

    if (toolState.selectedVertices.length > 0) {
      const newVertexPositions = toolState.selectedVertices.map(
        (_vertexSelection: VertexSelection, index: number) => {
          const originalPos = this.dragOriginPositions[index];
          return {
            x: originalPos.x + totalDeltaX,
            y: originalPos.y + totalDeltaY,
          };
        },
      );
      this.updateSelectedVertices(newVertexPositions);
    }

    if (toolState.selectedObjects.length > 0) {
      const vertexCount = toolState.selectedVertices.length;
      const newObjectPositions = toolState.selectedObjects.map(
        (_object: ObjectSelection, index: number) => {
          const originPos = this.dragOriginPositions[vertexCount + index];
          return {
            x: originPos.x + totalDeltaX,
            y: originPos.y + totalDeltaY,
          };
        },
      );
      this.updateSelectedObjects(newObjectPositions);
    }

    if (toolState.selectedPictures.length > 0) {
      const vertexCount = toolState.selectedVertices.length;
      const objectCount = toolState.selectedObjects.length;
      const newPicturePositions = toolState.selectedPictures.map(
        (_picture: Position, index: number) => {
          const originPos =
            this.dragOriginPositions[vertexCount + objectCount + index];
          return {
            x: originPos.x + totalDeltaX,
            y: originPos.y + totalDeltaY,
          };
        },
      );
      this.updateSelectedPictures(newPicturePositions);
    }
  }

  private finalizeMarqueeSelection(): void {
    const { state, toolState } = this.getState();
    if (!toolState) return;

    const bounds = getSelectionBounds(this.marqueeStartPos, this.marqueeEndPos);

    // Select vertices within the marquee
    if (this.isPolygonSelectable()) {
      state.polygons.forEach((polygon: Polygon) => {
        polygon.vertices.forEach((vertex: Position) => {
          if (isPointInRect(vertex, bounds)) {
            const isSelected = toolState.selectedVertices.some(
              (sv: VertexSelection) =>
                sv.polygon === polygon && sv.vertex === vertex,
            );
            if (!isSelected) {
              this.selectVertex(polygon, vertex);
            }
          }
        });
      });
    }

    // Select objects within the marquee
    if (this.isObjectSelectable()) {
      const allObjects = getAllObjects(
        state.apples.map((a) => a.position),
        state.killers,
        state.flowers,
        state.start,
      );
      allObjects.forEach(({ obj }: { obj: Position }) => {
        if (isPointInRect(obj, bounds)) {
          this.selectObject(obj);
        }
      });
    }

    // Select pictures within the marquee
    state.pictures
      .filter((picture) => this.isPictureSelectable(picture))
      .forEach((picture) => {
        if (isPointInRect(picture.position, bounds)) {
          const isSelected = toolState.selectedPictures.includes(
            picture.position,
          );
          if (!isSelected) {
            this.selectPicture(picture.position);
          }
        }
      });
  }

  private isPolygonSelectable(): boolean {
    const { state } = this.getState();
    const { showPolygons, showPolygonBounds, showPolygonHandles } =
      state.levelVisibility;
    return showPolygons || showPolygonBounds || showPolygonHandles;
  }

  private isObjectSelectable(): boolean {
    const { state } = this.getState();
    const { showObjects, showObjectBounds } = state.levelVisibility;
    return showObjects || showObjectBounds;
  }

  private isPictureSelectable(picture: {
    texture?: string;
    mask?: string;
  }): boolean {
    const { state } = this.getState();
    const { showPictureBounds, showTextureBounds, showPictures, showTextures } =
      state.levelVisibility;
    const hasTexture = Boolean(picture.texture && picture.mask);
    return hasTexture
      ? showTextures || showTextureBounds
      : showPictures || showPictureBounds;
  }

  private isObjectPresent(object: Position): boolean {
    const { state } = this.getState();
    return (
      state.start === object ||
      state.killers.includes(object) ||
      state.flowers.includes(object) ||
      state.apples.some((apple) => apple.position === object)
    );
  }

  private pruneHiddenSelection(): void {
    const { state, toolState, setToolState } = this.getState();
    if (!toolState) return;

    const selectedVertices = this.isPolygonSelectable()
      ? toolState.selectedVertices
          .map((selection) => {
            const polygon = state.polygons.find((p) =>
              p.vertices.some(
                (vertex) =>
                  vertex.x === selection.vertex.x &&
                  vertex.y === selection.vertex.y,
              ),
            );
            if (!polygon) return null;
            const vertex = polygon.vertices.find(
              (candidate) =>
                candidate.x === selection.vertex.x &&
                candidate.y === selection.vertex.y,
            );
            if (!vertex) return null;
            return { polygon, vertex };
          })
          .filter((selection): selection is VertexSelection =>
            Boolean(selection),
          )
      : [];

    const selectedObjects = this.isObjectSelectable()
      ? toolState.selectedObjects
          .map((selectedObject) => {
            const identityMatch = this.findObjectByIdentity(selectedObject);
            if (identityMatch) return identityMatch;
            return this.findObjectByCoordinates(selectedObject);
          })
          .filter((object): object is Position => Boolean(object))
      : [];

    const selectedPictures = toolState.selectedPictures
      .map((position) => {
        const picture = state.pictures.find(
          (entry) =>
            entry.position.x === position.x && entry.position.y === position.y,
        );
        return picture && this.isPictureSelectable(picture)
          ? picture.position
          : null;
      })
      .filter((position): position is Position => Boolean(position));

    if (
      selectedVertices.length !== toolState.selectedVertices.length ||
      selectedObjects.length !== toolState.selectedObjects.length ||
      selectedPictures.length !== toolState.selectedPictures.length ||
      selectedVertices.some((selection, index) => {
        const previous = toolState.selectedVertices[index];
        return (
          previous?.polygon !== selection.polygon ||
          previous?.vertex !== selection.vertex
        );
      }) ||
      selectedObjects.some(
        (object, index) => object !== toolState.selectedObjects[index],
      ) ||
      selectedPictures.some(
        (position, index) => position !== toolState.selectedPictures[index],
      )
    ) {
      setToolState({ selectedVertices, selectedObjects, selectedPictures });
    }
  }

  private selectVertex(polygon: Polygon, vertex: Position): void {
    const { toolState, setToolState } = this.getState();
    if (!toolState) return;

    const isSelected = isVertexSelected(
      { polygon, vertex },
      toolState.selectedVertices,
    );
    if (isSelected) return;

    setToolState({
      selectedVertices: [...toolState.selectedVertices, { polygon, vertex }],
    });
  }

  private selectObject(object: ObjectSelection): void {
    const { toolState, setToolState } = this.getState();
    if (!toolState) return;

    const isSelected = isObjectSelected(object, toolState.selectedObjects);
    if (isSelected) return;

    setToolState({ selectedObjects: [...toolState.selectedObjects, object] });
  }

  private selectPicture(picture: Position): void {
    const { toolState, setToolState } = this.getState();
    if (!toolState) return;

    if (isObjectSelected(picture, toolState.selectedPictures)) return;

    setToolState({
      selectedPictures: [...toolState.selectedPictures, picture],
    });
  }

  private findObjectByIdentity(selectedObject: Position): Position | null {
    const { state } = this.getState();
    if (state.start === selectedObject) return state.start;
    if (state.apples.some((apple) => apple.position === selectedObject)) {
      return selectedObject;
    }
    if (state.killers.includes(selectedObject)) return selectedObject;
    if (state.flowers.includes(selectedObject)) return selectedObject;
    return null;
  }

  private findObjectByCoordinates(selectedObject: Position): Position | null {
    const { state } = this.getState();
    const matchByCoords = (object: Position) =>
      object.x === selectedObject.x && object.y === selectedObject.y;

    const apple = state.apples.find((entry) => matchByCoords(entry.position));
    if (apple) return apple.position;

    const killer = state.killers.find(matchByCoords);
    if (killer) return killer;

    const flower = state.flowers.find(matchByCoords);
    if (flower) return flower;

    if (matchByCoords(state.start)) return state.start;
    return null;
  }

  private selectPolygon(polygon: Polygon): void {
    const { toolState, setToolState } = this.getState();
    if (!toolState) return;

    // Filter out vertices that are already selected
    const existingSelectedVertices = toolState.selectedVertices.filter(
      (sv: VertexSelection) => sv.polygon !== polygon,
    );

    const polygonVertices = polygon.vertices.map((vertex) => ({
      polygon,
      vertex,
    }));
    setToolState({
      selectedVertices: [...existingSelectedVertices, ...polygonVertices],
    });
  }

  private updateSelectedVertices(newPositions: Position[]): void {
    const { state, toolState, setToolState } = this.getState();
    if (!toolState) return;

    const updatedPolygons = state.polygons.map((polygon) => {
      let hasChanges = false;
      const newVertices = polygon.vertices.map((vertex) => {
        const selectionIndex = toolState.selectedVertices.findIndex(
          (selection: VertexSelection) =>
            selection.polygon === polygon && selection.vertex === vertex,
        );
        if (selectionIndex !== -1) {
          hasChanges = true;
          return newPositions[selectionIndex];
        }
        return vertex;
      });

      // Only create a new polygon object if vertices changed
      return hasChanges ? { ...polygon, vertices: newVertices } : polygon;
    });

    const updatedSelectedVertices = toolState.selectedVertices.map(
      (selection: VertexSelection, index) => ({
        polygon: updatedPolygons[state.polygons.indexOf(selection.polygon)],
        vertex: newPositions[index],
      }),
    );

    setToolState({ selectedVertices: updatedSelectedVertices });

    // Update polygons in store
    state.actions.setPolygons(updatedPolygons);
  }

  private updateSelectedObjects(newPositions: Position[]): void {
    const { state, toolState, setToolState } = this.getState();
    if (!toolState) return;

    let nextApples: Apple[] | undefined;
    let nextKillers: Position[] | undefined;
    let nextFlowers: Position[] | undefined;
    let nextStart: Position | undefined;
    const updatedSelectedObjects = [...toolState.selectedObjects];

    // Update each selected object with its new position
    toolState.selectedObjects.forEach((object: ObjectSelection, index) => {
      const newPos = newPositions[index];

      // Find and update the object in the appropriate array
      const appleIndex = state.apples.findIndex((a) => a.position === object);
      if (appleIndex !== -1) {
        if (!nextApples) nextApples = [...state.apples];
        const apple = state.apples[appleIndex];
        nextApples[appleIndex] = {
          position: newPos,
          animation: apple.animation,
          gravity: apple.gravity,
        };
        updatedSelectedObjects[index] = newPos;
      }

      const killerIndex = state.killers.findIndex((k) => k === object);
      if (killerIndex !== -1) {
        if (!nextKillers) nextKillers = [...state.killers];
        nextKillers[killerIndex] = newPos;
        updatedSelectedObjects[index] = newPos;
      }

      const flowerIndex = state.flowers.findIndex((f) => f === object);
      if (flowerIndex !== -1) {
        if (!nextFlowers) nextFlowers = [...state.flowers];
        nextFlowers[flowerIndex] = newPos;
        updatedSelectedObjects[index] = newPos;
      }

      // Check if it's the start position
      if (object === state.start) {
        nextStart = newPos;
        updatedSelectedObjects[index] = newPos;
      }
    });

    if (nextApples) state.actions.setApples(nextApples);
    if (nextKillers) state.actions.setKillers(nextKillers);
    if (nextFlowers) state.actions.setFlowers(nextFlowers);
    if (nextStart) state.actions.setStart(nextStart);

    setToolState({ selectedObjects: updatedSelectedObjects });
  }

  private updateSelectedPictures(newPositions: Position[]): void {
    const { state, toolState, setToolState } = this.getState();
    if (!toolState) return;

    const updatedPictures = [...state.pictures];
    const updatedSelectedPictures: Position[] = [];
    const handledPictureIndexes = new Set<number>();

    // Update each selected picture with its new position
    toolState.selectedPictures.forEach((picture: Position, index) => {
      const pictureIndex = updatedPictures.findIndex(
        (p) => p.position === picture,
      );
      if (pictureIndex === -1 || handledPictureIndexes.has(pictureIndex))
        return;

      const newPos = newPositions[index];
      updatedPictures[pictureIndex] = {
        ...updatedPictures[pictureIndex],
        position: newPos,
      };
      handledPictureIndexes.add(pictureIndex);
      updatedSelectedPictures.push(newPos);
    });

    // Update pictures in store
    state.actions.setPictures(updatedPictures);

    setToolState({ selectedPictures: updatedSelectedPictures });
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

  private beginDragHistoryBatch() {
    if (this.isHistoryPaused) return;
    this.dragHistoryStart = this.getHistorySnapshot();
    this.store.temporal.getState().pause();
    this.isHistoryPaused = true;
  }

  private endDragHistoryBatch(commit: boolean) {
    if (!this.isHistoryPaused) return;
    this.store.temporal.getState().resume();
    this.isHistoryPaused = false;

    if (!commit || !this.dragHasChanges || !this.dragHistoryStart) {
      this.dragHistoryStart = null;
      this.dragHasChanges = false;
      return;
    }

    const temporalState = this.store.temporal.getState() as {
      _handleSet?: (
        pastState: PartialEditorState,
        replace: undefined,
        currentState: PartialEditorState,
        deltaState?: Partial<PartialEditorState> | null,
      ) => void;
    };
    temporalState._handleSet?.(
      this.dragHistoryStart,
      undefined,
      this.getHistorySnapshot(),
    );
    this.dragHistoryStart = null;
    this.dragHasChanges = false;
  }

  private updatePolygon(index: number, polygon: Polygon): void {
    const { state } = this.getState();
    state.actions.setPolygons(
      state.polygons.map((p, i) => (i === index ? polygon : p)),
    );
  }

  private removePolygon(index: number): void {
    const { state } = this.getState();
    state.actions.setPolygons(state.polygons.filter((_, i) => i !== index));
  }

  private deleteSelection(): void {
    const { state, toolState } = this.getState();
    if (!toolState) return;

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
      },
    );

    // Delete vertices from each polygon
    const sortedPolygonIndices = Array.from(verticesByPolygonIndex.keys()).sort(
      (a, b) => b - a,
    );
    sortedPolygonIndices.forEach((polygonIndex) => {
      const polygon = state.polygons[polygonIndex];
      const verticesToDelete = verticesByPolygonIndex.get(polygonIndex)!;

      if (polygon) {
        const updatedVertices = polygon.vertices.filter(
          (vertex: Position) => !verticesToDelete.includes(vertex),
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

    // Delete selected pictures
    toolState.selectedPictures.forEach((picturePos: Position) => {
      const picture = state.pictures.find((p) => p.position === picturePos);
      if (picture) {
        state.actions.removePicture(picture);
      }
    });

    this.clear();
  }
}

function drawSelectMarquee({
  ctx,
  start,
  end,
  zoom,
  viewPortOffset,
}: {
  ctx: CanvasRenderingContext2D;
  start: Position;
  end: Position;
  zoom: number;
  viewPortOffset: Position;
}) {
  const bounds = getSelectionBounds(start, end);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const screenWidth = width * zoom;
  const screenHeight = height * zoom;
  const { x: screenMinX, y: screenMinY } = worldToScreen(
    { x: bounds.minX, y: bounds.minY },
    viewPortOffset,
    zoom,
  );

  ctx.fillStyle = uiColors.marqueeFill;
  ctx.fillRect(screenMinX, screenMinY, screenWidth, screenHeight);

  ctx.strokeStyle = uiColors.marqueeStroke;
  ctx.lineWidth = 0.75;
  ctx.strokeRect(screenMinX, screenMinY, screenWidth, screenHeight);
  ctx.setLineDash([]);
}

function drawSelectHandle(
  ctx: CanvasRenderingContext2D,
  position: Position,
  size = 3,
): void {
  const side = size * 2;
  ctx.fillStyle = uiColors.selectionHandleFill;
  ctx.fillRect(position.x - size, position.y - size, side, side);
  ctx.strokeStyle = uiColors.selectionHandleStroke;
  ctx.lineWidth = 0.75;
  ctx.strokeRect(position.x - size, position.y - size, side, side);
}
