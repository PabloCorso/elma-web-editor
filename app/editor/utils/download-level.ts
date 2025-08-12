import { ObjectType, Gravity } from "elmajs";
import type { EditorState } from "../editor-store";

export async function downloadLevel(state: EditorState) {
  try {
    // Validate that we have at least some level data
    if (!state.polygons || state.polygons.length === 0) {
      throw new Error(
        "No polygons found in level. Please add some geometry before downloading."
      );
    }

    const elmajs = await import("elmajs");
    const { Level } = elmajs;

    // Ensure coordinates are floating point (not integers)
    function ensureFloatingPointPosition(pos: { x: number; y: number }) {
      return {
        x: Math.round(pos.x * 10) / 10,
        y: Math.round(pos.y * 10) / 10,
      };
    }

    const level = new Level();
    level.name = state.levelName || "Untitled";

    // Process polygons with floating point coordinates
    level.polygons = state.polygons.map((polygon) => ({
      ...polygon,
      vertices: polygon.vertices.map((vertex) =>
        ensureFloatingPointPosition(vertex)
      ),
    }));

    // Convert separate object arrays to elmajs objects array format
    const objects = [
      // Start position (type 4)
      {
        type: ObjectType.Start,
        position: ensureFloatingPointPosition(state.start),
        gravity: Gravity.None,
        animation: 1,
      },
      // Apples (type 2)
      ...state.apples.map((apple) => ({
        type: ObjectType.Apple,
        position: ensureFloatingPointPosition(apple.position),
        gravity: Gravity.None,
        animation: 1,
      })),
      // Killers (type 3)
      ...state.killers.map((pos) => ({
        type: ObjectType.Killer,
        position: ensureFloatingPointPosition(pos),
        gravity: Gravity.None,
        animation: 1,
      })),
      // Flowers (type 1)
      ...state.flowers.map((pos) => ({
        type: ObjectType.Exit,
        position: ensureFloatingPointPosition(pos),
        gravity: Gravity.None,
        animation: 1,
      })),
    ];

    level.objects = objects;
    level.integrity = level.calculateIntegrity();

    const buffer = level.toBuffer();

    // Create a blob and download it
    const blob = new Blob([buffer as any], {
      type: "application/octet-stream",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${level.name}.lev`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error in downloadLevel:", error);
    throw new Error(
      `Failed to create level file: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
