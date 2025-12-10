import type { Gravity, Position, Picture as ElmaPicture } from "elmajs";

export type AppleAnimation = 1 | 2;

export type Apple = {
  position: Position;
  animation: AppleAnimation;
  gravity: Gravity;
};

export type Picture = Pick<ElmaPicture, "name" | "position">;
