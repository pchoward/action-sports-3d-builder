import type { SportModule } from "@/core/types";
import catalog from "@/data/scooter-parts.json";
import { validateScooterCatalog } from "./catalog";
import { checkScooterCompatibility } from "./compatibility";
import type { ScooterCategory, ScooterPart } from "./types";

export const SCOOTER_CATEGORIES = [
  { id: "deck", label: "Deck", required: true, hint: "Sets wheel size, axle and headset standards." },
  { id: "fork", label: "Fork", required: true, hint: "Steerer length + compression type matter." },
  { id: "headset", label: "Headset", required: true, hint: "Must match the deck's headtube cups." },
  { id: "clamp", label: "Clamp", required: true, hint: "Defines the compression system (SCS/HIC/IHC)." },
  { id: "bars", label: "Bars", required: true, hint: "Diameter must fit the clamp; height to rider." },
  { id: "grips", label: "Grips", required: false },
  { id: "wheels", label: "Wheels", required: true, hint: "Size and core must fit deck and fork." },
  { id: "griptape", label: "Grip Tape", required: false, hint: "Should be at least as wide as the deck." },
] as const satisfies readonly { id: ScooterCategory; label: string; required: boolean; hint?: string }[];

export const scooterModule: SportModule<ScooterCategory, ScooterPart> = {
  id: "scooter",
  name: "Pro Scooter",
  categories: SCOOTER_CATEGORIES,
  parts: validateScooterCatalog(catalog),
  defaultBuild: {
    deck: "deck-tilt-formula-55",
    fork: "fork-tilt-theory",
    headset: "headset-tilt-integrated",
    clamp: "clamp-tilt-scs",
    bars: "bars-tilt-classic-os",
    grips: "grips-odi-longneck-black",
    wheels: "wheels-tilt-120-12std",
    griptape: "griptape-tilt-black-6",
  },
  checkCompatibility: checkScooterCompatibility,
  specChips(p) {
    const c = p.compatibility;
    const d = p.dimensions;
    switch (p.category) {
      case "deck":
        return [`${d.length}×${d.width}mm`, `${c.headtubeAngle}° HT`, `≤${Math.max(...(c.wheelSize ?? []))}mm`, `${c.axle} axle`, c.headset ?? ""];
      case "fork":
        return [c.compression?.join("/") ?? "", `${d.steererLength}mm steerer`, `≤${Math.max(...(c.wheelSize ?? []))}mm`, `${c.axle} axle`];
      case "headset":
        return [c.headset ?? "", `${d.stackTop + d.stackBottom}mm stack`];
      case "clamp":
        return [c.compression?.[0] ?? "", `${d.height}mm tall`, `${c.barDiameter?.join("/")}mm bars`];
      case "bars":
        return [`${d.height}H × ${d.width}W`, `${d.outerDiameter}mm OD`, c.compression?.join("/") ?? ""];
      case "wheels":
        return [`${d.diameter}mm`, c.core ?? "", `${d.width}mm wide`];
      case "grips":
        return [`${d.length}mm`];
      case "griptape":
        return [`${d.width}×${d.length}mm`];
    }
  },
};
