# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

### Fixed

### Changed

### Removed

## 2025-11-27

## Fixed

- Fixed vertex being truncated on download, making close vertices end up with the same coordinates causing internal errors.

Thanks to `@Markku` for identifying and reporting this issue.

## 2025-11-26

### Added

- File session now tracks file handles using [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API)
- Supports save/save-as via the picker with permission checks, and falls back to download when pickers are unavailable.

### Fixed

- Save flow now requests write permission and gracefully falls back to download when saving to disk is blocked.

### Changed

- Canvas resizing is now batched and preserves the bitmap to avoid flicker while keeping the view fitted to the container.

### Removed

- Chat/OpenAI toggle controls are hidden to declutter the editor UI when the feature is not in use.

## 2025-11-25

### Changed

- Hid the chat button for now to declutter the editor UI.
- Updated the file session flow to align picker prompts and save handling.

## 2025-11-24

### Changed

- Renamed a few editor pieces for consistency and merged AI tool work from PR #1.
- Applied a handful of polish fixes around layout and interactions.

## 2025-08-21

### Added

- Initial tests with AI assistant integration for level editing. Here is a horse made with AI:
  ![AI Horse](./docs/ai-horse.png)

## 2025-08-03

### Added

- ToolRegistry introduced for polygon, selection, and object tools.
- Built-in levels dialog with search/filter and classic desktop-focused sidebar layout.

### Changed

- Large EditorEngine refactor for utility-driven event handling, camera ops, and rendering.

### Removed

- Removed mobile support until the editor is more mature as it adds too much complexity at the moment.

## 2025-08-02

### Added

- Finished polygon-on-click behavior using vertex proximity
- Download and import level support.
- Hand tool with keyboard/mouse/touch panning.

### Changed

- Camera panning corrected, sprite positioning tweaked, and selection deletion enabled.
- Sidebar enhanced with shortcuts, search, and better tool display; improved camera/selection handling.
- Debug mode in EditorEngine for polygon orientation, with clearer sidebar title.

## 2025-08-01

### Added

- Base level editor scaffolded (create-react-router initial commit plus core editor setup).
