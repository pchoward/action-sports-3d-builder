import type { Part, RetailerOffer } from "./types";

/** Cheapest in-stock offer; falls back to cheapest overall if nothing is in stock. */
export function bestOffer(part: Part): RetailerOffer | undefined {
  const inStock = part.retailers.filter((r) => r.inStock);
  const pool = inStock.length ? inStock : part.retailers;
  return pool.reduce<RetailerOffer | undefined>(
    (best, r) => (!best || r.price < best.price ? r : best),
    undefined,
  );
}

export const gramsToLbs = (g: number) => g / 453.59237;

export const formatPrice = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export const formatWeight = (g: number) =>
  `${Math.round(g).toLocaleString()} g · ${gramsToLbs(g).toFixed(2)} lb`;
