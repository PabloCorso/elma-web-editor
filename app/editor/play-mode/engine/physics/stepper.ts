/**
 * Physics stepper - force calculation, gas/brake/volt, death check.
 * Ported from LEPTET.CPP
 */
import { Vec2, Vec2i, Vec2j, rotate90deg } from "../core/vec2";
import {
  SPRING_TENSION_COEFFICIENT,
  SPRING_RESISTANCE_COEFFICIENT,
  LEFT_WHEEL_DX,
  LEFT_WHEEL_DY,
  RIGHT_WHEEL_DX,
  RIGHT_WHEEL_DY,
  VOLT_DELAY,
  HEAD_RADIUS,
  VOLT_ANGULAR_IMPULSE,
  VOLT_RESIDUAL_CHANGE,
  GAS_TORQUE,
  BRAKE_FORCE,
  BRAKE_FRICTION,
  MAX_SPIN_OMEGA,
  GRAVITY,
} from "../core/constants";
import type { MotorState } from "./motor-state";
import { MotorGravity } from "./motor-state";
import type { Rigidbody } from "./rigidbody";
import { rigidbodyMovement, bodyMovement } from "./physics-move";
import { getTwoAnchorPoints, getTouchingObject } from "./physics-collision";
import type { Segments } from "./segments";
import { WavEvent, type EventBuffer } from "../game/event-buffer";
import type { GameObject } from "../level";

let maxFriction = 0;

/** Clamp angle to [-PI, PI] */
function clampAngle(angle: number): number {
  if (angle < -Math.PI) return angle + 2 * Math.PI;
  if (angle > Math.PI) return angle - 2 * Math.PI;
  return angle;
}

/**
 * Calculate spring/damper forces between bike frame and a wheel.
 * Ported from erokszamitasa()
 */
function calculateForces(
  mot: MotorState,
  wheel: Rigidbody,
  i1: Vec2,
  j1: Vec2,
  wheelDX: number,
  wheelDY: number,
  wheelTorque: number,
): {
  wheelForce: Vec2;
  bikeForce: Vec2;
  bikeTorque: number;
  returnedWheelTorque: number;
} {
  // Expected wheel position in bike's local frame
  const localPos = i1.scale(wheelDX).add(j1.scale(wheelDY));
  const expectedPos = localPos.add(mot.bike.r);

  // Spring stretch
  const stretch = expectedPos.sub(wheel.r);

  let wheelForce = new Vec2();
  let bikeForce = new Vec2();
  let bikeTorque = 0;

  if (Math.abs(stretch.x) > 0.0001 || Math.abs(stretch.y) > 0.0001) {
    // Decompose spring force into radial and tangential components
    const rodLength = localPos.length();
    const rodUnit = localPos.scale(1.0 / rodLength);
    const rodUnitPerp = rotate90deg(rodUnit);

    const fRadial = stretch.dot(rodUnit) * SPRING_TENSION_COEFFICIENT;
    const fTangential = stretch.dot(rodUnitPerp) * SPRING_TENSION_COEFFICIENT;

    wheelForce = rodUnit.scale(fRadial).add(rodUnitPerp.scale(fTangential));
    bikeForce = wheelForce.scale(-1);
    bikeTorque = -fTangential * rodLength;
  }

  // Damping force (velocity-based resistance)
  const rod = wheel.r.sub(mot.bike.r);
  const rodLen = rod.length();
  const recRodLen = 1.0 / rodLen;
  const rodUnit = rod.scale(recRodLen);
  const rodPerp = rotate90deg(rod);
  const rodPerpUnit = rotate90deg(rodUnit);

  // Relative velocity between wheel mounting point and wheel
  const mountingPointVelocity = rodPerp
    .scale(mot.bike.angularVelocity)
    .add(mot.bike.v);
  const relativeV = mountingPointVelocity.sub(wheel.v);

  const vLong = relativeV.dot(rodUnit);
  const vTang = relativeV.dot(rodPerpUnit);

  const fkLong = rodUnit.scale(vLong * SPRING_RESISTANCE_COEFFICIENT);
  const fkTang = rodPerpUnit.scale(vTang * SPRING_RESISTANCE_COEFFICIENT);

  // Wheel torque -> force on bike
  const torqueForce = rodPerpUnit.scale(wheelTorque * recRodLen);

  wheelForce = wheelForce.add(fkLong).add(fkTang).sub(torqueForce);
  bikeTorque += -fkTang.dot(rodPerp);
  bikeForce = bikeForce.sub(fkLong).sub(fkTang).add(torqueForce);

  // Friction calculation for sound
  calculateFriction(mot, stretch, relativeV);

  return {
    wheelForce,
    bikeForce,
    bikeTorque,
    returnedWheelTorque: wheelTorque,
  };
}

function calculateFriction(
  mot: MotorState,
  stretchV: Vec2,
  velocityV: Vec2,
): void {
  const goodDir = new Vec2(
    Math.cos(mot.bike.rotation - 0.5 * Math.PI),
    Math.sin(mot.bike.rotation - 0.5 * Math.PI),
  );
  const stretch = goodDir.dot(stretchV);
  const velocity = goodDir.dot(velocityV);
  if (stretch <= 0 || velocity <= 0) return;
  const value = stretch * velocity;
  if (value > maxFriction) maxFriction = value;
}

export function resetStepper(mot: MotorState): void {
  mot.prevBrake = false;
  mot.leftWheelBrakeRotation = 0;
  mot.rightWheelBrakeRotation = 0;
  mot.voltingRight = false;
  mot.voltingLeft = false;
  mot.rightVoltTime = -1.0;
  mot.leftVoltTime = -1.0;
  mot.angularVelocityPreRightVolt = -1.0;
  mot.angularVelocityPreLeftVolt = -1.0;
}

/** Calculate head position from bike state */
export function calculateHeadPosition(mot: MotorState): void {
  const i = new Vec2(Math.cos(mot.bike.rotation), Math.sin(mot.bike.rotation));
  const j = rotate90deg(i);
  if (mot.flippedBike) {
    mot.headR = mot.bodyR.add(i.scale(0.09)).add(j.scale(0.63));
  } else {
    mot.headR = mot.bodyR.sub(i.scale(0.09)).add(j.scale(0.63));
  }
}

/**
 * Main physics step function.
 * Ported from leptet()
 */
export function step(
  mot: MotorState,
  time: number,
  dt: number,
  gas: boolean,
  brake: boolean,
  rightVolt: boolean,
  leftVolt: boolean,
  segments: Segments,
  eventBuffer: EventBuffer,
): void {
  maxFriction = 0;

  const i1 = new Vec2(Math.cos(mot.bike.rotation), Math.sin(mot.bike.rotation));
  const j1 = rotate90deg(i1);

  // Brake/gas setup
  if (!mot.prevBrake && brake) {
    mot.leftWheelBrakeRotation = mot.leftWheel.rotation - mot.bike.rotation;
    mot.rightWheelBrakeRotation = mot.rightWheel.rotation - mot.bike.rotation;
  }
  mot.prevBrake = brake;

  let leftWheelTorque = 0;
  let rightWheelTorque = 0;

  if (gas) {
    if (mot.flippedBike) {
      if (mot.leftWheel.angularVelocity > -MAX_SPIN_OMEGA) {
        leftWheelTorque = -GAS_TORQUE;
      }
    } else {
      if (mot.rightWheel.angularVelocity < MAX_SPIN_OMEGA) {
        rightWheelTorque = GAS_TORQUE;
      }
    }
  }

  if (brake) {
    let dalfa =
      mot.leftWheel.rotation - (mot.bike.rotation + mot.leftWheelBrakeRotation);
    let domega = mot.leftWheel.angularVelocity - mot.bike.angularVelocity;
    leftWheelTorque = -BRAKE_FORCE * dalfa - BRAKE_FRICTION * domega;

    dalfa =
      mot.rightWheel.rotation -
      (mot.bike.rotation + mot.rightWheelBrakeRotation);
    domega = mot.rightWheel.angularVelocity - mot.bike.angularVelocity;
    rightWheelTorque = -BRAKE_FORCE * dalfa - BRAKE_FRICTION * domega;
  } else {
    mot.leftWheel.rotation = clampAngle(mot.leftWheel.rotation);
    mot.rightWheel.rotation = clampAngle(mot.rightWheel.rotation);
  }

  // Calculate spring/damper forces
  const leftResult = calculateForces(
    mot,
    mot.leftWheel,
    i1,
    j1,
    LEFT_WHEEL_DX,
    LEFT_WHEEL_DY,
    leftWheelTorque,
  );
  const rightResult = calculateForces(
    mot,
    mot.rightWheel,
    i1,
    j1,
    RIGHT_WHEEL_DX,
    RIGHT_WHEEL_DY,
    rightWheelTorque,
  );

  // Volt handling: finish existing volts
  let oldOmega = 0;
  if (rightVolt || leftVolt) {
    oldOmega = mot.bike.angularVelocity;
  }

  if (
    mot.voltingRight &&
    (rightVolt || leftVolt || time > mot.rightVoltTime + VOLT_DELAY * 0.25)
  ) {
    mot.bike.angularVelocity += VOLT_ANGULAR_IMPULSE;
    if (mot.bike.angularVelocity > mot.angularVelocityPreRightVolt) {
      mot.bike.angularVelocity = mot.angularVelocityPreRightVolt;
    }
    if (mot.bike.angularVelocity > 0.0) {
      mot.bike.angularVelocity -= VOLT_RESIDUAL_CHANGE;
      if (mot.bike.angularVelocity < 0.0) mot.bike.angularVelocity = 0.0;
    }
    mot.voltingRight = false;
    mot.angularVelocityPreRightVolt = -1.0;
    mot.rightVoltTime = -1.0;
  }

  if (
    mot.voltingLeft &&
    (rightVolt || leftVolt || time > mot.leftVoltTime + VOLT_DELAY * 0.25)
  ) {
    mot.bike.angularVelocity -= VOLT_ANGULAR_IMPULSE;
    if (mot.bike.angularVelocity < mot.angularVelocityPreLeftVolt) {
      mot.bike.angularVelocity = mot.angularVelocityPreLeftVolt;
    }
    if (mot.bike.angularVelocity < 0.0) {
      mot.bike.angularVelocity += VOLT_RESIDUAL_CHANGE;
      if (mot.bike.angularVelocity > 0.0) mot.bike.angularVelocity = 0.0;
    }
    mot.voltingLeft = false;
    mot.angularVelocityPreLeftVolt = -1.0;
    mot.leftVoltTime = -1.0;
  }

  // Start new volts
  if (rightVolt) {
    mot.voltingRight = true;
    mot.angularVelocityPreRightVolt = mot.bike.angularVelocity;
    mot.rightVoltTime = time;
    mot.bike.angularVelocity -= VOLT_ANGULAR_IMPULSE;
  }
  if (leftVolt) {
    mot.voltingLeft = true;
    mot.angularVelocityPreLeftVolt = mot.bike.angularVelocity;
    mot.leftVoltTime = time;
    mot.bike.angularVelocity += VOLT_ANGULAR_IMPULSE;
  }

  // Apply volt impulse to body
  if (rightVolt || leftVolt) {
    const domega = mot.bike.angularVelocity - oldOmega;
    const tangent = rotate90deg(mot.bodyR.sub(mot.bike.r));
    mot.bodyV = mot.bodyV.add(tangent.scale(domega));
  }

  // Apply physics based on gravity direction
  const bikeForce = leftResult.bikeForce.add(rightResult.bikeForce);
  const bikeTorque = leftResult.bikeTorque + rightResult.bikeTorque;

  let gravityVec: Vec2;
  switch (mot.gravityDirection) {
    case MotorGravity.Down:
      gravityVec = new Vec2(0, -1);
      bodyMovement(mot, gravityVec, i1, j1, dt);
      rigidbodyMovement(
        mot.bike,
        bikeForce.sub(Vec2j.scale(mot.bike.mass * GRAVITY)),
        bikeTorque,
        dt,
        false,
        segments,
        eventBuffer,
      );
      rigidbodyMovement(
        mot.leftWheel,
        leftResult.wheelForce.sub(Vec2j.scale(mot.leftWheel.mass * GRAVITY)),
        leftWheelTorque,
        dt,
        true,
        segments,
        eventBuffer,
      );
      rigidbodyMovement(
        mot.rightWheel,
        rightResult.wheelForce.sub(Vec2j.scale(mot.rightWheel.mass * GRAVITY)),
        rightWheelTorque,
        dt,
        true,
        segments,
        eventBuffer,
      );
      break;
    case MotorGravity.Up:
      gravityVec = new Vec2(0, 1);
      bodyMovement(mot, gravityVec, i1, j1, dt);
      rigidbodyMovement(
        mot.bike,
        bikeForce.add(Vec2j.scale(mot.bike.mass * GRAVITY)),
        bikeTorque,
        dt,
        false,
        segments,
        eventBuffer,
      );
      rigidbodyMovement(
        mot.leftWheel,
        leftResult.wheelForce.add(Vec2j.scale(mot.leftWheel.mass * GRAVITY)),
        leftWheelTorque,
        dt,
        true,
        segments,
        eventBuffer,
      );
      rigidbodyMovement(
        mot.rightWheel,
        rightResult.wheelForce.add(Vec2j.scale(mot.rightWheel.mass * GRAVITY)),
        rightWheelTorque,
        dt,
        true,
        segments,
        eventBuffer,
      );
      break;
    case MotorGravity.Left:
      gravityVec = new Vec2(-1, 0);
      bodyMovement(mot, gravityVec, i1, j1, dt);
      rigidbodyMovement(
        mot.bike,
        bikeForce.sub(Vec2i.scale(mot.bike.mass * GRAVITY)),
        bikeTorque,
        dt,
        false,
        segments,
        eventBuffer,
      );
      rigidbodyMovement(
        mot.leftWheel,
        leftResult.wheelForce.sub(Vec2i.scale(mot.leftWheel.mass * GRAVITY)),
        leftWheelTorque,
        dt,
        true,
        segments,
        eventBuffer,
      );
      rigidbodyMovement(
        mot.rightWheel,
        rightResult.wheelForce.sub(Vec2i.scale(mot.rightWheel.mass * GRAVITY)),
        rightWheelTorque,
        dt,
        true,
        segments,
        eventBuffer,
      );
      break;
    case MotorGravity.Right:
      gravityVec = new Vec2(1, 0);
      bodyMovement(mot, gravityVec, i1, j1, dt);
      rigidbodyMovement(
        mot.bike,
        bikeForce.add(Vec2i.scale(mot.bike.mass * GRAVITY)),
        bikeTorque,
        dt,
        false,
        segments,
        eventBuffer,
      );
      rigidbodyMovement(
        mot.leftWheel,
        leftResult.wheelForce.add(Vec2i.scale(mot.leftWheel.mass * GRAVITY)),
        leftWheelTorque,
        dt,
        true,
        segments,
        eventBuffer,
      );
      rigidbodyMovement(
        mot.rightWheel,
        rightResult.wheelForce.add(Vec2i.scale(mot.rightWheel.mass * GRAVITY)),
        rightWheelTorque,
        dt,
        true,
        segments,
        eventBuffer,
      );
      break;
  }

  calculateHeadPosition(mot);
}

/**
 * Check death/object collision.
 * Returns 0 if dead, 2 if nothing special.
 * Ported from vizsgalat()
 */
export function checkCollisions(
  mot: MotorState,
  objects: GameObject[],
  segments: Segments,
  eventBuffer: EventBuffer,
  isFlagTag: boolean,
): number {
  // Check head collision with terrain
  const headResult = getTwoAnchorPoints(segments, mot.headR, HEAD_RADIUS);
  if (headResult.count > 0) return 0;

  // Check object collisions
  let hadFood = true;
  while (hadFood) {
    hadFood = false;
    const indices = [
      getTouchingObject(
        objects,
        mot.leftWheel.r,
        mot.leftWheel.radius,
        isFlagTag,
      ),
      getTouchingObject(
        objects,
        mot.rightWheel.r,
        mot.rightWheel.radius,
        isFlagTag,
      ),
      getTouchingObject(objects, mot.headR, HEAD_RADIUS, isFlagTag),
    ];

    for (const idx of indices) {
      if (idx >= 0) {
        eventBuffer.add(WavEvent.None, 0.0, idx);
        if (objects[idx]!.type === "food") {
          objects[idx]!.active = false;
          hadFood = true;
        }
      }
    }
  }

  return 2;
}
