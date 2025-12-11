import { Tool } from "./tool-interface";
import type { EventContext } from "../helpers/event-handler";
import type { EditorStore } from "../editor-store";
import { defaultTools } from "./default-tools";
import { Gravity, type Apple, type AppleAnimation } from "../elma-types";
import type { LgrAssets } from "~/components/lgr-assets";
import { drawGravityArrow, drawObject } from "../draw-object";

export type AppleToolState = { animation: AppleAnimation; gravity: Gravity };

export const defaultAppleState: AppleToolState = {
  animation: 1,
  gravity: Gravity.None,
};

export class AppleTool extends Tool<AppleToolState> {
  readonly meta = defaultTools.apple;

  constructor(store: EditorStore) {
    super(store);
  }

  onActivate() {
    const { toolState, setToolState } = this.getState();
    if (!toolState) {
      setToolState(defaultAppleState);
    }
  }

  onPointerDown(_event: PointerEvent, context: EventContext): boolean {
    const { state, toolState } = this.getState();
    if (!toolState) return false;
    const position = context.worldPos;
    state.actions.addApple({ position, ...toolState });
    return true;
  }

  onKeyDown(event: KeyboardEvent) {
    const { setToolState } = this.getState();
    switch (event.key.toUpperCase()) {
      case "W":
        setToolState({ gravity: Gravity.Up });
        return true;
      case "A":
        setToolState({ gravity: Gravity.Down });
        return true;
      case "S":
        setToolState({ gravity: Gravity.Left });
        return true;
      case "D":
        setToolState({ gravity: Gravity.Right });
        return true;
      case "E":
        setToolState({ gravity: Gravity.None });
        return true;
      case "1":
        setToolState({ animation: 1 });
        return true;
      case "2":
        setToolState({ animation: 2 });
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
        drawObject({
          ctx,
          sprite,
          position: apple.position,
          opacity: 0.5,
        });
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
    const { state, toolState } = this.getState();
    if (!state.mouseOnCanvas || !toolState) return {};
    const position = state.mousePosition;
    const apple: Apple = { position, ...toolState };
    return { apples: [apple] };
  }
}

export class KillerTool extends Tool {
  readonly meta = defaultTools.killer;

  constructor(store: EditorStore) {
    super(store);
  }

  onPointerDown(_event: PointerEvent, context: EventContext): boolean {
    const { state } = this.getState();
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
    const { state } = this.getState();
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
    const { state } = this.getState();
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
    const { state } = this.getState();
    if (!state.mouseOnCanvas) return {};
    return { flowers: [state.mousePosition] };
  }
}
