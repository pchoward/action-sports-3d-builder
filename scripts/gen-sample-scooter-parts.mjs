// Generates src/data/scooter-parts.json (sample catalog; prices & URLs are placeholders).
import { writeFileSync } from "node:fs";

const SHOPS = {
  vault: (q) => ["The Vault Pro Scooters", `https://www.thevaultproscooters.com/search?q=${q}`],
  skatepro: (q) => ["SkatePro", `https://www.skatepro.com/en-us/search?q=${q}`],
  broadway: (q) => ["Broadway Pro Scooters", `https://www.google.com/search?q=Broadway+Pro+Scooters+${q}`],
};
const offer = (shop, name, price, inStock = true, isShredDeal = false) => {
  const [shopName, affiliateUrl] = SHOPS[shop](encodeURIComponent(name).replace(/%20/g, "+"));
  return { shopName, price, inStock, affiliateUrl, ...(isShredDeal ? { isShredDeal } : {}) };
};
const part = (p, offers) => ({ ...p, retailers: offers.map((o) => offer(o[0], p.name, ...o.slice(1))) });

const parts = [
  // ── Decks ────────────────────────────────────────────────
  part({ id: "deck-tilt-formula-55", name: "Formula Deck 5.5\"", brand: "Tilt", category: "deck", weightGrams: 2450, colorHex: "#1b1b1f", finish: "matte",
    dimensions: { length: 520, width: 140, thickness: 38, headtubeLength: 118, neckHeight: 86, neckReach: 42 },
    compatibility: { wheelSize: [110, 120], axle: "12mm", headset: "integrated", headtubeAngle: 83 } },
    [["vault", 199.99], ["skatepro", 189.95, true, true], ["broadway", 204.99, false]]),
  part({ id: "deck-envy-street-50", name: "Street Deck 5.0\"", brand: "Envy", category: "deck", weightGrams: 2300, colorHex: "#c9ccd2", finish: "raw",
    dimensions: { length: 510, width: 127, thickness: 36, headtubeLength: 115, neckHeight: 84, neckReach: 40 },
    compatibility: { wheelSize: [110, 120], axle: "8mm", headset: "integrated", headtubeAngle: 83 } },
    [["vault", 179.99], ["broadway", 174.99]]),
  part({ id: "deck-ethic-park-47", name: "Park Deck 4.7\"", brand: "Ethic DTC", category: "deck", weightGrams: 2150, colorHex: "#1f6fd9", finish: "anodized",
    dimensions: { length: 495, width: 120, thickness: 35, headtubeLength: 112, neckHeight: 80, neckReach: 38 },
    compatibility: { wheelSize: [110], axle: "8mm", headset: "standard", headtubeAngle: 84 } },
    [["skatepro", 164.95], ["vault", 169.99, false]]),
  part({ id: "deck-root-air-50", name: "AIR Deck 5.0\"", brand: "Root Industries", category: "deck", weightGrams: 2380, colorHex: "#d9a426", finish: "anodized",
    dimensions: { length: 500, width: 127, thickness: 38, headtubeLength: 120, neckHeight: 88, neckReach: 44 },
    compatibility: { wheelSize: [110, 120], axle: "12mm", headset: "integrated", headtubeAngle: 83 } },
    [["vault", 219.99, true, true], ["skatepro", 229.95], ["broadway", 224.99]]),

  // ── Forks ────────────────────────────────────────────────
  part({ id: "fork-tilt-theory", name: "Theory Threadless Fork", brand: "Tilt", category: "fork", weightGrams: 440, colorHex: "#18181b", finish: "anodized",
    dimensions: { steererLength: 165, steererDiameter: 28.6, legLength: 82 },
    compatibility: { compression: ["SCS", "HIC"], wheelSize: [110, 120], axle: "12mm" } },
    [["vault", 69.99], ["skatepro", 64.95, true, true]]),
  part({ id: "fork-envy-ihc", name: "IHC Fork", brand: "Envy", category: "fork", weightGrams: 400, colorHex: "#d6d8dc", finish: "raw",
    dimensions: { steererLength: 160, steererDiameter: 28.6, legLength: 80 },
    compatibility: { compression: ["IHC"], wheelSize: [110, 120], axle: "8mm" } },
    [["vault", 49.99], ["broadway", 47.99]]),
  part({ id: "fork-ethic-110", name: "Threadless Fork 110", brand: "Ethic DTC", category: "fork", weightGrams: 380, colorHex: "#1f6fd9", finish: "anodized",
    dimensions: { steererLength: 168, steererDiameter: 28.6, legLength: 76 },
    compatibility: { compression: ["SCS", "HIC"], wheelSize: [110], axle: "8mm" } },
    [["skatepro", 74.95], ["vault", 79.99]]),
  part({ id: "fork-native-threadless", name: "Threadless Fork", brand: "Native", category: "fork", weightGrams: 460, colorHex: "#c62828", finish: "anodized",
    dimensions: { steererLength: 172, steererDiameter: 28.6, legLength: 84 },
    compatibility: { compression: ["SCS", "HIC"], wheelSize: [110, 120], axle: "12mm" } },
    [["vault", 84.99, true, true], ["broadway", 89.99]]),

  // ── Headsets ─────────────────────────────────────────────
  part({ id: "headset-tilt-integrated", name: "Integrated Headset", brand: "Tilt", category: "headset", weightGrams: 110, colorHex: "#26262b", finish: "matte",
    dimensions: { stackTop: 10, stackBottom: 6 }, compatibility: { headset: "integrated" } },
    [["vault", 24.99], ["skatepro", 22.95]]),
  part({ id: "headset-native-sealed", name: "Sealed Integrated Headset", brand: "Native", category: "headset", weightGrams: 95, colorHex: "#d9a426", finish: "anodized",
    dimensions: { stackTop: 8, stackBottom: 5 }, compatibility: { headset: "integrated" } },
    [["vault", 29.99, true, true], ["broadway", 31.99]]),
  part({ id: "headset-ethic-standard", name: "Standard Headset", brand: "Ethic DTC", category: "headset", weightGrams: 140, colorHex: "#1f6fd9", finish: "anodized",
    dimensions: { stackTop: 14, stackBottom: 10 }, compatibility: { headset: "standard" } },
    [["skatepro", 19.95], ["vault", 21.99]]),

  // ── Clamps ───────────────────────────────────────────────
  part({ id: "clamp-tilt-scs", name: "SCS Clamp", brand: "Tilt", category: "clamp", weightGrams: 300, colorHex: "#18181b", finish: "anodized",
    dimensions: { height: 62, outerDiameter: 46, minInsertion: 20 },
    compatibility: { compression: ["SCS"], barDiameter: [31.8, 34.9] } },
    [["vault", 54.99], ["skatepro", 49.95, true, true], ["broadway", 54.99]]),
  part({ id: "clamp-envy-hic", name: "HIC Double Clamp", brand: "Envy", category: "clamp", weightGrams: 170, colorHex: "#d6d8dc", finish: "raw",
    dimensions: { height: 45, outerDiameter: 42, minInsertion: 25 },
    compatibility: { compression: ["HIC"], barDiameter: [34.9] } },
    [["vault", 29.99], ["broadway", 27.99]]),
  part({ id: "clamp-ethic-ihc", name: "IHC Clamp", brand: "Ethic DTC", category: "clamp", weightGrams: 150, colorHex: "#1f6fd9", finish: "anodized",
    dimensions: { height: 45, outerDiameter: 38, minInsertion: 25 },
    compatibility: { compression: ["IHC"], barDiameter: [31.8] } },
    [["skatepro", 27.95], ["vault", 29.99, false]]),
  part({ id: "clamp-proto-scs", name: "Full SCS Clamp", brand: "Proto", category: "clamp", weightGrams: 280, colorHex: "#c62828", finish: "anodized",
    dimensions: { height: 60, outerDiameter: 45, minInsertion: 20 },
    compatibility: { compression: ["SCS"], barDiameter: [31.8, 34.9] } },
    [["vault", 59.99], ["skatepro", 57.95]]),

  // ── Bars ─────────────────────────────────────────────────
  part({ id: "bars-tilt-classic-os", name: "Classic Oversized Bars", brand: "Tilt", category: "bars", weightGrams: 1150, colorHex: "#18181b", finish: "matte",
    dimensions: { height: 600, width: 580, outerDiameter: 34.9 }, compatibility: { compression: ["SCS", "HIC"] } },
    [["vault", 89.99], ["skatepro", 84.95, true, true], ["broadway", 92.99]]),
  part({ id: "bars-envy-std", name: "Standard Bars", brand: "Envy", category: "bars", weightGrams: 1050, colorHex: "#d6d8dc", finish: "raw",
    dimensions: { height: 560, width: 560, outerDiameter: 31.8 }, compatibility: { compression: ["SCS", "IHC"] } },
    [["vault", 69.99], ["broadway", 64.99]]),
  part({ id: "bars-ethic-titanium", name: "Titanium Bars", brand: "Ethic DTC", category: "bars", weightGrams: 850, colorHex: "#b8b2a3", finish: "raw",
    dimensions: { height: 620, width: 600, outerDiameter: 31.8 }, compatibility: { compression: ["SCS", "IHC"] } },
    [["skatepro", 249.95], ["vault", 259.99, true, true]]),
  part({ id: "bars-root-tall-os", name: "Tall Oversized Bars", brand: "Root Industries", category: "bars", weightGrams: 1250, colorHex: "#2e7d32", finish: "gloss",
    dimensions: { height: 650, width: 610, outerDiameter: 34.9 }, compatibility: { compression: ["SCS", "HIC"] } },
    [["vault", 99.99], ["skatepro", 104.95], ["broadway", 99.99, false]]),

  // ── Grips ────────────────────────────────────────────────
  part({ id: "grips-odi-longneck-black", name: "Longneck Grips", brand: "ODI", category: "grips", weightGrams: 120, colorHex: "#111113", finish: "matte",
    dimensions: { length: 160, outerDiameter: 31 }, compatibility: {} },
    [["vault", 12.99], ["skatepro", 11.95], ["broadway", 12.99]]),
  part({ id: "grips-tilt-blue", name: "Pro Grips", brand: "Tilt", category: "grips", weightGrams: 110, colorHex: "#1e88e5", finish: "matte",
    dimensions: { length: 150, outerDiameter: 30 }, compatibility: {} },
    [["vault", 9.99, true, true], ["skatepro", 10.95]]),
  part({ id: "grips-root-white", name: "R2 Grips", brand: "Root Industries", category: "grips", weightGrams: 115, colorHex: "#f2f2ee", finish: "matte",
    dimensions: { length: 165, outerDiameter: 32 }, compatibility: {} },
    [["vault", 13.99], ["broadway", 12.49]]),

  // ── Wheels (weight & price per pair) ─────────────────────
  part({ id: "wheels-tilt-120-12std", name: "Stage II 120mm Wheels (pair)", brand: "Tilt", category: "wheels", weightGrams: 780, colorHex: "#2a2a2e", secondaryHex: "#f4f4f0", finish: "anodized",
    dimensions: { diameter: 120, width: 26 }, compatibility: { wheelSize: [120], core: "12STD" } },
    [["vault", 89.99], ["skatepro", 84.95, true, true], ["broadway", 89.99]]),
  part({ id: "wheels-envy-110-8std", name: "Hollow Core 110mm Wheels (pair)", brand: "Envy", category: "wheels", weightGrams: 680, colorHex: "#d6d8dc", secondaryHex: "#141416", finish: "raw",
    dimensions: { diameter: 110, width: 24 }, compatibility: { wheelSize: [110], core: "8STD" } },
    [["vault", 59.99], ["broadway", 54.99]]),
  part({ id: "wheels-root-110-12std", name: "AIR 110mm Wheels (pair)", brand: "Root Industries", category: "wheels", weightGrams: 720, colorHex: "#d9a426", secondaryHex: "#1b1b1f", finish: "anodized",
    dimensions: { diameter: 110, width: 26 }, compatibility: { wheelSize: [110], core: "12STD" } },
    [["vault", 79.99, true, true], ["skatepro", 82.95]]),
  part({ id: "wheels-native-120-12std", name: "Stalker 120mm Wheels (pair)", brand: "Native", category: "wheels", weightGrams: 800, colorHex: "#c62828", secondaryHex: "#f4f4f0", finish: "anodized",
    dimensions: { diameter: 120, width: 26 }, compatibility: { wheelSize: [120], core: "12STD" } },
    [["vault", 94.99], ["broadway", 92.99, false]]),

  // ── Grip tape ────────────────────────────────────────────
  part({ id: "griptape-tilt-black-6", name: "Black Grip Tape 6\"", brand: "Tilt", category: "griptape", weightGrams: 60, colorHex: "#141416", finish: "matte",
    dimensions: { length: 584, width: 152 }, compatibility: {} },
    [["vault", 9.99], ["skatepro", 8.95]]),
  part({ id: "griptape-root-clear-5", name: "Clear Grip Tape 5\"", brand: "Root Industries", category: "griptape", weightGrams: 50, colorHex: "#3a3d44", finish: "matte",
    dimensions: { length: 560, width: 127 }, compatibility: {} },
    [["vault", 11.99, true, true], ["broadway", 12.99]]),
  part({ id: "griptape-envy-camo-5", name: "Camo Grip Tape 5\"", brand: "Envy", category: "griptape", weightGrams: 55, colorHex: "#4b5a3a", finish: "matte",
    dimensions: { length: 560, width: 127 }, compatibility: {} },
    [["vault", 10.99], ["broadway", 9.99]]),
];

writeFileSync(process.argv[2], JSON.stringify(parts, null, 2) + "\n");
console.log(`wrote ${parts.length} parts`);
