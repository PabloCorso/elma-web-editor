import type { Gravity, Position } from "elmajs";

export type AppleAnimation = 1 | 2;

export type Apple = {
  position: Position;
  animation: AppleAnimation;
  gravity: Gravity;
};
