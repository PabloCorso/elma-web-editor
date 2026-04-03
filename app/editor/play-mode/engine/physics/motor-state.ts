/**
 * Bike motor state - ported from physics_init.h (motorst)
 */
import { Vec2 } from "../core/vec2";
import type { Rigidbody } from "./rigidbody";
import {
  BIKE_INIT_X,
  BIKE_INIT_Y,
  BIKE_MASS,
  BIKE_RADIUS,
  BIKE_INERTIA,
  LEFT_WHEEL_INIT_X,
  LEFT_WHEEL_INIT_Y,
  WHEEL_MASS,
  WHEEL_RADIUS,
  WHEEL_INERTIA,
  RIGHT_WHEEL_INIT_X,
  RIGHT_WHEEL_INIT_Y,
  BODY_INIT_X,
  BODY_INIT_Y,
} from "../core/constants";

export enum MotorGravity {
  Up = 0,
  Down = 1,
  Left = 2,
  Right = 3,
}

export interface MotorState {
  bike: Rigidbody;
  leftWheel: Rigidbody;
  rightWheel: Rigidbody;
  headR: Vec2;
  flippedBike: boolean;
  flippedCamera: boolean;
  gravityDirection: MotorGravity;

  bodyR: Vec2;
  bodyV: Vec2;

  appleCount: number;
  lastAppleTime: number;

  prevBrake: boolean;
  leftWheelBrakeRotation: number;
  rightWheelBrakeRotation: number;

  voltingRight: boolean;
  voltingLeft: boolean;
  rightVoltTime: number;
  leftVoltTime: number;
  angularVelocityPreRightVolt: number;
  angularVelocityPreLeftVolt: number;
}

export function createMotorState(): MotorState {
  return {
    bike: {
      rotation: 0,
      angularVelocity: 0,
      radius: BIKE_RADIUS,
      mass: BIKE_MASS,
      inertia: BIKE_INERTIA,
      r: new Vec2(BIKE_INIT_X, BIKE_INIT_Y),
      v: new Vec2(0, 0),
    },
    leftWheel: {
      rotation: 0,
      angularVelocity: 0,
      radius: WHEEL_RADIUS,
      mass: WHEEL_MASS,
      inertia: WHEEL_INERTIA,
      r: new Vec2(LEFT_WHEEL_INIT_X, LEFT_WHEEL_INIT_Y),
      v: new Vec2(0, 0),
    },
    rightWheel: {
      rotation: 0,
      angularVelocity: 0,
      radius: WHEEL_RADIUS,
      mass: WHEEL_MASS,
      inertia: WHEEL_INERTIA,
      r: new Vec2(RIGHT_WHEEL_INIT_X, RIGHT_WHEEL_INIT_Y),
      v: new Vec2(0, 0),
    },
    headR: new Vec2(BODY_INIT_X - 0.09, BODY_INIT_Y + 0.63),
    flippedBike: false,
    flippedCamera: false,
    gravityDirection: MotorGravity.Down,

    bodyR: new Vec2(BODY_INIT_X, BODY_INIT_Y),
    bodyV: new Vec2(0, 0),

    appleCount: 0,
    lastAppleTime: 0,

    prevBrake: false,
    leftWheelBrakeRotation: 0,
    rightWheelBrakeRotation: 0,

    voltingRight: false,
    voltingLeft: false,
    rightVoltTime: -1.0,
    leftVoltTime: -1.0,
    angularVelocityPreRightVolt: -1.0,
    angularVelocityPreLeftVolt: -1.0,
  };
}

export function initMotor(motor: MotorState): void {
  motor.flippedBike = false;
  motor.flippedCamera = false;
  motor.gravityDirection = MotorGravity.Down;
  motor.prevBrake = false;

  motor.bike.rotation = 0;
  motor.bike.angularVelocity = 0;
  motor.bike.radius = BIKE_RADIUS;
  motor.bike.mass = BIKE_MASS;
  motor.bike.inertia = BIKE_INERTIA;
  motor.bike.r = new Vec2(BIKE_INIT_X, BIKE_INIT_Y);
  motor.bike.v = new Vec2(0, 0);

  motor.leftWheel.rotation = 0;
  motor.leftWheel.angularVelocity = 0;
  motor.leftWheel.radius = WHEEL_RADIUS;
  motor.leftWheel.mass = WHEEL_MASS;
  motor.leftWheel.inertia = WHEEL_INERTIA;
  motor.leftWheel.r = new Vec2(LEFT_WHEEL_INIT_X, LEFT_WHEEL_INIT_Y);
  motor.leftWheel.v = new Vec2(0, 0);

  motor.rightWheel.rotation = 0;
  motor.rightWheel.angularVelocity = 0;
  motor.rightWheel.radius = WHEEL_RADIUS;
  motor.rightWheel.mass = WHEEL_MASS;
  motor.rightWheel.inertia = WHEEL_INERTIA;
  motor.rightWheel.r = new Vec2(RIGHT_WHEEL_INIT_X, RIGHT_WHEEL_INIT_Y);
  motor.rightWheel.v = new Vec2(0, 0);

  motor.bodyR = new Vec2(BODY_INIT_X, BODY_INIT_Y);
  motor.bodyV = new Vec2(0, 0);

  // Initial head position: rotation=0 → i=(1,0), j=(0,1), not flipped → bodyR - i*0.09 + j*0.63
  motor.headR = new Vec2(BODY_INIT_X - 0.09, BODY_INIT_Y + 0.63);
}
