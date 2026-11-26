/**
 * Sport-agnostic core types. Every sport (scooter, skateboard, BMX...) plugs in
 * by providing a `SportModule` — catalog data, slot definitions and a
 * deterministic compatibility checker. Nothing in `src/core` or `src/store`
 * knows about a specific sport.
 */

export type Finish = "gloss" | "matte" | "anodized" | "raw";

/** A store's offer for a variant, resolved with the retailer's display name and affiliate link. */
export interface RetailerOffer {
  retailerId: string;
  shopName: string;
  price: number; // USD
  /** Regular price when the offer is discounted — drives strike-through + deal badges. */
  compareAtPrice?: number;
  inStock: boolean;
  /** Outbound link (affiliate-wrapped when the retailer has an affiliate template). */
  affiliateUrl: string;
  /** ISO date the price/stock was last verified (by a human or the scraper). */
  lastChecked?: string;
  /** Surfaced from the shared ShredDeals price pipeline. */
  isShredDeal?: boolean;
}

/**
 * 2D images for a part. All images are WebP (enforced by validateImages) —
 * convert anything else with `npm run images`.
 */
export interface PartImages {
  /** Product photo used for thumbnails in the selector and parts list. */
  product?: string;
  /** Flat print artwork mapped onto the 3D template (grip tape top, deck graphics). */
  graphic?: string;
}

/**
 * A buildable part: one colourway (variant) of a product, flattened with its
 * product specs and resolved store offers. This is what the store, the
 * compatibility rules and the 3D templates consume. It's derived from the catalog
 * (see core/catalog.ts), never stored.
 */
export interface Part<Cat extends string = string> {
  /** Variant id, which is what builds and share links reference. */
  id: string;
  productId: string;
  name: string;
  brand: string;
  category: Cat;
  /** Colourway label, e.g. "Black", "Gold/Black". */
  colorName: string;
  weightGrams: number;
  colorHex: string;
  /** Optional accent colour, e.g. wheel urethane vs. core. */
  secondaryHex?: string;
  finish: Finish;
  /** All lengths in millimetres. */
  dimensions: Record<string, number>;
  retailers: RetailerOffer[];
  images?: PartImages;
  soldAs?: "each" | "pair";
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
  /** Product ids (→ default colourway) or variant ids. */
  defaultBuild: Partial<Record<Cat, string>>;
  checkCompatibility(build: Build<Cat, P>): CompatibilityIssue<Cat>[];
  /** Short spec chips for lists/tables (e.g. "HIC", "120mm"). */
  specChips(part: P): string[];
}
