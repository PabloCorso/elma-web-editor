export function updateCamera({
  deltaX,
  deltaY,
  currentOffset,
  setCamera,
  panSpeed,
}: {
  deltaX: number;
  deltaY: number;
  currentOffset: { x: number; y: number };
  setCamera: (x: number, y: number) => void;
  panSpeed: number;
}) {
  setCamera(
    currentOffset.x + deltaX * panSpeed,
    currentOffset.y + deltaY * panSpeed
  );
}

export function updateZoom({
  newZoom,
  minZoom,
  maxZoom,
  currentZoom,
  setZoom,
  mousePosition,
  currentOffset,
  setCamera,
}: {
  newZoom: number;
  minZoom: number;
  maxZoom: number;
  currentZoom: number;
  setZoom: (zoom: number) => void;
  mousePosition?: { x: number; y: number };
  currentOffset?: { x: number; y: number };
  setCamera?: (x: number, y: number) => void;
}) {
  const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));

  if (clampedZoom !== currentZoom) {
    setZoom(clampedZoom);

    // Adjust viewport to keep mouse position fixed if coordinates provided
    if (mousePosition && currentOffset && setCamera) {
      adjustViewportForZoom({
        mouseX: mousePosition.x,
        mouseY: mousePosition.y,
        oldZoom: currentZoom,
        newZoom: clampedZoom,
        currentOffset,
        setCamera,
      });
    }
  }
}

function adjustViewportForZoom({
  mouseX,
  mouseY,
  oldZoom,
  newZoom,
  currentOffset,
  setCamera,
}: {
  mouseX: number;
  mouseY: number;
  oldZoom: number;
  newZoom: number;
  currentOffset: { x: number; y: number };
  setCamera: (x: number, y: number) => void;
}) {
  // Convert screen coordinates to world coordinates
  const worldX = (mouseX - currentOffset.x) / oldZoom;
  const worldY = (mouseY - currentOffset.y) / oldZoom;

  // Calculate new camera offset to keep the same world position under the mouse
  const newOffsetX = mouseX - worldX * newZoom;
  const newOffsetY = mouseY - worldY * newZoom;

  setCamera(newOffsetX, newOffsetY);
}

export function fitToView({
  canvas,
  polygons,
  apples,
  killers,
  flowers,
  start,
  minZoom,
  maxZoom,
  setCamera,
  setZoom,
}: {
  canvas: HTMLCanvasElement;
  polygons: any[];
  apples: any[];
  killers: any[];
  flowers: any[];
  start: any;
  minZoom: number;
  maxZoom: number;
  setCamera: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;
}) {
  // Find bounding box of all polygons and objects
  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;

  // Check polygons
  polygons.forEach((polygon) => {
    polygon.vertices.forEach((vertex: any) => {
      minX = Math.min(minX, vertex.x);
      minY = Math.min(minY, vertex.y);
      maxX = Math.max(maxX, vertex.x);
      maxY = Math.max(maxY, vertex.y);
    });
  });

  // Check all objects
  const allObjects = [...apples, ...killers, ...flowers, start];

  allObjects.forEach((obj) => {
    if (obj && typeof obj.x === "number" && typeof obj.y === "number") {
      minX = Math.min(minX, obj.x);
      minY = Math.min(minY, obj.y);
      maxX = Math.max(maxX, obj.x);
      maxY = Math.max(maxY, obj.y);
    }
  });

  // If no polygons and no objects, center on origin
  if (minX === Infinity || maxX === -Infinity) {
    setCamera(canvas.width / 2, canvas.height / 2);
    setZoom(Math.max(minZoom, Math.min(maxZoom, 1)));
    return;
  }

  // Add padding
  const padding = 2;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  // Calculate center and size
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const polygonWidth = maxX - minX;
  const polygonHeight = maxY - minY;

  // Calculate optimal zoom
  const zoomX = (canvas.width * 0.9) / polygonWidth;
  const zoomY = (canvas.height * 0.9) / polygonHeight;
  const newZoom = Math.max(minZoom, Math.min(maxZoom, Math.min(zoomX, zoomY)));

  // Set camera and zoom
  const viewPortX = canvas.width / 2 - centerX * newZoom;
  const viewPortY = canvas.height / 2 - centerY * newZoom;
  setCamera(viewPortX, viewPortY);
  setZoom(newZoom);
}
