/**
 * Sport-agnostic core types. Every sport (scooter, skateboard, BMX...) plugs in
 * by providing a `SportModule` — catalog data, slot definitions and a
 * deterministic compatibility checker. Nothing in `src/core` or `src/store`
 * knows about a specific sport.
 */

export type Finish = "gloss" | "matte" | "anodized" | "raw";

export interface RetailerOffer {
  shopName: string;
  price: number; // USD
  inStock: boolean;
  affiliateUrl: string;
  /** Surfaced from the shared ShredDeals price pipeline. */
  isShredDeal?: boolean;
}

export interface Part<Cat extends string = string> {
  id: string;
  name: string;
  brand: string;
  category: Cat;
  weightGrams: number;
  colorHex: string;
  /** Optional accent colour, e.g. wheel urethane vs. core. */
  secondaryHex?: string;
  finish: Finish;
  /** All lengths in millimetres. */
  dimensions: Record<string, number>;
  retailers: RetailerOffer[];
}

export interface CategoryDef<Cat extends string = string> {
  id: Cat;
  label: string;
  required: boolean;
  /** Short helper text shown in the step selector. */
  hint?: string;
}

export type Severity = "error" | "warning";

export interface CompatibilityIssue<Cat extends string = string> {
  id: string;
  severity: Severity;
  /** Slots involved — used to badge rows and candidate parts. */
  slots: Cat[];
  message: string;
}

export type Build<Cat extends string, P extends Part<Cat>> = Partial<Record<Cat, P>>;

export interface SportModule<Cat extends string = string, P extends Part<Cat> = Part<Cat>> {
  id: string;
  name: string;
  categories: readonly CategoryDef<Cat>[];
  parts: readonly P[];
  defaultBuild: Partial<Record<Cat, string>>;
  checkCompatibility(build: Build<Cat, P>): CompatibilityIssue<Cat>[];
  /** Short spec chips for lists/tables (e.g. "HIC", "120mm"). */
  specChips(part: P): string[];
}
