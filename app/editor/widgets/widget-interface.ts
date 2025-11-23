import type { StoreApi } from "zustand/vanilla";
import type { EditorState } from "../editor-state";

export abstract class Widget {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly shortcut?: string;

  constructor(protected store: StoreApi<EditorState>) {}

  // Lifecycle
  onActivate?(): void;
  onDeactivate?(): void;
  clear?(): void;
}
