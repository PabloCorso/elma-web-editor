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
import { colors } from "../constants";
import type { Apple, Polygon, Position } from "../elma-types";
import type { EditorStore } from "../editor-store";
import { defaultTools } from "./default-tools";
import {
  isWithinThreshold,
  worldToScreen,
} from "../helpers/coordinate-helpers";
import { checkModifierKey } from "~/utils/misc";

const SELECT_THRESHOLD = 15;

export type SelectionToolState = {
  selectedVertices: Array<{ polygon: Polygon; vertex: Position }>;
  selectedObjects: Position[];
  selectedPictures: Position[];
};

type VertexSelection = { polygon: Polygon; vertex: Position };
type ObjectSelection = Position;

export class SelectTool extends Tool<SelectionToolState> {
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

  onDeactivate(): void {
    this.clear();
  }

  clear(): void {
    const { setToolState } = this.getState();
    setToolState({
      selectedVertices: [],
      selectedObjects: [],
      selectedPictures: [],
    });
    this.isDragging = false;
    this.isMarqueeSelecting = false;
    this.dragOriginPositions = [];
  }

  onPointerDown(event: PointerEvent, context: EventContext): boolean {
    const { state } = this.getState();
    const vertex = findVertexNearPosition(
      context.worldPos,
      state.polygons,
      10 / state.zoom
    );
    const picture = findObjectNearPosition(
      context.worldPos,
      state.pictures.map((p) => p.position),
      SELECT_THRESHOLD / state.zoom
    );
    const object = this.findObjectNearPosition(context.worldPos);
    const polygonEdge = findPolygonEdgeNearPosition(
      context.worldPos,
      state.polygons,
      8 / state.zoom
    );

    const modifier = checkModifierKey(event);
    if (vertex) {
      this.handleVertexSelection(vertex, modifier);
      this.startDragging(context.worldPos);
      return true;
    } else if (picture) {
      this.handlePictureSelection(picture, modifier);
      this.startDragging(context.worldPos);
      return true;
    } else if (object) {
      this.handleObjectSelection(object, modifier);
      this.startDragging(context.worldPos);
      return true;
    } else if (polygonEdge) {
      this.handlePolygonSelection(polygonEdge, modifier);
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
    const { state, toolState } = this.getState();
    if (!toolState) return;

    // Draw selection handles in screen coordinates
    const { selectedVertices, selectedObjects, selectedPictures } = toolState;
    const allSelected = [
      ...selectedVertices.map(({ vertex }) => vertex),
      ...selectedObjects,
      ...selectedPictures,
    ];
    ctx.fillStyle = colors.selection;
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
      SELECT_THRESHOLD / state.zoom
    );
    if (apple) return apple;

    const killer = findObjectNearPosition(
      position,
      state.killers,
      SELECT_THRESHOLD / state.zoom
    );
    if (killer) return killer;

    const flower = findObjectNearPosition(
      position,
      state.flowers,
      SELECT_THRESHOLD / state.zoom
    );
    if (flower) return flower;

    const start = isWithinThreshold(
      position,
      state.start,
      SELECT_THRESHOLD / state.zoom
    );
    if (start) return state.start;

    return null;
  }

  private handleVertexSelection(
    vertex: VertexSelection,
    modifier: boolean
  ): void {
    const { toolState } = this.getState();
    if (!toolState) return;

    const isSelected = isVertexSelected(vertex, toolState.selectedVertices);
    if (!modifier && !isSelected) {
      this.clear();
    }

    if (!isSelected) {
      this.selectVertex(vertex.polygon, vertex.vertex);
    }
  }

  private handleObjectSelection(
    object: ObjectSelection,
    modifier: boolean
  ): void {
    const { toolState } = this.getState();
    if (!toolState) return;

    const isSelected = isObjectSelected(object, toolState.selectedObjects);

    if (!modifier && !isSelected) {
      this.clear();
    }

    if (!isSelected) {
      this.selectObject(object);
    }
  }

  private handlePictureSelection(picture: Position, modifier: boolean): void {
    const { toolState } = this.getState();
    if (!toolState) return;

    const isSelected = isObjectSelected(picture, toolState.selectedPictures);
    if (!modifier && !isSelected) {
      this.clear();
    }

    if (!isSelected) {
      this.selectPicture(picture);
    }
  }

  private handlePolygonSelection(polygon: Polygon, modifier: boolean): void {
    const { toolState } = this.getState();
    if (!toolState) return;

    const isSelected = toolState.selectedVertices.some(
      (sv: VertexSelection) => sv.polygon === polygon
    );
    if (!modifier && !isSelected) {
      this.clear();
    }

    if (!isSelected) {
      this.selectPolygon(polygon);
    }
  }

  private startDragging(worldPos: Position): void {
    const { toolState } = this.getState();
    if (!toolState) return;

    this.isDragging = true;
    this.dragStartPos = worldPos;

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

    if (toolState.selectedPictures.length > 0) {
      const vertexCount = toolState.selectedVertices.length;
      const objectCount = toolState.selectedObjects.length;
      const newPicturePositions = toolState.selectedPictures.map(
        (pic: Position, index: number) => {
          const originPos =
            this.dragOriginPositions[vertexCount + objectCount + index];
          return {
            x: originPos.x + totalDeltaX,
            y: originPos.y + totalDeltaY,
          };
        }
      );
      this.updateSelectedPictures(newPicturePositions);
    }
  }

  private finalizeMarqueeSelection(): void {
    const { state, toolState } = this.getState();
    if (!toolState) return;

    const bounds = getSelectionBounds(this.marqueeStartPos, this.marqueeEndPos);

    // Select vertices within the marquee
    state.polygons.forEach((polygon: Polygon) => {
      polygon.vertices.forEach((vertex: Position) => {
        if (isPointInRect(vertex, bounds)) {
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
      if (isPointInRect(obj, bounds)) {
        const isSelected = toolState.selectedObjects.includes(obj);
        if (!isSelected) {
          this.selectObject(obj);
        }
      }
    });

    // Select pictures within the marquee
    state.pictures.forEach((picture) => {
      if (isPointInRect(picture.position, bounds)) {
        const isSelected = toolState.selectedPictures.includes(
          picture.position
        );
        if (!isSelected) {
          this.selectPicture(picture.position);
        }
      }
    });
  }

  private selectVertex(polygon: Polygon, vertex: Position): void {
    const { toolState, setToolState } = this.getState();
    if (!toolState) return;

    setToolState({
      selectedVertices: [...toolState.selectedVertices, { polygon, vertex }],
    });
  }

  private selectObject(object: ObjectSelection): void {
    const { toolState, setToolState } = this.getState();
    if (!toolState) return;

    setToolState({ selectedObjects: [...toolState.selectedObjects, object] });
  }

  private selectPicture(picture: Position): void {
    const { toolState, setToolState } = this.getState();
    if (!toolState) return;

    setToolState({
      selectedPictures: [...toolState.selectedPictures, picture],
    });
  }

  private selectPolygon(polygon: Polygon): void {
    const { toolState, setToolState } = this.getState();
    if (!toolState) return;

    // Filter out vertices that are already selected
    const existingSelectedVertices = toolState.selectedVertices.filter(
      (sv: VertexSelection) => sv.polygon !== polygon
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

    setToolState({ selectedVertices: updatedSelectedVertices });

    // Update polygons in store
    state.actions.setPolygons(updatedPolygons);
  }

  private updateSelectedObjects(newPositions: Position[]): void {
    const { state, toolState, setToolState } = this.getState();
    if (!toolState) return;

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
        const apple = state.apples[appleIndex];
        updates.apples[appleIndex] = {
          position: newPos,
          animation: apple.animation,
          gravity: apple.gravity,
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

    setToolState({ selectedObjects: updatedSelectedObjects });
  }

  private updateSelectedPictures(newPositions: Position[]): void {
    const { state, toolState, setToolState } = this.getState();
    if (!toolState) return;

    const updatedPictures = [...state.pictures];
    const updatedSelectedPictures = [...toolState.selectedPictures];

    // Update each selected picture with its new position
    toolState.selectedPictures.forEach((picture: Position, index) => {
      const pictureIndex = updatedPictures.findIndex(
        (p) => p.position === picture
      );
      if (pictureIndex !== -1) {
        const newPos = newPositions[index];
        updatedPictures[pictureIndex] = {
          ...updatedPictures[pictureIndex],
          position: newPos,
        };
        updatedSelectedPictures[index] = newPos;
      }
    });

    // Update pictures in store
    Object.assign(state, { pictures: updatedPictures });

    setToolState({ selectedPictures: updatedSelectedPictures });
  }

  private updatePolygon(index: number, polygon: Polygon): void {
    const { state } = this.getState();
    state.actions.setPolygons(
      state.polygons.map((p, i) => (i === index ? polygon : p))
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
    zoom
  );

  ctx.fillStyle = "rgba(255, 255, 0, 0.2)";
  ctx.fillRect(screenMinX, screenMinY, screenWidth, screenHeight);

  ctx.strokeStyle = "#ffff00";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(screenMinX, screenMinY, screenWidth, screenHeight);
  ctx.setLineDash([]);
}

function drawSelectHandle(
  ctx: CanvasRenderingContext2D,
  position: Position,
  size = 3
): void {
  ctx.fillRect(position.x - size, position.y - size, size * 2, size * 2);
}
