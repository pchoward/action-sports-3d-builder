"use client";

import { Fragment, useEffect, useRef, useState, type ComponentType } from "react";
import { bestOffer, formatPrice, formatWeight } from "@/core/pricing";
import type { SceneProps } from "@/core/scene";
import { parseBuild, serializeBuild } from "@/core/share";
import type { CompatibilityIssue, Part, SportModule } from "@/core/types";
import type { BuilderStore } from "@/store/createBuilderStore";

interface BuilderUIProps<Cat extends string, P extends Part<Cat>> {
  sport: SportModule<Cat, P>;
  useStore: BuilderStore<Cat, P>;
  Scene: ComponentType<SceneProps<Cat, P>>;
}

/* ───────────────────────────── small pieces ───────────────────────────── */

function CompatBadge({ issues }: { issues: CompatibilityIssue[] }) {
  const hasError = issues.some((i) => i.severity === "error");
  const cls = hasError
    ? "bg-red-500/15 text-red-300 ring-red-500/40"
    : issues.length
      ? "bg-amber-500/15 text-amber-300 ring-amber-500/40"
      : "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40";
  const label = hasError ? "Incompatible" : issues.length ? "Check" : "Compatible";
  return (
    <span
      title={issues.map((i) => i.message).join("\n") || "No conflicts with the rest of this build"}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${cls}`}
    >
      <span aria-hidden>{hasError ? "✕" : issues.length ? "!" : "✓"}</span>
      {label}
    </span>
  );
}

function DealBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-[11px] font-bold text-orange-300 ring-1 ring-orange-500/40">
      🔥 ShredDeals Hot Deal
    </span>
  );
}

function Swatch({ color }: { color: string }) {
  return (
    <span
      className="inline-block size-4 shrink-0 rounded-full ring-1 ring-white/20"
      style={{ background: color }}
      aria-hidden
    />
  );
}

/** Product photo (WebP) when the catalog has one, otherwise a colour swatch. */
function Thumb({ part, size = 40 }: { part: Part; size?: number }) {
  if (!part.images?.product) return <Swatch color={part.colorHex} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- catalog images are pre-optimized WebP
    <img
      src={part.images.product}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className="shrink-0 rounded-md bg-white object-contain ring-1 ring-white/10"
      style={{ width: size, height: size }}
    />
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {items.filter(Boolean).map((c) => (
        <span key={c} className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-zinc-400">
          {c}
        </span>
      ))}
    </div>
  );
}

/* ───────────────────────────── main UI ───────────────────────────── */

export default function BuilderUI<Cat extends string, P extends Part<Cat>>({
  sport,
  useStore,
  Scene,
}: BuilderUIProps<Cat, P>) {
  const s = useStore();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState<Cat | null>(null);
  const hydrated = useRef(false);
  const categoryIds = sport.categories.map((c) => c.id);

  // Load a shared build from the URL once, then keep the URL in sync as a permalink.
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      const ids = parseBuild(window.location.search, categoryIds);
      if (ids) {
        s.loadBuild(ids);
        return;
      }
    }
    let qs = serializeBuild(sport.id, s.selectedIds);
    const cam = new URLSearchParams(window.location.search).get("cam"); // keep viewer-only params
    if (cam) qs += `&cam=${cam}`;
    window.history.replaceState(null, "", `${window.location.pathname}?${qs}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.selectedIds]);

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}?${serializeBuild(sport.id, s.selectedIds)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this build link:", url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const activeDef = sport.categories.find((c) => c.id === s.activeCategory)!;
  const candidates = sport.parts.filter((p) => p.category === s.activeCategory);
  const errors = s.issues.filter((i) => i.severity === "error");
  const warnings = s.issues.filter((i) => i.severity === "warning");
  const status = errors.length
    ? { text: `${errors.length} incompatibilit${errors.length > 1 ? "ies" : "y"}`, cls: "text-red-300" }
    : warnings.length
      ? { text: `${warnings.length} warning${warnings.length > 1 ? "s" : ""}`, cls: "text-amber-300" }
      : s.missingRequired.length
        ? { text: `${s.missingRequired.length} slot${s.missingRequired.length > 1 ? "s" : ""} empty`, cls: "text-zinc-300" }
        : { text: "All parts compatible", cls: "text-emerald-300" };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">Phase 1 · {sport.name}</p>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Custom {sport.name} Builder</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={s.resetBuild}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"
          >
            Reset
          </button>
          <button
            onClick={share}
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-sky-400"
          >
            {copied ? "Link copied ✓" : "Share Build"}
          </button>
        </div>
      </header>

      {/* Top: viewport + step selector */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="relative h-[380px] overflow-hidden rounded-2xl border border-white/10 bg-[#0e1014] sm:h-[520px]">
          <Scene build={s.build} activeCategory={s.activeCategory} onSelectCategory={s.setActiveCategory} />
          <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-black/60 px-3 py-1 text-zinc-200 backdrop-blur">
              ⚖ {formatWeight(s.totalWeightGrams)}
            </span>
            <span className="rounded-full bg-black/60 px-3 py-1 text-zinc-200 backdrop-blur">
              💲 {formatPrice(s.totalPrice)}
            </span>
            <span className={`rounded-full bg-black/60 px-3 py-1 backdrop-blur ${status.cls}`}>● {status.text}</span>
          </div>
          <p className="pointer-events-none absolute bottom-3 left-3 text-[11px] text-zinc-500">
            Drag to orbit · scroll to zoom · click a part to edit it
          </p>
        </div>

        <aside className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-zinc-900/60 lg:h-[520px]">
          <nav className="grid grid-cols-4 gap-1 border-b border-white/10 p-2">
            {sport.categories.map((c, idx) => {
              const selected = s.build[c.id];
              const bad = s.issues.some((i) => i.slots.includes(c.id) && i.severity === "error");
              const active = c.id === s.activeCategory;
              return (
                <button
                  key={c.id}
                  onClick={() => s.setActiveCategory(c.id)}
                  className={`relative rounded-lg px-1.5 py-2 text-center text-xs font-medium transition ${
                    active ? "bg-sky-500/20 text-sky-200 ring-1 ring-sky-500/50" : "text-zinc-400 hover:bg-white/5"
                  }`}
                >
                  <span className="block text-[10px] text-zinc-500">{idx + 1}</span>
                  {c.label}
                  <span
                    className={`absolute right-1 top-1 size-1.5 rounded-full ${
                      bad ? "bg-red-400" : selected ? "bg-emerald-400" : c.required ? "bg-zinc-600" : "bg-transparent"
                    }`}
                  />
                </button>
              );
            })}
          </nav>

          <div className="flex items-baseline justify-between px-4 pt-3">
            <h2 className="text-lg font-semibold text-white">
              Choose {activeDef.label}
              {!activeDef.required && <span className="ml-2 text-xs font-normal text-zinc-500">optional</span>}
            </h2>
            {s.build[s.activeCategory] && (
              <button onClick={() => s.clearPart(s.activeCategory)} className="text-xs text-zinc-500 hover:text-zinc-300">
                Remove
              </button>
            )}
          </div>
          {activeDef.hint && <p className="px-4 pb-2 text-xs text-zinc-500">{activeDef.hint}</p>}

          <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3">
            {candidates.map((p) => {
              const selected = s.build[s.activeCategory]?.id === p.id;
              const offer = bestOffer(p);
              const preview = s.previewIssues(p.id);
              return (
                <li key={p.id}>
                  <button
                    onClick={() => s.selectPart(p.category, p.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selected ? "border-sky-500/60 bg-sky-500/10" : "border-white/5 bg-white/[0.02] hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Thumb part={p} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[11px] uppercase tracking-wide text-zinc-500">{p.brand}</p>
                            <p className="truncate text-sm font-semibold text-zinc-100">{p.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-white">{offer ? formatPrice(offer.price) : "—"}</p>
                            <p className="text-[11px] text-zinc-500">{p.weightGrams} g</p>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <CompatBadge issues={preview} />
                          {p.retailers.some((r) => r.isShredDeal) && <DealBadge />}
                          <span className="text-[11px] capitalize text-zinc-500">{p.finish}</span>
                        </div>
                        <div className="mt-2">
                          <Chips items={sport.specChips(p)} />
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex justify-between border-t border-white/10 p-2">
            <button onClick={s.prevCategory} className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:bg-white/5">
              ← Prev
            </button>
            <button onClick={s.nextCategory} className="rounded-lg px-3 py-1.5 text-sm text-sky-300 hover:bg-sky-500/10">
              Next step →
            </button>
          </div>
        </aside>
      </section>

      {/* Compatibility notes */}
      {s.issues.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
          <h2 className="mb-2 text-sm font-semibold text-white">Compatibility notes</h2>
          <ul className="space-y-1.5">
            {s.issues.map((i) => (
              <li key={i.id} className="flex gap-2 text-sm">
                <span className={i.severity === "error" ? "text-red-400" : "text-amber-400"}>
                  {i.severity === "error" ? "✕ Problem" : "! Warning"}
                </span>
                <span className="text-zinc-300">{i.message}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Parts list */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="font-semibold text-white">Current Build Parts List</h2>
          <span className="text-xs text-zinc-500">Lowest in-stock price per part</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr className="border-b border-white/5">
                <th className="px-4 py-2 font-medium">Component</th>
                <th className="px-4 py-2 font-medium">Selection</th>
                <th className="px-4 py-2 font-medium">Weight</th>
                <th className="px-4 py-2 font-medium">Compatibility</th>
                <th className="px-4 py-2 font-medium">Price</th>
                <th className="px-4 py-2 font-medium">Where</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {sport.categories.map((c) => {
                const line = s.lines.find((l) => l.category === c.id);
                if (!line) {
                  return (
                    <tr key={c.id} className="border-b border-white/5">
                      <td className="px-4 py-3 font-medium text-zinc-300">{c.label}</td>
                      <td className="px-4 py-3" colSpan={6}>
                        <button
                          onClick={() => s.setActiveCategory(c.id)}
                          className="rounded-lg border border-dashed border-white/15 px-3 py-1.5 text-xs text-zinc-400 hover:border-sky-500/50 hover:text-sky-300"
                        >
                          + Choose a {c.label}
                        </button>
                      </td>
                    </tr>
                  );
                }
                const { part, offer, issues } = line;
                const isOpen = expanded === c.id;
                return (
                  <Fragment key={c.id}>
                    <tr className="border-b border-white/5 align-top hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-medium text-zinc-300">
                        <button onClick={() => s.setActiveCategory(c.id)} className="hover:text-sky-300">
                          {c.label}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <Thumb part={part} size={32} />
                          <div>
                            <p className="text-zinc-100">
                              <span className="text-zinc-500">{part.brand}</span> {part.name}
                            </p>
                            <div className="mt-1">
                              <Chips items={sport.specChips(part)} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-300">{part.weightGrams} g</td>
                      <td className="px-4 py-3">
                        <CompatBadge issues={issues} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <p className="font-semibold text-white">{offer ? formatPrice(offer.price) : "—"}</p>
                        {offer && !offer.inStock && <p className="text-[11px] text-red-300">Out of stock everywhere</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-zinc-300">{offer?.shopName}</p>
                        {offer?.isShredDeal && (
                          <div className="mt-1">
                            <DealBadge />
                          </div>
                        )}
                        <button
                          onClick={() => setExpanded(isOpen ? null : c.id)}
                          className="mt-1 text-[11px] text-sky-400 hover:underline"
                        >
                          {isOpen ? "Hide" : `Compare ${part.retailers.length} stores`}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {offer && (
                          <a
                            href={offer.affiliateUrl}
                            target="_blank"
                            rel="noopener noreferrer sponsored"
                            className="inline-block rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-400"
                          >
                            Buy
                          </a>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-white/5 bg-black/20">
                        <td />
                        <td colSpan={6} className="px-4 py-2">
                          <ul className="divide-y divide-white/5">
                            {[...part.retailers]
                              .sort((a, b) => a.price - b.price)
                              .map((r) => (
                                <li key={r.shopName} className="flex items-center justify-between gap-3 py-1.5 text-xs">
                                  <span className="text-zinc-300">{r.shopName}</span>
                                  <span className="flex items-center gap-3">
                                    {r.isShredDeal && <DealBadge />}
                                    <span className={r.inStock ? "text-emerald-300" : "text-red-300"}>
                                      {r.inStock ? "In stock" : "Out of stock"}
                                    </span>
                                    <span className="w-20 text-right font-semibold text-white">{formatPrice(r.price)}</span>
                                    <a
                                      href={r.affiliateUrl}
                                      target="_blank"
                                      rel="noopener noreferrer sponsored"
                                      className="text-sky-400 hover:underline"
                                    >
                                      View
                                    </a>
                                  </span>
                                </li>
                              ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-white/[0.03]">
                <td className="px-4 py-3 font-semibold text-white" colSpan={2}>
                  Total
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-zinc-200">
                  {s.totalWeightGrams.toLocaleString()} g
                  <span className="block text-[11px] text-zinc-500">{s.totalWeightLbs.toFixed(2)} lb</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs ${status.cls}`}>{status.text}</span>
                </td>
                <td className="px-4 py-3 text-lg font-bold text-white" colSpan={3}>
                  {formatPrice(s.totalPrice)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <p className="text-center text-[11px] text-zinc-600">
        Sample catalog — prices, stock and links are placeholders until the shared ShredDeals price pipeline is connected.
        Links may be affiliate links.
      </p>
    </div>
  );
}
