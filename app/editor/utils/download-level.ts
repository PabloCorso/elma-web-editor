import type { EditorState } from "../editor-store";

export async function downloadLevel(state: EditorState) {
  const elmajs = await import("elmajs");
  const { Level } = elmajs;

  const level = new Level();
  level.name = "Untitled"; // Default name since levelName doesn't exist in EditorState

  level.polygons = state.polygons;
  // Convert separate object arrays to elmajs objects array format
  const objects = [
    // Start position (type 4)
    {
      type: 4,
      position: { x: state.start.x, y: state.start.y },
      gravity: 0,
      animation: 0,
    },
    // Apples (type 2)
    ...state.apples.map((pos) => ({
      type: 2,
      position: { x: pos.x, y: pos.y },
      gravity: 0,
      animation: 0,
    })),
    // Killers (type 3)
    ...state.killers.map((pos) => ({
      type: 3,
      position: { x: pos.x, y: pos.y },
      gravity: 0,
      animation: 0,
    })),
    // Flowers (type 1)
    ...state.flowers.map((pos) => ({
      type: 1,
      position: { x: pos.x, y: pos.y },
      gravity: 0,
      animation: 0,
    })),
  ];

  level.objects = objects;
  level.integrity = level.calculateIntegrity();

  const buffer = level.toBuffer();

  // Create a blob and download it
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${level.name}.lev`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
