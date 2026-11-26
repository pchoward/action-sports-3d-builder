/**
 * Template style schema for scooter parts.
 *
 * Every catalog part may carry an optional `style` object that selects how its
 * parametric 3D template is drawn. Keys are validated against this schema at
 * load time, and anything omitted falls back to the default, so data agents
 * can fill in styles gradually.
 */
import type { ScooterCategory } from "./types";

const choice = <const T extends string>(options: readonly T[], def: NoInfer<T>, help: string) =>
  ({ kind: "enum", options, default: def, help }) as const;
const num = (min: number, max: number, def: number, help: string) =>
  ({ kind: "number", min, max, default: def, help }) as const;
const bool = (def: boolean, help: string) => ({ kind: "bool", default: def, help }) as const;
const color = (def: string | null, help: string) => ({ kind: "color", default: def, help }) as const;

export const STYLE_SCHEMA = {
  deck: {
    body: choice(["box", "boxless"], "box", "Hollow box section, or top plate on open side rails"),
    nose: choice(["square", "rounded"], "square", "Plan-view shape of the deck ends"),
    neck: choice(["solid", "cutout", "double"], "solid", "Solid neck, neck with a lightening hole, or twin plates"),
    brake: choice(["fender", "flex"], "fender", "Curved fender brake or flat flex brake"),
    sideSlots: num(0, 4, 0, "Lightening slots milled into each side of the deck"),
    sideText: bool(true, "Print the brand name on the deck sides"),
  },
  fork: {
    legs: choice(["straight", "tapered"], "tapered", "Leg profile from crown to dropout"),
    cutouts: bool(false, "Lightening slot in each leg"),
  },
  headset: {},
  clamp: {
    shape: choice(["round", "faceted"], "round", "Round or machined-flat outer body"),
    bolts: num(0, 4, 0, "Bolts per side (0 = derive from compression: SCS 4, HIC 3, IHC 2)"),
    slit: bool(true, "Visible clamp slit on the bolt side"),
  },
  bars: {
    shape: choice(["T", "Y"], "T", "T-bar or Y-bar"),
    gussets: bool(true, "Gussets at the T junction (T-bars only)"),
    backsweep: num(0, 10, 0, "Crossbar backsweep in degrees"),
    upsweep: num(0, 8, 0, "Crossbar upsweep in degrees"),
  },
  grips: {
    pattern: choice(["ribbed", "diamond", "smooth"], "ribbed", "Grip surface texture"),
    flange: bool(true, "Flange on the inboard end"),
  },
  wheels: {
    core: choice(["spoked", "hollow", "solid", "fullcore"], "spoked", "Core construction"),
    spokes: num(3, 10, 6, "Spoke / hole count"),
    profile: choice(["round", "flat"], "round", "Urethane profile"),
  },
  griptape: {
    pattern: choice(["plain", "logo", "camo", "stripe"], "plain", "Printed pattern"),
    accentHex: color(null, "Accent colour for the pattern (defaults to a tint of colorHex)"),
  },
} as const satisfies Record<ScooterCategory, Record<string, unknown>>;

type Schema = typeof STYLE_SCHEMA;
type FieldValue<F> = F extends { kind: "enum"; options: readonly (infer T)[] }
  ? T
  : F extends { kind: "number" }
    ? number
    : F extends { kind: "bool" }
      ? boolean
      : string | null;

export type StyleOf<C extends ScooterCategory> = { [K in keyof Schema[C]]: FieldValue<Schema[C][K]> };

type AnyField =
  | { kind: "enum"; options: readonly string[]; default: string }
  | { kind: "number"; min: number; max: number; default: number }
  | { kind: "bool"; default: boolean }
  | { kind: "color"; default: string | null };

const HEX = /^#[0-9a-fA-F]{6}$/;

function fieldError(f: AnyField, v: unknown): string | null {
  switch (f.kind) {
    case "enum":
      return f.options.includes(v as string) ? null : `must be one of ${f.options.join(", ")}`;
    case "number":
      return typeof v === "number" && v >= f.min && v <= f.max ? null : `must be a number ${f.min}–${f.max}`;
    case "bool":
      return typeof v === "boolean" ? null : "must be true or false";
    case "color":
      return typeof v === "string" && HEX.test(v) ? null : "must be a #rrggbb colour";
  }
}

/** Returns human-readable problems with a part's `style` object (empty = valid). */
export function validateStyle(category: ScooterCategory, raw: unknown): string[] {
  if (raw === undefined) return [];
  if (typeof raw !== "object" || raw === null) return ["style must be an object"];
  const schema = STYLE_SCHEMA[category] as Record<string, AnyField>;
  return Object.entries(raw).flatMap(([k, v]) => {
    const f = schema[k];
    if (!f) return [`style.${k} is not a ${category} style (allowed: ${Object.keys(schema).join(", ") || "none"})`];
    const err = fieldError(f, v);
    return err ? [`style.${k} ${err}`] : [];
  });
}

/** Fills in defaults. Invalid values never reach here (catalog is validated at load). */
export function resolveStyle<C extends ScooterCategory>(category: C, raw?: Record<string, unknown>): StyleOf<C> {
  const schema = STYLE_SCHEMA[category] as Record<string, AnyField>;
  const out: Record<string, unknown> = {};
  for (const [k, f] of Object.entries(schema)) out[k] = raw?.[k] ?? f.default;
  return out as StyleOf<C>;
}
