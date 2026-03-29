/**
 * Level data structures - ported from level.h, polygon.h, object.h
 */
import { Vec2 } from "../core/vec2";

export type ObjectType = "exit" | "food" | "killer" | "start";
export type ObjectProperty =
  | "none"
  | "gravity_up"
  | "gravity_down"
  | "gravity_left"
  | "gravity_right";

export interface GameObject {
  r: Vec2;
  type: ObjectType;
  property: ObjectProperty;
  animation: number;
  active: boolean;
  floatingPhase: number;
}

export interface Polygon {
  vertices: Vec2[];
  isGrass: boolean;
}

interface Sprite {
  r: Vec2;
  pictureName: string;
  maskName: string;
  textureName: string;
  clipping: number;
  distance: number;
}

interface TopTen {
  timesCount: number;
  times: number[];
  names1: string[];
  names2: string[];
}

interface TopTenSet {
  single: TopTen;
  multi: TopTen;
}

export interface LevelData {
  levelId: number;
  levelName: string;
  lgrName: string;
  foregroundName: string;
  backgroundName: string;
  polygons: Polygon[];
  objects: GameObject[];
  sprites: Sprite[];
  topTens: TopTenSet;
  topologyErrors: boolean;
}

/** Sort objects: Killer, Food, Exit, Start */
export function sortObjects(objects: GameObject[]): void {
  const order = (type: ObjectType): number => {
    switch (type) {
      case "killer":
        return 1;
      case "food":
        return 2;
      case "exit":
        return 3;
      case "start":
        return 10;
    }
  };
  objects.sort((a, b) => order(a.type) - order(b.type));
}

/** Initialize objects for gameplay: find start, offset bike, count apples */
export function initializeObjects(
  objects: GameObject[],
  leftWheelR: Vec2,
): { appleCount: number; offset: Vec2 } {
  let appleCount = 0;
  let offset = new Vec2(0, 0);
  let startFound = false;

  for (const obj of objects) {
    obj.floatingPhase = Math.random() * 2.0 * Math.PI;
    obj.active = true;

    if (obj.type === "food") appleCount++;
    if (obj.type === "start") {
      if (startFound) throw new Error("Level has multiple Start objects");
      startFound = true;
      obj.active = false;
      offset = obj.r.sub(leftWheelR);
    }
  }

  if (!startFound) throw new Error("Level has no Start object");
  return { appleCount, offset };
}
