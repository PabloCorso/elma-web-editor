import type { Tool } from "./tool-interface";
import type { EventContext } from "../utils/event-handler";
import { useStore, type Store } from "../useStore";
import { isWithinThreshold } from "../utils/coordinate-utils";
import { colors } from "../constants";
import type { Polygon } from "elmajs";

export class PolygonTool implements Tool {
  id = "polygon";
  name = "Polygon";
  shortcut = "P";

  onActivate(): void {
    // Polygon tool doesn't need to clear anything on activate
  }

  onDeactivate(): void {
    // Clear drawing polygon when deactivating
    useStore.getState().setToolState("polygon", { drawingPolygon: [] });
  }

  onPointerDown(_event: PointerEvent, context: EventContext): boolean {
    const store = useStore.getState();
    const worldPos = context.worldPos;
    const toolState = store.getToolState("polygon");

    if (toolState.drawingPolygon.length >= 3) {
      const firstPoint = toolState.drawingPolygon[0];
      if (isWithinThreshold(worldPos, firstPoint, 15, store.zoom)) {
        const newPolygon = {
          vertices: [...toolState.drawingPolygon],
          grass: false,
        };
        this.addPolygon(newPolygon);
        store.setToolState("polygon", { drawingPolygon: [] });
        return true;
      }
    }

    const newVertices = [...toolState.drawingPolygon, worldPos];
    store.setToolState("polygon", { drawingPolygon: newVertices });
    return true;
  }

  onKeyDown(event: KeyboardEvent, _context: EventContext): boolean {
    const store = useStore.getState();
    const toolState = store.getToolState("polygon");

    if (event.key === "Escape") {
      store.setToolState("polygon", { drawingPolygon: [] });
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
      store.setToolState("polygon", { drawingPolygon: [] });
    } else if (toolState.drawingPolygon.length > 0) {
      store.setToolState("polygon", { drawingPolygon: [] });
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
}
