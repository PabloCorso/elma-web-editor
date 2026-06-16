import { describe, expect, it } from "vitest";
import type { EditorState } from "~/editor/editor-state";
import type { EditorStore } from "~/editor/editor-store";
import type { Polygon, Position } from "~/editor/elma-types";
import { defaultAutoGrassOptions } from "~/editor/helpers/auto-grass";
import { VertexTool, type VertexToolState } from "./vertex-tool";

function position(x: number, y: number): Position {
  return { x, y } as Position;
}

function polygon(vertices: Position[], grass = false): Polygon {
  return { vertices, grass } as Polygon;
}

function createVertexTool({
  polygons,
  mousePosition,
  toolState,
}: {
  polygons: Polygon[];
  mousePosition: Position;
  toolState: VertexToolState;
}) {
  const state = {
    polygons,
    mousePosition,
    mouseOnCanvas: true,
    zoom: 1,
    autoGrassOptions: { ...defaultAutoGrassOptions, endInset: 0 },
    actions: {
      getToolState: (toolId: string) =>
        toolId === "vertex" ? toolState : undefined,
    },
  } as EditorState;

  const store = { getState: () => state } as EditorStore;
  return new VertexTool(store);
}

describe("VertexTool", () => {
  it("previews generated grass while hovering a grassable polygon in auto-grass mode", () => {
    const ground = polygon([
      position(0, 0),
      position(10, 0),
      position(10, 2),
      position(0, 2),
    ]);
    const tool = createVertexTool({
      polygons: [ground],
      mousePosition: position(5, 2),
      toolState: {
        drawingPolygon: { vertices: [], grass: false },
        variant: "autoGrass",
      },
    });

    expect(tool.getDrafts().polygons).toMatchObject([{ grass: true }]);
  });

  it("does not preview grass before the pointer is on a grassable polygon edge", () => {
    const ground = polygon([
      position(0, 0),
      position(10, 0),
      position(10, 2),
      position(0, 2),
    ]);
    const tool = createVertexTool({
      polygons: [ground],
      mousePosition: position(50, 50),
      toolState: {
        drawingPolygon: { vertices: [], grass: false },
        variant: "autoGrass",
      },
    });

    expect(tool.getDrafts().polygons).toEqual([]);
  });
});
