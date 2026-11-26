import type { Product } from "@/core/catalog";
import type { Part } from "@/core/types";

export type ScooterCategory =
  | "deck"
  | "fork"
  | "headset"
  | "clamp"
  | "bars"
  | "grips"
  | "wheels"
  | "griptape";

export type Compression = "SCS" | "HIC" | "IHC";
export type WheelSize = 110 | 120;
export type WheelCore = "8STD" | "12STD";
export type AxleSize = "8mm" | "12mm";
export type HeadsetType = "integrated" | "standard";

export interface ScooterCompatibility {
  /** Compression systems this part works with (fork, bars) or provides (clamp: single value). */
  compression?: Compression[];
  /** Wheel diameters this part accepts (deck, fork) or is (wheels: single value). */
  wheelSize?: WheelSize[];
  /** Axle diameter of the dropouts (deck rear / fork). */
  axle?: AxleSize;
  /** Wheel core / bearing standard. */
  core?: WheelCore;
  /** Headset cup style required by a deck / provided by a headset. */
  headset?: HeadsetType;
  /** Steering axis angle from horizontal, in degrees (deck). */
  headtubeAngle?: number;
  /** Bar outer diameters a clamp accepts, in mm. */
  barDiameter?: number[];
}

/** Scooter-specific product fields, shared by every colourway. */
interface ScooterSpec {
  compatibility: ScooterCompatibility;
  /** Template style options — see STYLE_SCHEMA in ./style.ts. Optional; defaults apply. */
  style?: Record<string, string | number | boolean | null>;
}

/** Catalog entry (src/data/scooter-products.json). */
export interface ScooterProduct extends Product<ScooterCategory>, ScooterSpec {}

/** One buildable colourway, flattened (see core/catalog.ts → flattenCatalog). */
export interface ScooterPart extends Part<ScooterCategory>, ScooterSpec {}

/**
 * Dimension keys per category (all mm) — documented here so data agents
 * generating catalog JSON know what each slot needs.
 *
 * deck:     length, width, thickness, headtubeLength, neckHeight, neckReach
 * fork:     steererLength, steererDiameter, legLength
 * headset:  stackTop, stackBottom
 * clamp:    height, outerDiameter, minInsertion
 * bars:     height, width, outerDiameter
 * grips:    length, outerDiameter
 * wheels:   diameter, width
 * griptape: length, width
 */
export const DIMENSION_KEYS: Record<ScooterCategory, string[]> = {
  deck: ["length", "width", "thickness", "headtubeLength", "neckHeight", "neckReach"],
  fork: ["steererLength", "steererDiameter", "legLength"],
  headset: ["stackTop", "stackBottom"],
  clamp: ["height", "outerDiameter", "minInsertion"],
  bars: ["height", "width", "outerDiameter"],
  grips: ["length", "outerDiameter"],
  wheels: ["diameter", "width"],
  griptape: ["length", "width"],
};
