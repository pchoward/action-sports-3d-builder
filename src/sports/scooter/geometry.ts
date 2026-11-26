import type { Build } from "@/core/types";
import type { ScooterCategory, ScooterPart } from "./types";

/** 1 scene unit = 1 metre; catalog data is in millimetres. */
export const MM = 0.001;

/** Fallback dimensions so the rig stays solvable while slots are empty. */
const FALLBACK = {
  deck: { length: 510, width: 127, thickness: 36, headtubeLength: 116, neckHeight: 85, neckReach: 40, headtubeAngle: 83 },
  fork: { steererLength: 165, steererDiameter: 28.6, legLength: 80 },
  headset: { stackTop: 10, stackBottom: 6 },
  clamp: { height: 55, outerDiameter: 44 },
  bars: { height: 600, width: 580, outerDiameter: 34.9 },
  wheels: { diameter: 110, width: 24 },
};

export interface ScooterRig {
  wheelRadius: number;
  wheelWidth: number;
  /** Chassis frame: origin at rear axle, +X forward, +Y up, +Z to the side. */
  deck: { start: number; length: number; width: number; thickness: number; centerY: number };
  /** Bottom of the headtube in chassis frame. */
  headtubeBase: [number, number];
  headtubeLength: number;
  headtubeAngleDeg: number;
  /** Rotation about Z that maps the steering frame's +Y onto the steering axis. */
  steeringTilt: number;
  // Steering frame (origin = headtube bottom, +Y along steering axis):
  stackBottom: number;
  stackTop: number;
  /** Y of the clamp / bar base (top of the top headset cup). */
  clampBase: number;
  clampHeight: number;
  frontAxleY: number;
  /** Assembly pitch so both wheels touch the ground (radians, applied to chassis). */
  pitch: number;
  /** Horizontal offset that centres the scooter on the origin. */
  centerOffsetX: number;
  barTopY: number;
}

/**
 * Solves the parent→child mount chain from part dimensions:
 * rear axle → deck → headtube (θ) → headset → clamp → bars, and
 * headtube → fork → front axle. Then pitches the chassis so both wheels sit
 * on the ground — so swapping a longer fork tilts the scooter instead of
 * floating or clipping a wheel.
 */
export function solveScooterRig(build: Build<ScooterCategory, ScooterPart>): ScooterRig {
  const deck = { ...FALLBACK.deck, ...build.deck?.dimensions };
  const headtubeAngleDeg = build.deck?.compatibility.headtubeAngle ?? FALLBACK.deck.headtubeAngle;
  const fork = { ...FALLBACK.fork, ...build.fork?.dimensions };
  const headset = { ...FALLBACK.headset, ...build.headset?.dimensions };
  const clamp = { ...FALLBACK.clamp, ...build.clamp?.dimensions };
  const bars = { ...FALLBACK.bars, ...build.bars?.dimensions };
  const wheels = { ...FALLBACK.wheels, ...build.wheels?.dimensions };

  const wheelRadius = (wheels.diameter / 2) * MM;
  const deckStart = wheelRadius + 10 * MM; // rear wheel tucks under the brake, behind the platform
  const deckLength = deck.length * MM;
  const thickness = deck.thickness * MM;
  const centerY = 6 * MM; // platform sits just above axle line

  const theta = (headtubeAngleDeg * Math.PI) / 180;
  const steeringTilt = Math.PI / 2 - theta; // +Z rotation leans the axis back toward the rider
  const headtubeBase: [number, number] = [
    deckStart + deckLength + deck.neckReach * MM,
    deck.neckHeight * MM,
  ];

  const stackBottom = headset.stackBottom * MM;
  const stackTop = headset.stackTop * MM;
  const headtubeLength = deck.headtubeLength * MM;
  const frontAxleY = -(stackBottom + fork.legLength * MM);

  // Front axle in chassis coords: steering-frame point (0, frontAxleY) rotated by steeringTilt.
  const fx = headtubeBase[0] - Math.sin(steeringTilt) * frontAxleY;
  const fy = headtubeBase[1] + Math.cos(steeringTilt) * frontAxleY;
  const pitch = -Math.atan2(fy, fx); // rear axle is at (0,0); same-size wheels both front & rear

  const clampBase = headtubeLength + stackTop;
  return {
    wheelRadius,
    wheelWidth: wheels.width * MM,
    deck: { start: deckStart, length: deckLength, width: deck.width * MM, thickness, centerY },
    headtubeBase,
    headtubeLength,
    headtubeAngleDeg,
    steeringTilt,
    stackBottom,
    stackTop,
    clampBase,
    clampHeight: clamp.height * MM,
    frontAxleY,
    pitch,
    centerOffsetX: -Math.hypot(fx, fy) / 2,
    barTopY: clampBase + bars.height * MM,
  };
}
