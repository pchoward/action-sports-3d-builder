/**
 * Catalog data model (what lives in JSON and what scrapers/agents write):
 *
 *   Retailer  ──┐
 *   Product ─< Variant ─< Offer (retailerId → Retailer)
 *
 * - Product: specs shared by every colourway (dimensions, compatibility, style…)
 * - Variant: one buyable colourway, with colour, optional finish/weight/image overrides
 * - Offer:   one store's price + stock for that variant
 *
 * `flattenCatalog` turns this into `Part`s (one per variant) for the builder.
 */
import { validateImages } from "./images";
import type { Finish, Part, PartImages, RetailerOffer } from "./types";

export interface Retailer {
  id: string;
  name: string;
  homepage: string;
  country?: string;
  /**
   * Affiliate link template. `{url}` is replaced with the URL-encoded product URL,
   * e.g. "https://www.avantlink.com/click.php?tt=cl&mi=123&pw=456&url={url}".
   * null = link straight to the product.
   */
  affiliate?: { network: string; urlTemplate: string } | null;
}

export interface Offer {
  retailerId: string;
  price: number;
  compareAtPrice?: number;
  inStock: boolean;
  /** Canonical product page at the retailer (un-wrapped). */
  url: string;
  /** Retailer's own SKU / variant id, used by scrapers to re-match the listing. */
  sku?: string;
  /** ISO date (YYYY-MM-DD or full timestamp) the offer was last verified. */
  lastChecked: string;
  isShredDeal?: boolean;
}

export interface Variant {
  /** Globally unique. Convention: `<productId>--<colour-slug>`. */
  id: string;
  colorName: string;
  colorHex: string;
  secondaryHex?: string;
  /** Overrides the product finish (e.g. a raw/polished colourway of an anodized part). */
  finish?: Finish;
  /** Overrides the product weight when a colourway differs. */
  weightGrams?: number;
  images?: PartImages;
  offers: Offer[];
}

export interface Product<Cat extends string = string> {
  id: string;
  name: string;
  brand: string;
  category: Cat;
  weightGrams: number;
  finish: Finish;
  /** All lengths in millimetres. */
  dimensions: Record<string, number>;
  images?: PartImages;
  /** Unit that price and weight refer to (wheels are usually sold as a pair). Default "each". */
  soldAs?: "each" | "pair";
  /** First variant is the default colourway. */
  variants: Variant[];
}

const FINISHES: Finish[] = ["gloss", "matte", "anodized", "raw"];
const HEX = /^#[0-9a-fA-F]{6}$/;
const DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2})?)?$/;

/** Wraps a product URL with the retailer's affiliate template, if it has one. */
export function affiliateUrl(retailer: Retailer | undefined, url: string) {
  const tpl = retailer?.affiliate?.urlTemplate;
  return tpl ? tpl.replace("{url}", encodeURIComponent(url)) : url;
}

/**
 * Validates the shared product/variant/offer structure. Sport-specific fields
 * (dimension keys, compatibility, style) are checked by the sport's own
 * validator via `checkProduct`.
 */
export function validateCatalog<Prod extends Product>(
  raw: unknown,
  retailers: readonly Retailer[],
  { file, categories, checkProduct }: {
    file: string;
    categories: readonly string[];
    checkProduct?: (p: Prod) => string[];
  },
): Prod[] {
  if (!Array.isArray(raw)) throw new Error(`${file} must be an array of products`);
  const retailerIds = new Set(retailers.map((r) => r.id));
  const productIds = new Set<string>();
  const variantIds = new Set<string>();
  const problems: string[] = [];

  raw.forEach((p: Record<string, unknown>, i) => {
    const at = (msg: string) => problems.push(`${file}[${i}] (${String(p?.id)}): ${msg}`);
    if (typeof p.id !== "string" || !p.id) return at("missing id");
    if (productIds.has(p.id)) at("duplicate product id");
    productIds.add(p.id);
    for (const k of ["name", "brand"]) if (typeof p[k] !== "string" || !p[k]) at(`missing ${k}`);
    if (!categories.includes(p.category as string)) at(`unknown category "${p.category}"`);
    if (typeof p.weightGrams !== "number" || p.weightGrams <= 0) at("weightGrams must be a positive number");
    if (!FINISHES.includes(p.finish as Finish)) at(`finish must be one of ${FINISHES.join(", ")}`);
    validateImages(p.images).forEach(at);
    if (p.soldAs !== undefined && p.soldAs !== "each" && p.soldAs !== "pair") at('soldAs must be "each" or "pair"');

    const variants = p.variants as Record<string, unknown>[] | undefined;
    if (!Array.isArray(variants) || variants.length === 0) return at("needs at least one variant");
    variants.forEach((v, j) => {
      const vat = (msg: string) => at(`variants[${j}] (${String(v?.id)}): ${msg}`);
      if (typeof v.id !== "string" || !v.id) return vat("missing id");
      if (variantIds.has(v.id)) vat("duplicate variant id");
      variantIds.add(v.id);
      if (typeof v.colorName !== "string" || !v.colorName) vat("missing colorName");
      if (typeof v.colorHex !== "string" || !HEX.test(v.colorHex)) vat("colorHex must be #rrggbb");
      if (v.secondaryHex !== undefined && (typeof v.secondaryHex !== "string" || !HEX.test(v.secondaryHex)))
        vat("secondaryHex must be #rrggbb");
      if (v.finish !== undefined && !FINISHES.includes(v.finish as Finish)) vat(`finish must be one of ${FINISHES.join(", ")}`);
      validateImages(v.images).forEach(vat);
      const offers = v.offers as Record<string, unknown>[] | undefined;
      if (!Array.isArray(offers)) return vat("offers must be an array (may be empty)");
      const seenShops = new Set<string>();
      offers.forEach((o, k) => {
        const oat = (msg: string) => vat(`offers[${k}] (${String(o?.retailerId)}): ${msg}`);
        if (!retailerIds.has(o.retailerId as string)) oat("unknown retailerId (add it to retailers.json)");
        if (seenShops.has(o.retailerId as string)) oat("duplicate offer for the same retailer");
        seenShops.add(o.retailerId as string);
        if (typeof o.price !== "number" || o.price <= 0) oat("price must be a positive number");
        if (o.compareAtPrice !== undefined && (typeof o.compareAtPrice !== "number" || o.compareAtPrice <= (o.price as number)))
          oat("compareAtPrice must be higher than price");
        if (typeof o.inStock !== "boolean") oat("inStock must be true/false");
        if (typeof o.url !== "string" || !o.url.startsWith("https://")) oat("url must be an https:// link");
        if (typeof o.lastChecked !== "string" || !DATE.test(o.lastChecked)) oat("lastChecked must be an ISO date");
      });
    });
    if (problems.length === 0 && checkProduct) checkProduct(p as Prod).forEach(at);
  });

  // Builds accept product ids too (→ default variant), so the two id spaces must not collide.
  (raw as Prod[]).forEach((p) =>
    p.variants?.forEach((v) => {
      if (v.id !== p.id && productIds.has(v.id)) problems.push(`${file}: variant id "${v.id}" collides with a product id`);
    }),
  );

  if (problems.length) {
    const shown = problems.slice(0, 20).join("\n  ");
    throw new Error(`Catalog has ${problems.length} problem(s):\n  ${shown}${problems.length > 20 ? "\n  …" : ""}`);
  }
  return raw as Prod[];
}

/** One `Part` per variant: product specs + variant overrides + resolved offers. */
export function flattenCatalog<Cat extends string, Prod extends Product<Cat>>(
  products: readonly Prod[],
  retailers: readonly Retailer[],
): (Omit<Prod, "variants"> & Part<Cat>)[] {
  const byId = new Map(retailers.map((r) => [r.id, r]));
  return products.flatMap((product) => {
    const { variants, ...spec } = product;
    return variants.map((v) => {
      const offers: RetailerOffer[] = v.offers.map((o) => {
        const retailer = byId.get(o.retailerId);
        return {
          retailerId: o.retailerId,
          shopName: retailer?.name ?? o.retailerId,
          price: o.price,
          compareAtPrice: o.compareAtPrice,
          inStock: o.inStock,
          affiliateUrl: affiliateUrl(retailer, o.url),
          lastChecked: o.lastChecked,
          isShredDeal: o.isShredDeal,
        };
      });
      return {
        ...spec,
        id: v.id,
        productId: product.id,
        colorName: v.colorName,
        colorHex: v.colorHex,
        secondaryHex: v.secondaryHex,
        finish: v.finish ?? product.finish,
        weightGrams: v.weightGrams ?? product.weightGrams,
        images: v.images || product.images ? { ...product.images, ...v.images } : undefined,
        retailers: offers,
      };
    });
  });
}
