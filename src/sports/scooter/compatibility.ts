import type { Build, CompatibilityIssue } from "@/core/types";
import type { ScooterCategory, ScooterPart } from "./types";

type Issue = CompatibilityIssue<ScooterCategory>;
type ScooterBuild = Build<ScooterCategory, ScooterPart>;

/** Clearance the steerer must leave below the top of the clamp for compression to work (mm). */
const COMPRESSION_GAP = 3;

/**
 * Deterministic pro-scooter compatibility rules. Pure function: same build in,
 * same issues out — safe to call for every candidate part in the selector.
 */
export function checkScooterCompatibility(build: ScooterBuild): Issue[] {
  const { deck, fork, headset, clamp, bars, wheels, griptape } = build;
  const issues: Issue[] = [];
  const push = (i: Issue) => issues.push(i);

  // 1. Compression system: clamp must be supported by fork and bars.
  const sys = clamp?.compatibility.compression?.[0];
  if (clamp && sys) {
    if (fork && !fork.compatibility.compression?.includes(sys)) {
      push({
        id: "compression-fork",
        severity: "error",
        slots: ["clamp", "fork"],
        message: `${sys} clamp won't work with this fork (supports ${fork.compatibility.compression?.join("/") ?? "none"}).`,
      });
    }
    if (bars && !bars.compatibility.compression?.includes(sys)) {
      push({
        id: "compression-bars",
        severity: "error",
        slots: ["clamp", "bars"],
        message: `${sys} clamp won't work with these bars (supports ${bars.compatibility.compression?.join("/") ?? "none"}).`,
      });
    }
  }

  // 2. Bar diameter vs clamp bore.
  if (clamp && bars) {
    const od = bars.dimensions.outerDiameter;
    const accepted = clamp.compatibility.barDiameter ?? [];
    if (!accepted.includes(od)) {
      push({
        id: "bar-diameter",
        severity: "error",
        slots: ["clamp", "bars"],
        message: `Clamp fits ${accepted.join("/")}mm bars; selected bars are ${od}mm.`,
      });
    } else if (sys === "SCS" && od < Math.max(...accepted)) {
      push({
        id: "scs-shim",
        severity: "warning",
        slots: ["clamp", "bars"],
        message: `Standard ${od}mm bars in an oversized SCS clamp need a shim — check it's included.`,
      });
    }
  }

  // 3. Wheel diameter vs deck / fork clearance.
  const wheelSize = wheels?.compatibility.wheelSize?.[0];
  if (wheels && wheelSize) {
    for (const holder of [deck, fork]) {
      if (holder && !holder.compatibility.wheelSize?.includes(wheelSize)) {
        push({
          id: `wheel-size-${holder.category}`,
          severity: "error",
          slots: ["wheels", holder.category],
          message: `${wheelSize}mm wheels don't fit this ${holder.category} (max ${Math.max(...(holder.compatibility.wheelSize ?? [0]))}mm).`,
        });
      }
    }
  }

  // 4. Wheel core vs axle.
  const core = wheels?.compatibility.core;
  if (wheels && core) {
    for (const holder of [deck, fork]) {
      const axle = holder?.compatibility.axle;
      if (!holder || !axle) continue;
      if (core === "8STD" && axle === "12mm") {
        push({
          id: `axle-${holder.category}`,
          severity: "error",
          slots: ["wheels", holder.category],
          message: `8STD bearings won't slide onto the ${holder.category}'s 12mm axle.`,
        });
      } else if (core === "12STD" && axle === "8mm") {
        push({
          id: `axle-${holder.category}`,
          severity: "warning",
          slots: ["wheels", holder.category],
          message: `12STD wheels on the ${holder.category}'s 8mm axle need 12→8mm conversion bearings.`,
        });
      }
    }
  }

  // 5. Headset cup style.
  if (deck && headset && deck.compatibility.headset !== headset.compatibility.headset) {
    push({
      id: "headset-type",
      severity: "error",
      slots: ["deck", "headset"],
      message: `Deck needs a ${deck.compatibility.headset} headset; selected one is ${headset.compatibility.headset}.`,
    });
  }

  // 6. Steerer length: must reach into the clamp, but not poke out of the top.
  if (deck && fork && headset && clamp) {
    const base =
      deck.dimensions.headtubeLength + headset.dimensions.stackTop + headset.dimensions.stackBottom;
    const min = base + clamp.dimensions.minInsertion;
    const max = base + clamp.dimensions.height - COMPRESSION_GAP;
    const steerer = fork.dimensions.steererLength;
    if (steerer < min) {
      push({
        id: "steerer-short",
        severity: "error",
        slots: ["fork", "clamp", "deck"],
        message: `Fork steerer (${steerer}mm) is too short — needs ≥ ${min}mm to engage this clamp.`,
      });
    } else if (steerer > max) {
      push({
        id: "steerer-long",
        severity: "warning",
        slots: ["fork", "clamp", "deck"],
        message: `Fork steerer (${steerer}mm) is ${steerer - max}mm too long — cut to ${max}mm or add spacers.`,
      });
    }
  }

  // 7. Grip tape coverage.
  if (deck && griptape) {
    const diff = griptape.dimensions.width - deck.dimensions.width;
    if (diff < -2) {
      push({
        id: "griptape-narrow",
        severity: "warning",
        slots: ["griptape", "deck"],
        message: `Grip tape is ${Math.abs(diff)}mm narrower than the deck — edges will be exposed.`,
      });
    }
    if (griptape.dimensions.length < deck.dimensions.length - 5) {
      push({
        id: "griptape-short",
        severity: "warning",
        slots: ["griptape", "deck"],
        message: `Grip tape is shorter than the deck platform.`,
      });
    }
  }

  return issues;
}
