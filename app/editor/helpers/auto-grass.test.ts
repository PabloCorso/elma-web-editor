import { describe, expect, it } from "vitest";
import type { Polygon, Position } from "~/editor/elma-types";
import {
  defaultAutoGrassOptions,
  generateAutoGrassPolygons,
  getAutoGrassablePolygonsFromSelection,
} from "./auto-grass";
import {
  getGrassEdgeIndices,
  getGrassFillQuads,
} from "~/editor/render/world-geometry";
import { getSimpleGrassFillQuads } from "~/editor/render/webgl-geometry";

function position(x: number, y: number): Position {
  return { x, y } as Position;
}

function polygon(vertices: Position[], grass = false): Polygon {
  return { vertices, grass } as Polygon;
}

describe("generateAutoGrassPolygons", () => {
  it("generates grass on shallow edges with sky above and ground below", () => {
    const skyPocket = polygon([
      position(0, 0),
      position(10, 0),
      position(10, 2),
      position(0, 2),
    ]);

    const generated = generateAutoGrassPolygons({
      polygons: [skyPocket],
      sourcePolygons: [skyPocket],
      options: { ...defaultAutoGrassOptions, endInset: 0 },
    });

    expect(generated).toHaveLength(1);
    expect(generated[0]?.grass).toBe(true);
    expect(generated[0]?.vertices[0]?.x).toBe(10);
    expect(generated[0]?.vertices[1]?.x).toBe(0);
    expect(generated[0]?.vertices[0]?.y).toBeGreaterThan(2);
    expect(generated[0]?.vertices[1]?.y).toBeGreaterThan(2);
  });

  it("moves the visible grass edge away from the ground edge when depth changes", () => {
    const skyPocket = polygon([
      position(0, 0),
      position(10, 0),
      position(10, 2),
      position(0, 2),
    ]);

    const shallow = generateAutoGrassPolygons({
      polygons: [skyPocket],
      sourcePolygons: [skyPocket],
      options: { ...defaultAutoGrassOptions, endInset: 0, depth: 0.1 },
    });
    const deep = generateAutoGrassPolygons({
      polygons: [skyPocket],
      sourcePolygons: [skyPocket],
      options: { ...defaultAutoGrassOptions, endInset: 0, depth: 0.5 },
    });

    expect(deep[0]!.vertices[0]!.y).toBeGreaterThan(shallow[0]!.vertices[0]!.y);
  });

  it("generates flat grass as a line polygon with only an overlapping end vertex", () => {
    const skyPocket = polygon([
      position(0, 0),
      position(10, 0),
      position(10, 2),
      position(0, 2),
    ]);

    const generated = generateAutoGrassPolygons({
      polygons: [skyPocket],
      sourcePolygons: [skyPocket],
      options: { ...defaultAutoGrassOptions, endInset: 0 },
    });

    expect(generated).toHaveLength(1);
    expect(generated[0]?.vertices).toEqual([
      position(10, 2 + defaultAutoGrassOptions.depth),
      position(0, 2 + defaultAutoGrassOptions.depth),
      position(0, 2 + defaultAutoGrassOptions.depth),
    ]);
  });

  it("renders generated flat grass as one strip without end caps", () => {
    const skyPocket = polygon([
      position(0, 0),
      position(10, 0),
      position(10, 2),
      position(0, 2),
    ]);

    const generated = generateAutoGrassPolygons({
      polygons: [skyPocket],
      sourcePolygons: [skyPocket],
      options: { ...defaultAutoGrassOptions, endInset: 0 },
    });

    const quads = getGrassFillQuads({
      vertices: generated[0]!.vertices,
      zoom: 1,
      depth: defaultAutoGrassOptions.depth,
    });

    expect(quads).toHaveLength(1);
    expect([quads[0]?.[0].x, quads[0]?.[1].x].sort((a, b) => a - b)).toEqual([
      0, 10,
    ]);
    expect(quads[0]?.[0].y).toBe(2 + defaultAutoGrassOptions.depth);
    expect(quads[0]?.[1].y).toBe(2 + defaultAutoGrassOptions.depth);
  });

  it("renders generated simple grass up from the line with the textured height", () => {
    const skyPocket = polygon([
      position(0, 0),
      position(10, 0),
      position(10, 2),
      position(0, 2),
    ]);
    const depth = 1;

    const generated = generateAutoGrassPolygons({
      polygons: [skyPocket],
      sourcePolygons: [skyPocket],
      options: { ...defaultAutoGrassOptions, depth, endInset: 0 },
    });

    const quads = getSimpleGrassFillQuads({
      vertices: generated[0]!.vertices,
      grassEdgeIndices: [0],
      zoom: 1,
      depth,
    });

    expect(quads[0]?.[0].y).toBe(2 + depth);
    expect(quads[0]?.[3].y).toBeCloseTo(2 + depth - 39 / 48);
  });

  it("generates one grass polygon for adjacent grassable edges", () => {
    const skyPocket = polygon([
      position(0, 0),
      position(10, 0),
      position(10, 2),
      position(5, 2),
      position(0, 2),
    ]);

    const generated = generateAutoGrassPolygons({
      polygons: [skyPocket],
      sourcePolygons: [skyPocket],
      options: { ...defaultAutoGrassOptions, endInset: 0 },
    });

    expect(generated).toHaveLength(1);
    expect(generated[0]?.vertices).toEqual([
      position(10, 2 + defaultAutoGrassOptions.depth),
      position(5, 2 + defaultAutoGrassOptions.depth),
      position(0, 2 + defaultAutoGrassOptions.depth),
      position(0, 2 + defaultAutoGrassOptions.depth),
    ]);
  });

  it("does not create gaps at internal vertices when end inset is enabled", () => {
    const skyPocket = polygon([
      position(0, 0),
      position(10, 0),
      position(10, 2),
      position(5, 2),
      position(0, 2),
    ]);

    const generated = generateAutoGrassPolygons({
      polygons: [skyPocket],
      sourcePolygons: [skyPocket],
      options: defaultAutoGrassOptions,
    });

    expect(generated).toHaveLength(1);
    expect(generated[0]?.vertices).toEqual([
      position(
        10 - defaultAutoGrassOptions.endInset,
        2 + defaultAutoGrassOptions.depth,
      ),
      position(5, 2 + defaultAutoGrassOptions.depth),
      position(
        defaultAutoGrassOptions.endInset,
        2 + defaultAutoGrassOptions.depth,
      ),
      position(
        defaultAutoGrassOptions.endInset,
        2 + defaultAutoGrassOptions.depth,
      ),
    ]);
  });

  it("keeps inset flat caps abrupt with no source-line vertices", () => {
    const skyPocket = polygon([
      position(0, 0),
      position(10, 0),
      position(10, 2),
      position(0, 2),
    ]);

    const generated = generateAutoGrassPolygons({
      polygons: [skyPocket],
      sourcePolygons: [skyPocket],
      options: { ...defaultAutoGrassOptions, endInset: 2 },
    });

    expect(generated).toHaveLength(1);
    expect(generated[0]?.vertices).toEqual([
      position(8, 2 + defaultAutoGrassOptions.depth),
      position(2, 2 + defaultAutoGrassOptions.depth),
      position(2, 2 + defaultAutoGrassOptions.depth),
    ]);
  });

  it("keeps grass continuous across short shallow polygon segments", () => {
    const skyPocket = polygon([
      position(0, 0),
      position(10, 0),
      position(10, 2),
      position(9.75, 2.02),
      position(9.5, 2.04),
      position(9.25, 2.06),
      position(9, 2.08),
      position(0, 2.08),
    ]);

    const generated = generateAutoGrassPolygons({
      polygons: [skyPocket],
      sourcePolygons: [skyPocket],
      options: defaultAutoGrassOptions,
    });

    expect(generated).toHaveLength(1);
    expect(generated[0]?.vertices).toHaveLength(7);
    const firstSegmentLength = Math.hypot(0.25, 0.02);
    expect(generated[0]?.vertices[0]?.x).toBeCloseTo(
      10 +
        defaultAutoGrassOptions.depth * (0.02 / firstSegmentLength) -
        defaultAutoGrassOptions.endInset * (0.25 / firstSegmentLength),
    );
    expect(generated[0]?.vertices[0]?.y).toBeCloseTo(
      2 +
        defaultAutoGrassOptions.endInset * (0.02 / firstSegmentLength) +
        defaultAutoGrassOptions.depth * (0.25 / firstSegmentLength),
    );
  });

  it("keeps every shallow source segment grassed until a max-angle edge interrupts it", () => {
    const skyPocket = polygon([
      position(0, 0),
      position(12, 0),
      position(12, 2),
      position(9, 2.1),
      position(6, 2.2),
      position(3, 2.1),
      position(0, 2),
    ]);

    const generated = generateAutoGrassPolygons({
      polygons: [skyPocket],
      sourcePolygons: [skyPocket],
      options: { ...defaultAutoGrassOptions, endInset: 0 },
    });

    const quads = getGrassFillQuads({
      vertices: generated[0]!.vertices,
      zoom: 1,
      depth: defaultAutoGrassOptions.depth,
    });

    expect(generated).toHaveLength(1);
    expect(quads).toHaveLength(4);
    expect(
      Math.min(...quads.flatMap((quad) => [quad[0].x, quad[1].x])),
    ).toBeLessThanOrEqual(0);
    expect(
      Math.max(...quads.flatMap((quad) => [quad[0].x, quad[1].x])),
    ).toBeGreaterThanOrEqual(12);
  });

  it("continues grass from a flat edge onto a shallow incoming edge", () => {
    const skyPocket = polygon([
      position(0, 0),
      position(12, 0),
      position(12, 2),
      position(4, 2),
      position(0, 0.8),
    ]);

    const generated = generateAutoGrassPolygons({
      polygons: [skyPocket],
      sourcePolygons: [skyPocket],
      options: { ...defaultAutoGrassOptions, endInset: 0 },
    });

    const quads = getGrassFillQuads({
      vertices: generated[0]!.vertices,
      zoom: 1,
      depth: defaultAutoGrassOptions.depth,
    });

    expect(generated).toHaveLength(1);
    expect(quads).toHaveLength(2);
    expect(
      Math.min(...quads.flatMap((quad) => [quad[0].x, quad[1].x])),
    ).toBeLessThanOrEqual(0);
  });

  it("generates grass on slopes represented by the steepest grass sprite", () => {
    const skyPocket = polygon([
      position(0, 0),
      position(12, 0),
      position(12, 8),
      position(4, 8),
      position(0, 1.6),
    ]);

    const generated = generateAutoGrassPolygons({
      polygons: [skyPocket],
      sourcePolygons: [skyPocket],
      options: { ...defaultAutoGrassOptions, endInset: 0 },
    });

    const quads = getGrassFillQuads({
      vertices: generated[0]!.vertices,
      zoom: 1,
      depth: defaultAutoGrassOptions.depth,
    });

    expect(generated).toHaveLength(1);
    expect(quads).toHaveLength(2);
    expect(
      Math.min(...quads.flatMap((quad) => [quad[0].x, quad[1].x])),
    ).toBeLessThanOrEqual(0);
  });

  it("offsets sloped grass by the configured depth perpendicular to the ground edge", () => {
    const skyPocket = polygon([
      position(0, 0),
      position(12, 0),
      position(12, 8),
      position(4, 8),
      position(0, 1.6),
    ]);
    const depth = 1;

    const generated = generateAutoGrassPolygons({
      polygons: [skyPocket],
      sourcePolygons: [skyPocket],
      options: { ...defaultAutoGrassOptions, depth, endInset: 0 },
    });

    expect(generated).toHaveLength(1);
    const slopeLength = Math.hypot(4, 6.4);
    expect(generated[0]!.vertices[2]!.x).toBeCloseTo(
      0 - (6.4 / slopeLength) * depth,
    );
    expect(generated[0]!.vertices[2]!.y).toBeCloseTo(
      1.6 + (4 / slopeLength) * depth,
    );
  });

  it("grasses clear spans when only part of a source edge is blocked", () => {
    const skyPocket = polygon([
      position(0, 0),
      position(20, 0),
      position(20, 2),
      position(0, 2),
    ]);
    const groundIsland = polygon([
      position(8, 1.5),
      position(12, 1.5),
      position(12, 1.95),
      position(8, 1.95),
    ]);

    const generated = generateAutoGrassPolygons({
      polygons: [skyPocket, groundIsland],
      sourcePolygons: [skyPocket],
      options: { ...defaultAutoGrassOptions, endInset: 0 },
    });

    expect(generated).toHaveLength(2);
    expect(generated.map((grass) => grass.vertices.length)).toEqual([3, 3]);
    expect(generated.map((grass) => grass.vertices[0]!.x)).toEqual([20, 8]);
    expect(generated.map((grass) => grass.vertices[1]!.x)).toEqual([12, 0]);
  });

  it("splits grass polygons when an ungrassable edge interrupts the run", () => {
    const skyPocket = polygon([
      position(0, 0),
      position(10, 0),
      position(10, 2),
      position(6, 2),
      position(5, 8),
      position(4, 2),
      position(0, 2),
    ]);

    const generated = generateAutoGrassPolygons({
      polygons: [skyPocket],
      sourcePolygons: [skyPocket],
      options: { ...defaultAutoGrassOptions, endInset: 0 },
    });

    expect(generated).toHaveLength(2);
    expect(generated.map((grass) => grass.vertices.length)).toEqual([3, 3]);
  });

  it("does not generate grass on steep wall edges", () => {
    const verticalSlot = polygon([
      position(0, 0),
      position(2, 0),
      position(2, 10),
      position(0, 10),
    ]);

    const generated = generateAutoGrassPolygons({
      polygons: [verticalSlot],
      sourcePolygons: [verticalSlot],
      options: defaultAutoGrassOptions,
    });

    expect(generated).toHaveLength(1);
    expect(generated[0]?.vertices[0]?.y).toBeGreaterThan(10);
  });
});

describe("getAutoGrassablePolygonsFromSelection", () => {
  it("returns only fully selected non-grass polygons", () => {
    const ground = polygon([
      position(0, 0),
      position(10, 0),
      position(10, 2),
      position(0, 2),
    ]);
    const grass = polygon(
      [position(0, 3), position(10, 3), position(10, 4), position(0, 4)],
      true,
    );

    const selected = getAutoGrassablePolygonsFromSelection([
      ...ground.vertices.map((vertex) => ({ polygon: ground, vertex })),
      ...grass.vertices.map((vertex) => ({ polygon: grass, vertex })),
    ]);

    expect(selected).toEqual([ground]);
  });

  it("does not treat partial vertex selection as a selected polygon", () => {
    const ground = polygon([
      position(0, 0),
      position(10, 0),
      position(10, 2),
      position(0, 2),
    ]);

    const selected = getAutoGrassablePolygonsFromSelection([
      { polygon: ground, vertex: ground.vertices[0]! },
      { polygon: ground, vertex: ground.vertices[1]! },
    ]);

    expect(selected).toEqual([]);
  });
});

describe("getGrassEdgeIndices", () => {
  it("keeps manual grass band end edges paintable for simple-color grass", () => {
    const vertices = [
      position(0, 0),
      position(10, 0),
      position(10, 2),
      position(0, 2),
    ];

    expect(getGrassEdgeIndices(vertices)).toEqual([1, 2, 3]);
  });
});
