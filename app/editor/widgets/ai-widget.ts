import type { StoreApi } from "zustand/vanilla";
import type { EditorState } from "../editor-state";
import type { Position, Polygon } from "elmajs";
import type { UIMessage } from "ai";
import { Widget } from "./widget-interface";

export type AIToolState = {
  isChatOpen: boolean;
  messages: UIMessage[];
  isLoading: boolean;
  streamingMessage: string;
};

export class AIWidget extends Widget {
  readonly id = "ai";
  readonly name = "AI Assistant";
  readonly shortcut = "I";

  constructor(store: StoreApi<EditorState>) {
    super(store);
  }

  onActivate(): void {
    const state = this.store.getState();
    state.actions.setToolState<AIToolState>(this.id, {
      isChatOpen: true,
      messages: [],
      isLoading: false,
      streamingMessage: "",
    });
  }

  onDeactivate(): void {
    const state = this.store.getState();
    state.actions.setToolState<AIToolState>(this.id, {
      isChatOpen: false,
      messages: [],
      isLoading: false,
      streamingMessage: "",
    });
  }

  public addApples(apples: Position[]): void {
    const state = this.store.getState();
    for (const apple of apples) {
      state.actions.addApple({ position: apple, animation: 0, gravity: 0 });
    }
  }

  public addKillers(killers: Position[]): void {
    const state = this.store.getState();
    for (const killer of killers) {
      state.actions.addKiller(killer);
    }
  }

  public addFlowers(flowers: Position[]): void {
    const state = this.store.getState();
    for (const flower of flowers) {
      state.actions.addFlower(flower);
    }
  }

  public moveStart(start: Position): void {
    const state = this.store.getState();
    state.actions.setStart(start);
  }

  public addPolygons(polygons: Polygon[]): void {
    const state = this.store.getState();
    state.actions.setPolygons([...state.polygons, ...polygons]);
    state.actions.triggerFitToView();
  }

  public fitToView(): void {
    const state = this.store.getState();
    state.actions.triggerFitToView();
  }

  public setLevelName(name: string): void {
    const state = this.store.getState();
    state.actions.setLevelName(name);
  }
}
