# Action Sports 3D Builder — Phase 1: Pro Scooters

A PCPartPicker-style custom builder for action sports, in real-time 3D: pick parts, catch
compatibility problems before you buy, compare prices across shops, and share builds by link.

**Stack:** Next.js 16 (App Router, TypeScript, Tailwind 4) · React Three Fiber 9 · drei 10 · three · Zustand 5

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build + type-check
npm run typecheck  # route typegen + tsc
npm run images -- <files|folders> [--kind product|graphic]   # convert images to WebP
npm run catalog:sample   # regenerate the sample catalog
```

## Architecture

```
src/
├─ core/                     Sport-agnostic. Knows nothing about scooters.
│  ├─ types.ts               Part, RetailerOffer, CategoryDef, CompatibilityIssue, SportModule
│  ├─ pricing.ts             bestOffer() = cheapest in-stock retailer; weight/price formatting
│  ├─ share.ts               ?sport=…&<slot>=<partId> permalink (de)serialization
│  └─ scene.ts               SceneProps every sport's 3D scene receives
├─ store/
│  ├─ createBuilderStore.ts  Generic Zustand store factory: selection, steps, derived totals,
│  │                         compatibility issues, previewIssues(partId) for the selector
│  └─ useBuilderStore.ts     Phase 1 binding: createBuilderStore(scooterModule)
├─ sports/
│  ├─ registry.ts            Pluggable sport modules (add `skateboard` here in Phase 2)
│  └─ scooter/
│     ├─ index.ts            scooterModule: slots, default build, spec chips
│     ├─ types.ts            ScooterPart, compression/wheel/axle/headset enums, DIMENSION_KEYS
│     ├─ catalog.ts          Runtime validator for catalog JSON (fails loudly on bad agent data)
│     ├─ compatibility.ts    Deterministic rules (pure function)
│     ├─ style.ts            Template style schema (validated, with defaults)
│     ├─ geometry.ts         Mount-chain solver: part mm dimensions → 3D rig
│     └─ templates/          Parametric part templates + PBR finish materials
├─ data/scooter-parts.json   Sample catalog (29 parts × 8 slots)
└─ components/
   ├─ BuilderUI.tsx          Generic UI: viewport + step selector + parts-list table
   ├─ ScooterScene.tsx       Canvas, studio lighting, HDRI, ContactShadows, OrbitControls
   └─ ScooterBuilder.tsx     Wires scooter module + store + scene (scene loaded client-only)
```

### Compatibility rules (scooter)

| Rule | Severity |
|---|---|
| Clamp compression (SCS/HIC/IHC) must be supported by fork **and** bars | error |
| Bar outer diameter must fit the clamp bore (31.8 std / 34.9 oversized) | error |
| Standard bars in an oversized SCS clamp → needs shim | warning |
| Wheel diameter must fit deck **and** fork clearance (110/120) | error |
| 8STD wheel on a 12mm axle | error |
| 12STD wheel on an 8mm axle → conversion bearings | warning |
| Headset type (integrated/standard) must match deck | error |
| Steerer length vs headtube + headset stack + clamp: too short | error |
| …too long → cut or add spacers | warning |
| Grip tape narrower/shorter than deck | warning |

### 3D mount hierarchy

`geometry.ts` solves the chain *rear axle → deck → headtube (θ≈83°) → headset → clamp → bars → grips*
and *headtube → fork → front axle* from catalog millimetres, then pitches the chassis so both wheels
touch the ground. A longer fork tilts the scooter rather than floating or clipping a wheel.
Group names (`mount_headtube`, `mount_front_axle`, `mount_clamp`, `mount_grips`) mirror the named
empties expected in Blender `.glb` exports, so procedural meshes can be swapped for real models
without touching the solver.

## Parametric templates

Every part is drawn by a template driven by its catalog **dimensions (mm)**, **colour/finish** and an
optional **`style`** object. A new part is one JSON row, with no 3D modelling. Styles are validated against
`src/sports/scooter/style.ts`; omitted keys use defaults.

| Slot | Style options |
|---|---|
| deck | `body` box\|boxless · `nose` square\|rounded · `neck` solid\|cutout\|double · `brake` fender\|flex · `sideSlots` 0–4 · `sideText` |
| fork | `legs` straight\|tapered · `cutouts` |
| clamp | `shape` round\|faceted · `bolts` 0 (auto from compression)–4 · `slit` |
| bars | `shape` T\|Y · `gussets` · `backsweep`° · `upsweep`° |
| grips | `pattern` ribbed\|diamond\|smooth · `flange` |
| wheels | `core` spoked\|hollow\|solid\|fullcore · `spokes` 3–10 · `profile` round\|flat |
| griptape | `pattern` plain\|logo\|camo\|stripe · `accentHex` · or real artwork via `images.graphic` |

```json
{ "id": "bars-lucky-y-os", "category": "bars", "dimensions": { "height": 600, "width": 590, "outerDiameter": 34.9 },
  "style": { "shape": "Y", "backsweep": 3 }, "...": "..." }
```

Add `?cam=px,py,pz,tx,ty,tz` (metres) to any build URL to set the camera, which is handy for screenshots and visual QA.
A real `.glb` for a hero part can later render at the same mount point; the rig doesn't change.

## Images (WebP only)

Parts may carry `images: { product?, graphic? }`:
- `product`: photo shown as the thumbnail in the selector and parts list
- `graphic`: flat print artwork mapped onto the 3D template (grip tape today; skateboard deck graphics in Phase 2)

Every image must be **`.webp`**, either under `/images/` (served from `public/images/`) or an `https://` URL. The catalog
validator rejects anything else. Convert with:

```bash
npm run images -- ~/Downloads/deck-photos --kind product     # → public/images/products/*.webp (≤1200px, q80)
npm run images -- art/flames.svg --kind graphic               # → public/images/graphics/*.webp (≤2048px, q88, alpha)
```

The script prints the `/images/...webp` path to paste into the catalog.

> ⚠️ Product photos and brand artwork are copyrighted. Use your own photos, assets you have
> permission for (many brands will share them for a listing), or original artwork.

## Catalog data

Each part: `id, name, brand, category, weightGrams, colorHex, secondaryHex?, finish, dimensions (mm),
compatibility, style?, images?, retailers[{ shopName, price, inStock, affiliateUrl, isShredDeal? }]`.
Required dimension keys per category are listed in `src/sports/scooter/types.ts → DIMENSION_KEYS`
and enforced at load by `catalog.ts`.

> ⚠️ **The current catalog is sample data.** Prices, stock and URLs are placeholders. Specs are
> plausible, not verified, and retailer links are search URLs, not affiliate links. Regenerate with
> `npm run catalog:sample`, or replace it with output from
> the shared ShredDeals scraper pipeline.

## Adding a sport (Phase 2: skateboards)

1. `src/sports/skateboard/{types,compatibility,geometry,index}.ts` → export a `SportModule`
   (deck/trucks/wheels/bearings/hardware/griptape/risers; rules: deck width ↔ axle width,
   wheel diameter ↔ truck height + risers for wheelbite).
2. `src/data/skateboard-parts.json` + validator.
3. A `SkateboardScene.tsx` implementing `SceneProps`.
4. Register in `src/sports/registry.ts` and add a route that renders
   `<BuilderUI sport={…} useStore={createBuilderStore(…)} Scene={…} />`.

The store, pricing, share links and UI need no changes.

## Credits

`public/hdri/city.exr`: CC0, from [`@pmndrs/assets`](https://github.com/pmndrs/assets). Self-hosted so a CDN outage can't break the viewport.
