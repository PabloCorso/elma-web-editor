# ElastoMania Web Editor

A web-based level editor for ElastoMania, built with React, TypeScript, and Canvas.

## Architecture

This editor follows a clean separation of concerns:

- **React Components**: Handle UI/toolbar rendering
- **CanvasEngine**: Independent canvas rendering with `requestAnimationFrame`
- **Zustand Store**: Shared state management between React and Canvas
- **Canvas**: Renders once, outside React control

### Key Files

- `app/editor/useStore.ts` - Zustand store for shared state
- `app/editor/CanvasEngine.ts` - Canvas rendering engine (not React)
- `app/editor/CanvasView.tsx` - React shell to mount canvas once
- `app/components/sidebar.tsx` - Toolbar UI
- `app/routes/home.tsx` - Main app layout

## Features

- **Polygon Tool**: Click to add vertices, right-click to finish polygon
- **Apple Tool**: Click to place apples
- **Killer Tool**: Click to place killers
- **Flower Tool**: Click to place flowers (multiple exit points)
- **Select Tool**: Click to select objects (TODO: implement selection logic)

## Level Structure

- **Ground**: Dark purple background (#181048)
- **Sky**: Blue areas inside polygons (#3078bc)
- **Default Level**: 1000x600 world with a boundary polygon
- **Camera**: Starts centered on the level
- **Camera Controls**: 
  - **Mouse wheel** to pan up/down
  - **Shift + mouse wheel** to pan left/right
  - **Cmd/Ctrl + mouse wheel** to zoom in/out
  - Middle mouse drag to pan
  - WASD/Arrow keys to move
  - +/- to zoom in/out
  - Q to fit to view
  - Escape to cancel polygon drawing

## Development

```bash
npm install
npm run dev
```

## Building

```bash
npm run build
```

## How It Works

1. React renders the toolbar and mounts the canvas once
2. CanvasEngine takes control of the canvas and runs its own render loop
3. Zustand store acts as the bridge between React UI and canvas state
4. Canvas reads from store every frame and renders accordingly
5. User interactions update the store, which triggers canvas re-renders

This architecture ensures smooth 60fps rendering while keeping React focused on UI concerns.
