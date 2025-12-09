import { Tool } from "./tool-interface";
import type { EventContext } from "../utils/event-handler";
import type { EditorStore } from "../editor-store";
import { defaultTools } from "./default-tools";
import { Gravity } from "elmajs";
import type { Apple, AppleAnimation } from "../editor.types";
import type { LgrAssets } from "~/components/lgr-assets";
import { drawGravityArrow, drawObject } from "../draw-object";

export type AppleToolState = { animation: AppleAnimation; gravity: Gravity };

export const defaultAppleState: AppleToolState = {
  animation: 1,
  gravity: Gravity.None,
};

export class AppleTool extends Tool {
  readonly meta = defaultTools.apple;

  constructor(store: EditorStore) {
    super(store);
  }

  private getAppleState() {
    const state = this.store.getState();
    return (state.toolState.apple as AppleToolState) || defaultAppleState;
  }

  onPointerDown(_event: PointerEvent, context: EventContext): boolean {
    const state = this.store.getState();
    const position = context.worldPos;
    state.actions.addApple({ position, ...this.getAppleState() });
    return true;
  }

  onKeyDown(event: KeyboardEvent) {
    const state = this.store.getState();
    switch (event.key.toUpperCase()) {
      case "W":
        state.actions.setToolState(this.meta.id, { gravity: Gravity.Up });
        return true;
      case "A":
        state.actions.setToolState(this.meta.id, { gravity: Gravity.Down });
        return true;
      case "S":
        state.actions.setToolState(this.meta.id, { gravity: Gravity.Left });
        return true;
      case "D":
        state.actions.setToolState(this.meta.id, { gravity: Gravity.Right });
        return true;
      case "E":
        state.actions.setToolState(this.meta.id, { gravity: Gravity.None });
        return true;
      case "1":
        state.actions.setToolState(this.meta.id, { animation: 1 });
        return true;
      case "2":
        state.actions.setToolState(this.meta.id, { animation: 2 });
        return true;
      default:
        return false;
    }
  }

  onRender(ctx: CanvasRenderingContext2D, lgrAssets: LgrAssets) {
    const drafts = this.getDrafts();
    drafts.apples?.forEach((apple) => {
      const sprite = lgrAssets.getAppleSprite(apple.animation);
      if (sprite) {
        drawObject({ ctx, sprite, position: apple.position, opacity: 0.5 });
        drawGravityArrow({
          ctx,
          position: apple.position,
          gravity: apple.gravity,
          opacity: 0.5,
        });
      }
    });
  }

  getDrafts() {
    const state = this.store.getState();
    if (!state.mouseOnCanvas) return {};
    const position = state.mousePosition;
    const apple: Apple = { position, ...this.getAppleState() };
    return { apples: [apple] };
  }

  onActivate() {
    const state = this.store.getState();
    const toolState = state.toolState.apple as AppleToolState | undefined;
    if (!toolState) {
      state.actions.setToolState(this.meta.id, this.getAppleState());
    }
  }
}

export class KillerTool extends Tool {
  readonly meta = defaultTools.killer;

  constructor(store: EditorStore) {
    super(store);
  }

  onPointerDown(_event: PointerEvent, context: EventContext): boolean {
    const state = this.store.getState();
    state.actions.addKiller(context.worldPos);
    return true;
  }

  onRender(ctx: CanvasRenderingContext2D, lgrAssets: LgrAssets) {
    const drafts = this.getDrafts();
    const killerSprite = lgrAssets.getKillerSprite();
    if (killerSprite) {
      drafts.killers?.forEach((killer) => {
        drawObject({
          ctx,
          sprite: killerSprite,
          position: killer,
          opacity: 0.5,
        });
      });
    }
  }

  getDrafts() {
    const state = this.store.getState();
    if (!state.mouseOnCanvas) return {};
    return { killers: [state.mousePosition] };
  }
}

export class FlowerTool extends Tool {
  readonly meta = defaultTools.flower;

  constructor(store: EditorStore) {
    super(store);
  }

  onPointerDown(_event: PointerEvent, context: EventContext): boolean {
    const state = this.store.getState();
    state.actions.addFlower(context.worldPos);
    return true;
  }

  onRender(ctx: CanvasRenderingContext2D, lgrAssets: LgrAssets) {
    const drafts = this.getDrafts();
    const flowerSprite = lgrAssets.getFlowerSprite();
    if (flowerSprite) {
      drafts.flowers?.forEach((flower) => {
        drawObject({
          ctx,
          sprite: flowerSprite,
          position: flower,
          opacity: 0.5,
        });
      });
    }
  }

  getDrafts() {
    const state = this.store.getState();
    if (!state.mouseOnCanvas) return {};
    return { flowers: [state.mousePosition] };
  }
}
