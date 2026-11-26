/**
 * Validates the catalog JSON without starting the app. Run after hand edits,
 * agent-generated data or scraper output:
 *
 *   npm run catalog:check
 */
import type { Retailer } from "@/core/catalog";
import retailers from "@/data/retailers.json";
import products from "@/data/scooter-products.json";
import { loadScooterCatalog } from "@/sports/scooter/catalog";
import { checkScooterCompatibility } from "@/sports/scooter/compatibility";
import { scooterModule } from "@/sports/scooter";

try {
  const parts = loadScooterCatalog(products, retailers as Retailer[]);
  const productCount = new Set(parts.map((p) => p.productId)).size;
  const offers = parts.flatMap((p) => p.retailers);
  const stale = offers.filter((o) => o.lastChecked && Date.now() - Date.parse(o.lastChecked) > 7 * 864e5);
  console.log(`✓ ${productCount} products · ${parts.length} variants · ${offers.length} offers · ${retailers.length} retailers`);
  for (const c of scooterModule.categories) {
    const n = new Set(parts.filter((p) => p.category === c.id).map((p) => p.productId)).size;
    if (n === 0) console.warn(`  ! no products for slot "${c.id}"`);
  }
  if (stale.length) console.warn(`  ! ${stale.length} offers not checked in the last 7 days`);
  const noOffers = parts.filter((p) => p.retailers.length === 0);
  if (noOffers.length) console.warn(`  ! ${noOffers.length} variants have no offers: ${noOffers.map((p) => p.id).join(", ")}`);
  // Default build must resolve and be compatible.
  const byId = new Map(parts.flatMap((p) => [[p.id, p], [p.productId, p]] as const).reverse());
  const build = Object.fromEntries(
    Object.entries(scooterModule.defaultBuild).map(([cat, id]) => [cat, byId.get(id as string)]),
  );
  const missing = Object.entries(build).filter(([, p]) => !p).map(([c]) => c);
  if (missing.length) throw new Error(`default build references unknown ids for: ${missing.join(", ")}`);
  const issues = checkScooterCompatibility(build);
  if (issues.length) throw new Error(`default build has compatibility issues:\n  ${issues.map((i) => i.message).join("\n  ")}`);
  console.log("✓ default build resolves and is compatible");
} catch (e) {
  console.error(`✗ ${(e as Error).message}`);
  process.exit(1);
}
