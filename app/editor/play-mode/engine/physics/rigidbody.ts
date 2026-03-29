/**
 * Rigidbody interface - ported from physics_init.h
 */
import { Vec2 } from "../core/vec2";

export interface Rigidbody {
  rotation: number;
  angularVelocity: number;
  radius: number;
  mass: number;
  inertia: number;
  r: Vec2;
  v: Vec2;
}
