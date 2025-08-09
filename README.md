# ElastoMania Web Editor - Project Overview

## Main Concept

This project is a **web-based level editor for ElastoMania**, a classic 2D motorcycle physics game. ElastoMania uses `.lev` files to define levels, which contain polygon geometry and game objects like apples, killers, flowers (exits), and start positions. This editor allows users to create, edit, and export these levels directly in the browser.

## Core Architecture

The project uses a **hybrid React + Canvas architecture** designed for high-performance real-time editing:

- **React Layer**: Handles UI components (toolbar, sidebar, controls)
- **Canvas Layer**: Independent rendering engine with `requestAnimationFrame` for smooth 60fps graphics
- **Zustand Store**: Acts as a bridge between React UI and Canvas, managing shared state
- **ElmaJS Integration**: Uses the `elmajs` library to parse/export native `.lev` files

## Key Components

### State Management (`app/editor/editor-store.ts`)

- Zustand-based store managing level data (polygons, objects, camera, tools)
- Tool-specific state for polygon drawing, object selection, etc.
- Camera system with viewport offset and zoom controls

### Rendering Engine (`app/editor/editor-engine.ts`)

- Independent Canvas-based renderer outside React control
- Handles sprites, polygons, objects, and UI overlays
- Manages camera transformations and viewport calculations

### Tool System (`app/editor/tools/`)

- Extensible tool architecture for different editing modes
- Polygon tool: Click to add vertices, create level geometry
- Object tools: Place apples (collectibles), killers (hazards), flowers (exits)
- Selection tool: Select and manipulate existing elements

### Level Import/Export (`app/editor/level-importer.ts`)

- Imports `.lev` files using elmajs library
- Scales coordinates (elmajs uses small coordinates, editor uses larger for visibility)
- Exports back to native `.lev` format for use in ElastoMania

## ElastoMania Context

- **ElastoMania**: Classic 2D motorcycle physics game where players navigate challenging levels
- **Level Structure**: Polygons define solid ground/walls, sky areas are inside polygons
- **Game Objects**:
  - Apples: Collectible items
  - Killers: Deadly obstacles that reset the player
  - Flowers: Exit points to complete the level
  - Start: Player spawn position
- **Visual Style**: Distinctive purple ground (#181048) and blue sky (#3078bc)

## Technical Stack

- **React 18** with React Router 7 for UI
- **TypeScript** for type safety
- **Canvas API** for high-performance graphics
- **Zustand** for state management
- **ElmaJS** library for `.lev` file handling
- **Tailwind CSS** for styling
- **Vite** for build tooling

## Open Source & Extensibility Philosophy

This project is designed with **open source extensibility** as a core principle. Every API and architecture decision should enable developers to easily create their own editor experiences.

### API Design Principles

- **Intuitive APIs**: All public interfaces should be self-documenting and follow common patterns
- **Modular Architecture**: Components should be composable and replaceable
- **Plugin System**: Tool system designed for easy extension without core modifications
- **Clean Abstractions**: Clear separation between core engine and UI implementation
- **TypeScript First**: Full type safety for excellent developer experience

### Extensibility Patterns

#### Tool System (`app/editor/tools/`)

- **Plugin Architecture**: New tools can be added by implementing the `Tool` interface
- **State Isolation**: Each tool manages its own state in the store
- **Event Handling**: Standardized mouse/keyboard event patterns
