import elmajs from "elmajs";

const { Level } = elmajs;

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const levelName = formData.get("level-name") as string;
  const levelJson = formData.get("level-data") as string;

  if (!levelJson) {
    throw new Response("Level data is required", { status: 400 });
  }

  try {
    const levelData = JSON.parse(levelJson);
    
    // Create level using elmajs
    const level = new Level();
    level.name = levelName || "Untitled";
    
    // Scale down polygons (reverse the scale factor used in importer)
    const scaleFactor = 1/20;
    level.polygons = levelData.polygons.map((polygon: any) => ({
      ...polygon,
      vertices: polygon.vertices.map((vertex: any) => ({
        x: vertex.x * scaleFactor,
        y: vertex.y * scaleFactor,
      })),
    }));
    
    // Convert separate object arrays to elmajs objects array format
    const objects = [
      // Start position (type 4)
      { type: 4, position: { x: levelData.start.x * scaleFactor, y: levelData.start.y * scaleFactor }, gravity: 0, animation: 0 },
      // Apples (type 2)
      ...levelData.apples.map((pos: any) => ({ type: 2, position: { x: pos.x * scaleFactor, y: pos.y * scaleFactor }, gravity: 0, animation: 0 })),
      // Killers (type 3)
      ...levelData.killers.map((pos: any) => ({ type: 3, position: { x: pos.x * scaleFactor, y: pos.y * scaleFactor }, gravity: 0, animation: 0 })),
      // Flowers (type 1)
      ...levelData.flowers.map((pos: any) => ({ type: 1, position: { x: pos.x * scaleFactor, y: pos.y * scaleFactor }, gravity: 0, animation: 0 })),
    ];
    
    level.objects = objects;
    level.integrity = level.calculateIntegrity();
    
    const buffer = level.toBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${levelName || 'untitled'}.lev"`,
      },
    });
  } catch (error) {
    console.error("Error creating level file:", error);
    throw new Response("Failed to create level file", { status: 500 });
  }
}

// This route doesn't need a default export since it's just for the action
export default function Download() {
  return null;
}
