import { useStore } from "../useStore";

export function updateCamera(
  deltaX: number,
  deltaY: number,
  panSpeed: number = 1.0
) {
  const currentCamera = useStore.getState();
  useStore
    .getState()
    .setCamera(
      currentCamera.viewPortOffset.x + deltaX * panSpeed,
      currentCamera.viewPortOffset.y + deltaY * panSpeed
    );
}

export function updateZoom(
  newZoom: number,
  minZoom: number,
  maxZoom: number,
  mouseX?: number,
  mouseY?: number
) {
  const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
  const currentZoom = useStore.getState().zoom;

  if (clampedZoom !== currentZoom) {
    useStore.getState().setZoom(clampedZoom);

    // Adjust viewport to keep mouse position fixed if coordinates provided
    if (mouseX !== undefined && mouseY !== undefined) {
      adjustViewportForZoom(mouseX, mouseY, currentZoom, clampedZoom);
    }
  }
}

function adjustViewportForZoom(
  mouseX: number,
  mouseY: number,
  oldZoom: number,
  newZoom: number
) {
  const store = useStore.getState();

  // Convert screen coordinates to world coordinates
  const worldX = (mouseX - store.viewPortOffset.x) / oldZoom;
  const worldY = (mouseY - store.viewPortOffset.y) / oldZoom;

  // Calculate new camera offset to keep the same world position under the mouse
  const newOffsetX = mouseX - worldX * newZoom;
  const newOffsetY = mouseY - worldY * newZoom;

  useStore.getState().setCamera(newOffsetX, newOffsetY);
}

export function fitToView(
  canvas: HTMLCanvasElement,
  polygons: any[],
  minZoom: number,
  maxZoom: number
) {
  const levelWidth = 1000;
  const levelHeight = 600;

  if (polygons.length === 0) {
    // Center on the level bounds
    const centerX = canvas.width / 2 - levelWidth / 2;
    const centerY = canvas.height / 2 - levelHeight / 2;
    useStore.getState().setCamera(centerX, centerY);
    useStore.getState().setZoom(1);
    return;
  }

  // Find bounding box of all polygons
  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;

  polygons.forEach((polygon) => {
    polygon.vertices.forEach((vertex: any) => {
      minX = Math.min(minX, vertex.x);
      minY = Math.min(minY, vertex.y);
      maxX = Math.max(maxX, vertex.x);
      maxY = Math.max(maxY, vertex.y);
    });
  });

  // Add padding
  const padding = 50;
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
  const newZoom = Math.min(zoomX, zoomY, maxZoom);

  // Set camera and zoom
  const viewPortX = canvas.width / 2 - centerX * newZoom;
  const viewPortY = canvas.height / 2 - centerY * newZoom;
  useStore.getState().setCamera(viewPortX, viewPortY);
  useStore.getState().setZoom(Math.max(minZoom, newZoom));
}
