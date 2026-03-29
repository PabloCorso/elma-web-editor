/**
 * 2D vector math - ported from vect2.h/cpp
 * All operations match the original C++ implementation exactly.
 */
export class Vec2 {
  x: number;
  y: number;

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  add(a: Vec2): Vec2 {
    return new Vec2(this.x + a.x, this.y + a.y);
  }

  sub(a: Vec2): Vec2 {
    return new Vec2(this.x - a.x, this.y - a.y);
  }

  /** Dot product */
  dot(a: Vec2): number {
    return this.x * a.x + this.y * a.y;
  }

  scale(s: number): Vec2 {
    return new Vec2(this.x * s, this.y * s);
  }

  rotate(rotation: number): Vec2 {
    const a = Math.sin(rotation);
    const b = Math.cos(rotation);
    return new Vec2(b * this.x - a * this.y, a * this.x + b * this.y);
  }

  /** Length using Newton-refined sqrt, matching original C++ behavior */
  length(): number {
    return squareRoot(this.x * this.x + this.y * this.y);
  }

  normalize(): Vec2 {
    const recip = 1 / this.length();
    return new Vec2(this.x * recip, this.y * recip);
  }

  clone(): Vec2 {
    return new Vec2(this.x, this.y);
  }
}

/** Newton-refined square root matching original C++ square_root() */
function squareRoot(a: number): number {
  if (a < 0) {
    return 1;
  }
  const x1 = Math.sqrt(a);
  if (x1 === 0) {
    return 0;
  }
  return 0.5 * (x1 + a / x1);
}

export const Vec2i = new Vec2(1.0, 0.0);
export const Vec2j = new Vec2(0.0, 1.0);

export function unitVector(a: Vec2): Vec2 {
  return a.scale(1 / a.length());
}

export function rotate90deg(v: Vec2): Vec2 {
  return new Vec2(-v.y, v.x);
}
