import { ELMA_PIXEL_SCALE } from "~/editor/constants";
import type { Polygon, Position } from "~/editor/elma-types";
import { isWorldPointInGroundRegion } from "~/editor/helpers/polygon-helpers";
import { DEFAULT_GRASS_MAX_SLOPE_DEGREES } from "~/editor/render/grass-renderer";

const SAMPLE_SPACING = 0.5;
const SURFACE_TEST_OFFSET = ELMA_PIXEL_SCALE * 8;
const MAX_GRASS_SLOPE_DEGREES = DEFAULT_GRASS_MAX_SLOPE_DEGREES;

export type AutoGrassOptions = {
  depth: number;
  endInset: number;
};

export const defaultAutoGrassOptions: AutoGrassOptions = {
  depth: ELMA_PIXEL_SCALE * 16,
  endInset: ELMA_PIXEL_SCALE * 8,
};

type GrassableEdge = {
  visibleStart: Position;
  visibleEnd: Position;
  direction: Position;
  length: number;
};

type GrassableSpan = GrassableEdge & {
  startT: number;
  endT: number;
  surfaceNormal: Position;
};

export function appendAutoGrassForPolygons({
  polygons,
  sourcePolygons,
  options = defaultAutoGrassOptions,
}: {
  polygons: Polygon[];
  sourcePolygons: Polygon[];
  options?: AutoGrassOptions;
}): Polygon[] {
  const generated = generateAutoGrassPolygons({
    polygons,
    sourcePolygons,
    options,
  });

  if (generated.length === 0) return polygons;
  return [...polygons, ...generated];
}

export function generateAutoGrassPolygons({
  polygons,
  sourcePolygons,
  options = defaultAutoGrassOptions,
}: {
  polygons: Polygon[];
  sourcePolygons: Polygon[];
  options?: AutoGrassOptions;
}): Polygon[] {
  const sourceSet = new Set(sourcePolygons);
  const solidPolygons = polygons.filter((polygon) => !polygon.grass);
  const generated: Polygon[] = [];

  for (const polygon of solidPolygons) {
    if (!sourceSet.has(polygon)) continue;
    if (polygon.vertices.length < 3) continue;

    generated.push(
      ...generateGrassForPolygon({ polygon, polygons: solidPolygons, options }),
    );
  }

  return generated;
}

export function getAutoGrassablePolygonsFromSelection(
  selectedVertices: Array<{ polygon: Polygon; vertex: Position }>,
): Polygon[] {
  const selectionCount = new Map<Polygon, number>();

  for (const { polygon } of selectedVertices) {
    selectionCount.set(polygon, (selectionCount.get(polygon) ?? 0) + 1);
  }

  return Array.from(selectionCount)
    .filter(
      ([polygon, count]) =>
        !polygon.grass &&
        polygon.vertices.length >= 3 &&
        count === polygon.vertices.length,
    )
    .map(([polygon]) => polygon);
}

function generateGrassForPolygon({
  polygon,
  polygons,
  options,
}: {
  polygon: Polygon;
  polygons: Polygon[];
  options: AutoGrassOptions;
}): Polygon[] {
  const grassableEdges = polygon.vertices.flatMap((from, index) =>
    getGrassableEdgeEntries({
      from,
      to: polygon.vertices[(index + 1) % polygon.vertices.length]!,
      polygons,
      options,
    }),
  );
  const runs = getContiguousRuns(grassableEdges);

  return runs
    .map((run) => generateGrassForEdgeRun(run, options))
    .filter((grassPolygon): grassPolygon is Polygon => Boolean(grassPolygon));
}

function getGrassableEdgeEntries({
  from,
  to,
  polygons,
  options,
}: {
  from: Position;
  to: Position;
  polygons: Polygon[];
  options: AutoGrassOptions;
}): Array<GrassableEdge | null> {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return [null];

  const slopeDegrees = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI);
  const normalizedSlope = slopeDegrees > 90 ? 180 - slopeDegrees : slopeDegrees;
  if (normalizedSlope > MAX_GRASS_SLOPE_DEGREES) return [null];

  const dir = { x: dx / length, y: dy / length };
  const spans = getGrassableSpans({
    from,
    to,
    length,
    direction: dir,
    polygons,
  });
  if (spans.length === 0) return [null];

  const entries: Array<GrassableEdge | null> = [];
  if (spans[0]!.startT > 0) entries.push(null);

  spans.forEach((span, index) => {
    if (index > 0) entries.push(null);
    entries.push({
      visibleStart: {
        x: span.visibleStart.x + span.surfaceNormal.x * options.depth,
        y: span.visibleStart.y + span.surfaceNormal.y * options.depth,
      },
      visibleEnd: {
        x: span.visibleEnd.x + span.surfaceNormal.x * options.depth,
        y: span.visibleEnd.y + span.surfaceNormal.y * options.depth,
      },
      direction: span.direction,
      length: span.length,
    });
  });

  if (spans[spans.length - 1]!.endT < 1) entries.push(null);
  return entries;
}

function getContiguousRuns(
  edges: Array<GrassableEdge | null>,
): GrassableEdge[][] {
  if (edges.every(Boolean)) {
    return [edges.filter((edge): edge is GrassableEdge => Boolean(edge))];
  }

  const startIndex = edges.findIndex(
    (edge, index) => edge && !edges[(index - 1 + edges.length) % edges.length],
  );
  if (startIndex === -1) return [];

  const runs: GrassableEdge[][] = [];
  let currentRun: GrassableEdge[] = [];

  for (let offset = 0; offset < edges.length; offset += 1) {
    const edge = edges[(startIndex + offset) % edges.length];
    if (edge) {
      currentRun.push(edge);
      continue;
    }

    if (currentRun.length > 0) {
      runs.push(currentRun);
      currentRun = [];
    }
  }

  if (currentRun.length > 0) runs.push(currentRun);
  return runs;
}

function generateGrassForEdgeRun(
  run: GrassableEdge[],
  options: AutoGrassOptions,
): Polygon | null {
  const firstEdge = run[0];
  const lastEdge = run[run.length - 1];
  if (!firstEdge || !lastEdge) return null;

  const visibleVertices = getVisibleVerticesForEdgeRun(run);
  const totalRunLength = run.reduce((sum, edge) => sum + edge.length, 0);
  const startInset = Math.min(
    options.endInset,
    firstEdge.length,
    totalRunLength / 2,
  );
  const endInset = Math.min(
    options.endInset,
    lastEdge.length,
    totalRunLength - startInset,
  );

  visibleVertices[0] = {
    x: visibleVertices[0]!.x + firstEdge.direction.x * startInset,
    y: visibleVertices[0]!.y + firstEdge.direction.y * startInset,
  } as Position;

  const lastIndex = visibleVertices.length - 1;
  visibleVertices[lastIndex] = {
    x: visibleVertices[lastIndex]!.x - lastEdge.direction.x * endInset,
    y: visibleVertices[lastIndex]!.y - lastEdge.direction.y * endInset,
  } as Position;

  return {
    grass: true,
    grassDepth: options.depth,
    vertices: [
      ...visibleVertices,
      { ...visibleVertices[visibleVertices.length - 1]! } as Position,
    ],
  } as Polygon;
}

function getVisibleVerticesForEdgeRun(run: GrassableEdge[]): Position[] {
  const visibleVertices = [run[0]!.visibleStart];

  for (let index = 1; index < run.length; index += 1) {
    visibleVertices.push(getOffsetLineJoin(run[index - 1]!, run[index]!));
  }

  visibleVertices.push(run[run.length - 1]!.visibleEnd);
  return visibleVertices;
}

function getOffsetLineJoin(
  previousEdge: GrassableEdge,
  nextEdge: GrassableEdge,
): Position {
  const cross =
    previousEdge.direction.x * nextEdge.direction.y -
    previousEdge.direction.y * nextEdge.direction.x;

  if (Math.abs(cross) < Number.EPSILON) {
    return previousEdge.visibleEnd;
  }

  const dx = nextEdge.visibleStart.x - previousEdge.visibleStart.x;
  const dy = nextEdge.visibleStart.y - previousEdge.visibleStart.y;
  const previousT =
    (dx * nextEdge.direction.y - dy * nextEdge.direction.x) / cross;

  return {
    x: previousEdge.visibleStart.x + previousEdge.direction.x * previousT,
    y: previousEdge.visibleStart.y + previousEdge.direction.y * previousT,
  } as Position;
}

function edgeHasGrassClearance({
  point,
  surfaceNormal,
  polygons,
}: {
  point: Position;
  surfaceNormal: Position;
  polygons: Polygon[];
}) {
  const above = {
    x: point.x - surfaceNormal.x * SURFACE_TEST_OFFSET,
    y: point.y - surfaceNormal.y * SURFACE_TEST_OFFSET,
  };
  const below = {
    x: point.x + surfaceNormal.x * SURFACE_TEST_OFFSET,
    y: point.y + surfaceNormal.y * SURFACE_TEST_OFFSET,
  };

  if (isWorldPointInGroundRegion(above, polygons)) return false;
  if (!isWorldPointInGroundRegion(below, polygons)) return false;
  return true;
}

function getGrassableSpans({
  from,
  to,
  length,
  direction,
  polygons,
}: {
  from: Position;
  to: Position;
  length: number;
  direction: Position;
  polygons: Polygon[];
}): GrassableSpan[] {
  const intervalCount = Math.max(3, Math.ceil(length / SAMPLE_SPACING));
  const surfaceNormal = getDownwardSurfaceNormal({ from, to, length });
  const spans: GrassableSpan[] = [];
  let spanStartIndex: number | null = null;

  for (
    let intervalIndex = 0;
    intervalIndex < intervalCount;
    intervalIndex += 1
  ) {
    const t = (intervalIndex + 0.5) / intervalCount;
    const point = {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    };
    const hasClearance = edgeHasGrassClearance({
      point,
      surfaceNormal,
      polygons,
    });

    if (hasClearance) {
      spanStartIndex ??= intervalIndex;
      continue;
    }

    if (spanStartIndex != null) {
      spans.push(
        createGrassableSpan({
          from,
          to,
          direction,
          startT: spanStartIndex / intervalCount,
          endT: intervalIndex / intervalCount,
        }),
      );
      spanStartIndex = null;
    }
  }

  if (spanStartIndex != null) {
    spans.push(
      createGrassableSpan({
        from,
        to,
        direction,
        startT: spanStartIndex / intervalCount,
        endT: 1,
      }),
    );
  }

  return spans;
}

function createGrassableSpan({
  from,
  to,
  direction,
  startT,
  endT,
}: {
  from: Position;
  to: Position;
  direction: Position;
  startT: number;
  endT: number;
}): GrassableSpan {
  const visibleStart = {
    x: from.x + (to.x - from.x) * startT,
    y: from.y + (to.y - from.y) * startT,
  };
  const visibleEnd = {
    x: from.x + (to.x - from.x) * endT,
    y: from.y + (to.y - from.y) * endT,
  };

  return {
    visibleStart,
    visibleEnd,
    direction,
    surfaceNormal: getDownwardSurfaceNormal({
      from,
      to,
      length: Math.hypot(to.x - from.x, to.y - from.y),
    }),
    length: Math.hypot(
      visibleEnd.x - visibleStart.x,
      visibleEnd.y - visibleStart.y,
    ),
    startT,
    endT,
  };
}

function getDownwardSurfaceNormal({
  from,
  to,
  length,
}: {
  from: Position;
  to: Position;
  length: number;
}) {
  const normal = {
    x: -(to.y - from.y) / length,
    y: (to.x - from.x) / length,
  };

  return normal.y >= 0 ? normal : { x: -normal.x, y: -normal.y };
}
