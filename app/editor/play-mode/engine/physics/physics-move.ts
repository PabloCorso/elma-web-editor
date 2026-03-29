/**
 * Physics movement / collision response - ported from physics_move.cpp
 * Euler integration with 3 collision response modes.
 */
import { Vec2, rotate90deg } from '../core/vec2';
import {
  GROUND_ESCAPE_VELOCITY,
  WHEEL_DEFORMATION_LENGTH,
  BUMP_THRESHOLD,
  SPRING_TENSION_COEFFICIENT,
  SPRING_RESISTANCE_COEFFICIENT,
  BODY_DY,
} from '../core/constants';
import type { Rigidbody } from './rigidbody';
import type { MotorState } from './motor-state';
import { getTwoAnchorPoints } from './physics-collision';
import type { Segments } from './segments';
import { WavEvent, type EventBuffer } from '../game/event-buffer';

/** Push wheel out of ground so it stands on the anchor point */
function moveWheelOutOfGround(rb: Rigidbody, point: Vec2): void {
  const diff = rb.r.sub(point);
  const len = diff.length();
  const n = diff.scale(1.0 / len);
  if (len < rb.radius - WHEEL_DEFORMATION_LENGTH) {
    rb.r = rb.r.add(n.scale(rb.radius - WHEEL_DEFORMATION_LENGTH - len));
  }
}

/** Handle collision between wheel and one anchor point. Returns true if collision. */
function simulateAnchorPointCollision(
  rb: Rigidbody,
  point: Vec2,
  force: Vec2,
  eventBuffer: EventBuffer
): boolean {
  const diff = rb.r.sub(point);
  const len = diff.length();
  const n = diff.scale(1.0 / len);

  if (n.dot(rb.v) > -GROUND_ESCAPE_VELOCITY && n.dot(force) > 0) {
    return false;
  }

  // Remove velocity component parallel to wheel-point axis
  const deletedVelocity = n.scale(n.dot(rb.v));
  rb.v = rb.v.sub(deletedVelocity);

  // Bump sound
  let bumpMagnitude = deletedVelocity.length();
  if (bumpMagnitude > BUMP_THRESHOLD) {
    bumpMagnitude = bumpMagnitude / 0.8 * 0.1;
    if (bumpMagnitude >= 0.99) bumpMagnitude = 0.99;
    eventBuffer.add(WavEvent.Bump, bumpMagnitude, -1);
  }

  return true;
}

/** Check stuck condition: force-based (original Across method, for low speed) */
function validAnchorPointsOld(
  point1: Vec2,
  point2: Vec2,
  rb: Rigidbody,
  force: Vec2,
  torque: number
): boolean {
  const len = rb.r.sub(point2).length();
  const n = rb.r.sub(point2).scale(1.0 / len);
  const n90 = rotate90deg(n);

  const totalTorque = torque + len * n90.dot(force);
  return !((point1.sub(point2)).dot(n90) * totalTorque < 0);
}

/** Check stuck condition: velocity-based (Elma method, for high speed) */
function validAnchorPointsNew(
  point1: Vec2,
  point2: Vec2,
  rb: Rigidbody
): boolean {
  const len = rb.r.sub(point2).length();
  const n = rb.r.sub(point2).scale(1.0 / len);
  const n90 = rotate90deg(n);

  const speedDirection = rb.angularVelocity + len * n90.dot(rb.v);
  return !((point1.sub(point2)).dot(n90) * speedDirection < 0);
}

/**
 * Handle wheel/bike rigidbody movement with collision.
 * doCollision = true for wheels (solid objects), false for bike frame.
 */
export function rigidbodyMovement(
  rb: Rigidbody,
  force: Vec2,
  torque: number,
  dt: number,
  doCollision: boolean,
  segments: Segments,
  eventBuffer: EventBuffer
): void {
  let anchorPointCount = 0;
  let point1 = new Vec2();
  let point2 = new Vec2();

  if (doCollision) {
    const result = getTwoAnchorPoints(segments, rb.r, rb.radius);
    anchorPointCount = result.count;
    point1 = result.point1;
    point2 = result.point2;
  }

  // Move wheel out of ground
  if (anchorPointCount > 0) moveWheelOutOfGround(rb, point1);
  if (anchorPointCount > 1) moveWheelOutOfGround(rb, point2);

  // Two-point stuck discrimination: high speed uses velocity check
  if (anchorPointCount === 2 && rb.v.length() > 1.0) {
    if (!validAnchorPointsNew(point1, point2, rb)) {
      anchorPointCount = 1;
      point1 = point2;
    } else if (!validAnchorPointsNew(point2, point1, rb)) {
      anchorPointCount = 1;
    }
  }

  // Two-point stuck discrimination: low speed uses force check
  if (anchorPointCount === 2 && rb.v.length() < 1.0) {
    if (!validAnchorPointsOld(point1, point2, rb, force, torque)) {
      anchorPointCount = 1;
      point1 = point2;
    } else if (!validAnchorPointsOld(point2, point1, rb, force, torque)) {
      anchorPointCount = 1;
    }
  }

  // Check if anchor points produce actual collisions
  if (anchorPointCount === 2) {
    if (!simulateAnchorPointCollision(rb, point2, force, eventBuffer)) {
      anchorPointCount = 1;
    }
  }
  if (anchorPointCount >= 1) {
    if (!simulateAnchorPointCollision(rb, point1, force, eventBuffer)) {
      if (anchorPointCount === 2) {
        anchorPointCount = 1;
        point1 = point2;
      } else {
        anchorPointCount = 0;
      }
    }
  }

  // No collision: free flight
  if (anchorPointCount === 0) {
    const angularAcceleration = torque / rb.inertia;
    rb.angularVelocity += angularAcceleration * dt;
    rb.rotation += rb.angularVelocity * dt;
    const a = force.scale(1.0 / rb.mass);
    rb.v = rb.v.add(a.scale(dt));
    rb.r = rb.r.add(rb.v.scale(dt));
    return;
  }

  // Two contacts: stuck
  if (anchorPointCount === 2) {
    rb.v = new Vec2(0, 0);
    rb.angularVelocity = 0;
    return;
  }

  // One contact: rolling
  const len = rb.r.sub(point1).length();
  const n = rb.r.sub(point1).scale(1.0 / len);
  const n90 = rotate90deg(n);

  rb.angularVelocity = rb.v.dot(n90) * (1.0 / rb.radius);
  torque += force.dot(n90) * rb.radius;

  // Parallel axis theorem
  const inertiaEdge = rb.inertia + rb.mass * len * len;
  const angularAcceleration = torque / inertiaEdge;

  rb.angularVelocity += angularAcceleration * dt;
  rb.rotation += rb.angularVelocity * dt;
  rb.v = n90.scale(rb.angularVelocity * rb.radius);
  rb.r = rb.r.add(rb.v.scale(dt));
}

/** Teleport body to be within acceptable boundaries */
function bodyBoundaries(mot: MotorState, i: Vec2, j: Vec2): void {
  let bodyX: number;
  let bodyY: number;

  if (mot.flippedBike) {
    bodyX = i.dot(mot.bike.r.sub(mot.bodyR));
    bodyY = j.dot(mot.bodyR.sub(mot.bike.r));
  } else {
    bodyX = i.dot(mot.bodyR.sub(mot.bike.r));
    bodyY = j.dot(mot.bodyR.sub(mot.bike.r));
  }

  // Restrict bottom with a diagonal line
  const linePoint = new Vec2(-0.35, 0.13);
  const lineSlope = new Vec2(0.14 - (-0.35), 0.36 - 0.13);
  const lineSlopeOrtho = new Vec2(-lineSlope.y, lineSlope.x);
  const lineSlopeOrthoLen = lineSlopeOrtho.length();
  const lineSlopeOrthoUnit = lineSlopeOrtho.scale(1.0 / lineSlopeOrthoLen);

  const bodyR = new Vec2(bodyX, bodyY);
  const distFromLine = bodyR.sub(linePoint).dot(lineSlopeOrthoUnit);
  if (distFromLine < 0.0) {
    bodyX -= lineSlopeOrthoUnit.x * distFromLine;
    bodyY -= lineSlopeOrthoUnit.y * distFromLine;
  }

  // Restrict top
  const ELLIPSE_HEIGHT = 0.48;
  if (bodyY > ELLIPSE_HEIGHT) bodyY = ELLIPSE_HEIGHT;

  // Restrict front
  if (bodyX < -0.5) bodyX = -0.5;

  // Restrict back
  const ELLIPSE_WIDTH = 0.26;
  if (bodyX > ELLIPSE_WIDTH) bodyX = ELLIPSE_WIDTH;

  // Restrict back-top corner with ellipse
  const ELLIPSE_R2 = ELLIPSE_HEIGHT * ELLIPSE_HEIGHT;
  const ELLIPSE_R = Math.sqrt(ELLIPSE_R2);
  if (bodyX > 0 && bodyY > 0) {
    const ELLIPSE_A2 = (ELLIPSE_HEIGHT / ELLIPSE_WIDTH) * (ELLIPSE_HEIGHT / ELLIPSE_WIDTH);
    const distance2 = bodyX * bodyX * ELLIPSE_A2 + bodyY * bodyY;
    if (distance2 > ELLIPSE_R2) {
      const distance = Math.sqrt(distance2);
      const ratio = ELLIPSE_R / distance;
      bodyX *= ratio;
      bodyY *= ratio;
    }
  }

  // Unflip body
  if (mot.flippedBike) {
    mot.bodyR = j.scale(bodyY).sub(i.scale(bodyX)).add(mot.bike.r);
  } else {
    mot.bodyR = i.scale(bodyX).add(j.scale(bodyY)).add(mot.bike.r);
  }
}

/** Adjust body position with spring-damper physics */
export function bodyMovement(
  mot: MotorState,
  gravity: Vec2,
  i: Vec2,
  j: Vec2,
  dt: number
): void {
  bodyBoundaries(mot, i, j);

  const neutralBodyR = mot.bike.r.add(j.scale(BODY_DY));
  const deltaBodyR = neutralBodyR.sub(mot.bodyR);

  // Spring force
  let springLength = deltaBodyR.length();
  if (springLength < 0.0000001) springLength = 0.0000001;
  const forceSpringUnit = deltaBodyR.scale(1.0 / springLength);
  const forceSpringScalar = springLength * SPRING_TENSION_COEFFICIENT * 5.0;
  const forceSpring = forceSpringUnit.scale(forceSpringScalar);

  // Damping force
  const bodyLengthOrtho = rotate90deg(mot.bodyR.sub(mot.bike.r));
  const neutralV = bodyLengthOrtho.scale(mot.bike.angularVelocity).add(mot.bike.v);
  const relativeV = mot.bodyV.sub(neutralV);
  const forceDamping = relativeV.scale(SPRING_RESISTANCE_COEFFICIENT * 3.0);

  // Total force including gravity
  const forceTotal = forceSpring.sub(forceDamping).add(
    gravity.scale(mot.bike.mass * 10.0) // Gravity = 10.0
  );

  const a = forceTotal.scale(1.0 / mot.bike.mass);
  mot.bodyV = mot.bodyV.add(a.scale(dt));
  mot.bodyR = mot.bodyR.add(mot.bodyV.scale(dt));
}