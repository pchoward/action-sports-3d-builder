import { create, type StoreApi, type UseBoundStore } from "zustand";
import { bestOffer, gramsToLbs } from "@/core/pricing";
import type { Build, CompatibilityIssue, Part, RetailerOffer, SportModule } from "@/core/types";

export interface PricedLine<Cat extends string, P extends Part<Cat>> {
  category: Cat;
  part: P;
  offer: RetailerOffer | undefined;
  issues: CompatibilityIssue<Cat>[];
}

export interface BuilderState<Cat extends string, P extends Part<Cat>> {
  sportId: string;
  /** Selected part id per slot. */
  selectedIds: Partial<Record<Cat, string>>;
  activeCategory: Cat;

  // ── Derived (recomputed on every selection change) ──
  build: Build<Cat, P>;
  lines: PricedLine<Cat, P>[];
  totalWeightGrams: number;
  totalWeightLbs: number;
  /** Sum of the cheapest in-stock offer for each selected part. */
  totalPrice: number;
  issues: CompatibilityIssue<Cat>[];
  missingRequired: Cat[];

  // ── Actions ──
  selectPart: (category: Cat, partId: string) => void;
  clearPart: (category: Cat) => void;
  setActiveCategory: (category: Cat) => void;
  nextCategory: () => void;
  prevCategory: () => void;
  loadBuild: (ids: Partial<Record<Cat, string>>) => void;
  resetBuild: () => void;
  /** Issues that would exist if `partId` replaced the current part in its slot. */
  previewIssues: (partId: string) => CompatibilityIssue<Cat>[];
  /** All colourways of a product, default first. */
  variantsOf: (productId: string) => P[];
}

export type BuilderStore<Cat extends string, P extends Part<Cat>> = UseBoundStore<
  StoreApi<BuilderState<Cat, P>>
>;

export function createBuilderStore<Cat extends string, P extends Part<Cat>>(
  sport: SportModule<Cat, P>,
): BuilderStore<Cat, P> {
  const byId = new Map(sport.parts.map((p) => [p.id, p]));
  // A product id resolves to its default (first) colourway — used by defaults and older share links.
  for (const p of sport.parts) if (!byId.has(p.productId)) byId.set(p.productId, p);
  const variantsOf = new Map<string, P[]>();
  for (const p of sport.parts) variantsOf.set(p.productId, [...(variantsOf.get(p.productId) ?? []), p]);
  const order = sport.categories.map((c) => c.id);

  const resolve = (ids: Partial<Record<Cat, string>>): Build<Cat, P> => {
    const build: Build<Cat, P> = {};
    for (const cat of order) {
      const id = ids[cat];
      const part = id ? byId.get(id) : undefined;
      if (part && part.category === cat) build[cat] = part;
    }
    return build;
  };

  const derive = (ids: Partial<Record<Cat, string>>) => {
    const build = resolve(ids);
    const issues = sport.checkCompatibility(build);
    const lines: PricedLine<Cat, P>[] = [];
    let totalWeightGrams = 0;
    let totalPrice = 0;
    for (const cat of order) {
      const part = build[cat];
      if (!part) continue;
      const offer = bestOffer(part);
      totalWeightGrams += part.weightGrams;
      totalPrice += offer?.price ?? 0;
      lines.push({ category: cat, part, offer, issues: issues.filter((i) => i.slots.includes(cat)) });
    }
    const selectedIds = Object.fromEntries(
      Object.entries(build).map(([cat, p]) => [cat, (p as P).id]),
    ) as Partial<Record<Cat, string>>;
    return {
      selectedIds,
      build,
      lines,
      issues,
      totalWeightGrams,
      totalWeightLbs: gramsToLbs(totalWeightGrams),
      totalPrice: Math.round(totalPrice * 100) / 100,
      missingRequired: sport.categories.filter((c) => c.required && !build[c.id]).map((c) => c.id),
    };
  };

  const step = (current: Cat, delta: number) =>
    order[(order.indexOf(current) + delta + order.length) % order.length];

  return create<BuilderState<Cat, P>>()((set, get) => ({
    sportId: sport.id,
    activeCategory: order[0],
    ...derive(sport.defaultBuild),

    selectPart: (category, partId) =>
      set((s) => derive({ ...s.selectedIds, [category]: partId })),
    clearPart: (category) =>
      set((s) => {
        const next = { ...s.selectedIds };
        delete next[category];
        return derive(next);
      }),
    setActiveCategory: (activeCategory) => set({ activeCategory }),
    nextCategory: () => set((s) => ({ activeCategory: step(s.activeCategory, 1) })),
    prevCategory: () => set((s) => ({ activeCategory: step(s.activeCategory, -1) })),
    loadBuild: (ids) => set(derive(ids)),
    resetBuild: () => set(derive(sport.defaultBuild)),
    previewIssues: (partId) => {
      const part = byId.get(partId);
      if (!part) return [];
      const build = { ...get().build, [part.category]: part };
      return sport.checkCompatibility(build).filter((i) => i.slots.includes(part.category));
    },
    variantsOf: (productId) => variantsOf.get(productId) ?? [],
  }));
}
