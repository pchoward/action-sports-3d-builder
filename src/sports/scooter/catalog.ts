import { flattenCatalog, validateCatalog, type Retailer } from "@/core/catalog";
import { validateStyle } from "./style";
import { DIMENSION_KEYS, type ScooterCategory, type ScooterPart, type ScooterProduct } from "./types";

const CATEGORIES = Object.keys(DIMENSION_KEYS) as ScooterCategory[];

/** Scooter-specific checks layered on the shared product/variant/offer validation. */
function checkScooterProduct(p: ScooterProduct): string[] {
  const errs: string[] = [];
  const dims = p.dimensions ?? {};
  for (const k of DIMENSION_KEYS[p.category]) {
    if (typeof dims[k] !== "number") errs.push(`dimensions.${k} (mm) is required for ${p.category}`);
  }
  if (typeof p.compatibility !== "object" || p.compatibility === null) errs.push("compatibility must be an object");
  errs.push(...validateStyle(p.category, p.style));
  return errs;
}

/**
 * Validates raw catalog JSON (hand-edited, agent-generated or scraped) and
 * flattens it into one buildable part per colourway. Fails loudly, naming the
 * product/variant/offer and field.
 */
export function loadScooterCatalog(rawProducts: unknown, retailers: readonly Retailer[]): ScooterPart[] {
  const products = validateCatalog<ScooterProduct>(rawProducts, retailers, {
    file: "scooter-products.json",
    categories: CATEGORIES,
    checkProduct: checkScooterProduct,
  });
  return flattenCatalog<ScooterCategory, ScooterProduct>(products, retailers);
}
