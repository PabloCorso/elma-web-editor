import { describe, expect, it } from "vitest";
import {
  formatTopologyCheckResult,
  getTopologySelection,
  validateLevelTopology,
} from "./level-topology";
import type { Polygon } from "../elma-types";

function createPolygon(vertices: Array<{ x: number; y: number }>): Polygon {
  return { grass: false, vertices } as Polygon;
}

function createGrassPolygon(
  vertices: Array<{ x: number; y: number }>,
): Polygon {
  return { grass: true, vertices } as Polygon;
}

describe("level topology validation", () => {
  it("passes for the default in-game level bounds", () => {
    const polygon = createPolygon([
      { x: -24, y: -8 },
      { x: 24, y: -8 },
      { x: 24, y: 2 },
      { x: -24, y: 2 },
    ]);

    const result = validateLevelTopology({ polygons: [polygon] });

    expect(result.issues).toEqual([]);
    expect(result.width).toBe(48);
    expect(result.height).toBe(10);
  });

  it("detects duplicate vertices", () => {
    const polygonA = createPolygon([
      { x: 16.4, y: 7.2 },
      { x: 20, y: 7.2 },
      { x: 20, y: 10 },
    ]);
    const polygonB = createPolygon([
      { x: 16.4, y: 7.2 },
      { x: 12, y: 8 },
      { x: 11, y: 10 },
    ]);

    const result = validateLevelTopology({ polygons: [polygonA, polygonB] });

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.type).toBe("duplicate-vertex");
    expect(result.issues[0]?.message).toBe("Two vertices overlap.");
  });

  it("detects vertices that are too close", () => {
    const polygonA = createPolygon([
      { x: 16.4, y: 7.2 },
      { x: 20, y: 7.2 },
      { x: 20, y: 10 },
    ]);
    const polygonB = createPolygon([
      { x: 16.4000001, y: 7.2000001 },
      { x: 12, y: 8 },
      { x: 11, y: 10 },
    ]);

    const result = validateLevelTopology({ polygons: [polygonA, polygonB] });

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.type).toBe("nearby-vertex");
    expect(result.issues[0]?.message).toBe(
      "Two vertices are too close together.",
    );
  });

  it("detects crossing polygons", () => {
    const polygonA = createPolygon([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
    ]);
    const polygonB = createPolygon([
      { x: 2, y: -1 },
      { x: 5, y: 2 },
      { x: 2, y: 5 },
      { x: -1, y: 2 },
    ]);

    const result = validateLevelTopology({ polygons: [polygonA, polygonB] });

    const crossingIssues = result.issues.filter(
      (issue) => issue.type === "crossing-polygons",
    );

    expect(crossingIssues).toHaveLength(1);
    expect(crossingIssues[0]?.message).toContain("Shapes cross at");
  });

  it("detects self-intersecting polygons", () => {
    const polygon = createPolygon([
      { x: 0, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
      { x: 4, y: 0 },
    ]);

    const result = validateLevelTopology({ polygons: [polygon] });

    const selfIntersections = result.issues.filter(
      (issue) => issue.type === "self-intersection",
    );

    expect(selfIntersections).toHaveLength(1);
    expect(selfIntersections[0]?.message).toBe(
      "A shape intersects itself at 1 contact point.",
    );
  });

  it("ignores grass polygons for crossing checks", () => {
    const ground = createPolygon([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
    ]);
    const grass = createGrassPolygon([
      { x: 2, y: -1 },
      { x: 5, y: 2 },
      { x: 2, y: 5 },
      { x: -1, y: 2 },
    ]);
    const selfCrossingGrass = createGrassPolygon([
      { x: 10, y: 0 },
      { x: 14, y: 4 },
      { x: 10, y: 4 },
      { x: 14, y: 0 },
    ]);

    const result = validateLevelTopology({
      polygons: [ground, grass, selfCrossingGrass],
    });

    expect(
      result.issues.some(
        (issue) =>
          issue.type === "crossing-polygons" ||
          issue.type === "self-intersection",
      ),
    ).toBe(false);
  });

  it("detects oversize bounds", () => {
    const polygon = createPolygon([
      { x: -100, y: -10 },
      { x: 100, y: -10 },
      { x: 100, y: 10 },
      { x: -100, y: 10 },
    ]);

    const result = validateLevelTopology({ polygons: [polygon] });

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.type).toBe("bounds");
    expect(result.issues[0]?.message).toBe("Level width exceeds 188.");
    expect(result.width).toBe(200);
  });

  it("builds a selection from issue vertices", () => {
    const polygonA = createPolygon([
      { x: 1, y: 1 },
      { x: 4, y: 1 },
      { x: 4, y: 4 },
    ]);
    const polygonB = createPolygon([
      { x: 1, y: 1 },
      { x: 0, y: 2 },
      { x: 0, y: 4 },
    ]);

    const result = validateLevelTopology({ polygons: [polygonA, polygonB] });
    const selection = getTopologySelection(
      [polygonA, polygonB],
      result.issues,
    );

    expect(selection).toHaveLength(2);
    expect(selection[0]?.vertex).toBe(polygonA.vertices[0]);
    expect(selection[1]?.vertex).toBe(polygonB.vertices[0]);
  });

  it("formats a readable summary", () => {
    const result = validateLevelTopology({
      polygons: [
        createPolygon([
          { x: 0, y: 0 },
          { x: 200, y: 0 },
          { x: 200, y: 4 },
          { x: 0, y: 4 },
        ]),
      ],
    });

    expect(formatTopologyCheckResult(result)).toContain(
      "Topology check found 1 issue.",
    );
  });
});
