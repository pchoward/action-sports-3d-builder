#!/usr/bin/env node
/**
 * Converts part images (JPG/PNG/AVIF/GIF/TIFF/SVG/WebP) to optimized WebP under public/images/.
 *
 *   npm run images -- <input files or folders...> [--kind product|graphic] [--out public/images/<subdir>]
 *
 * product  → max 1200px, quality 80 (thumbnails / product photos)
 * graphic  → max 2048px, quality 88, keeps alpha (print artwork mapped onto 3D)
 *
 * Prints the `/images/...webp` path to paste into the catalog's `images` field.
 */
import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return def;
  const [, v] = args.splice(i, 2);
  return v;
};
const kind = flag("kind", "product");
const outDir = flag("out", path.join("public", "images", kind === "graphic" ? "graphics" : "products"));
const PRESETS = {
  product: { max: 1200, quality: 80, alphaQuality: 80 },
  graphic: { max: 2048, quality: 88, alphaQuality: 95 },
};
const preset = PRESETS[kind];
if (!preset || args.length === 0) {
  console.error("usage: npm run images -- <files|folders...> [--kind product|graphic] [--out dir]");
  process.exit(1);
}

const EXT = /\.(jpe?g|png|webp|avif|gif|tiff?|svg)$/i;
async function collect(p) {
  const s = await stat(p);
  if (!s.isDirectory()) return EXT.test(p) ? [p] : [];
  const entries = await readdir(p);
  return (await Promise.all(entries.map((e) => collect(path.join(p, e))))).flat();
}

const slug = (s) => s.toLowerCase().replace(/\.[^.]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

await mkdir(outDir, { recursive: true });
const files = (await Promise.all(args.map(collect))).flat();
for (const file of files) {
  const out = path.join(outDir, `${slug(path.basename(file))}.webp`);
  const before = (await stat(file)).size;
  const info = await sharp(file, { density: 300 })
    .rotate()
    .resize({ width: preset.max, height: preset.max, fit: "inside", withoutEnlargement: true })
    .webp({ quality: preset.quality, alphaQuality: preset.alphaQuality, effort: 5 })
    .toFile(out);
  const pub = "/" + path.relative("public", out).split(path.sep).join("/");
  console.log(`${file} → ${pub}  ${info.width}×${info.height}  ${(before / 1024).toFixed(0)}KB → ${(info.size / 1024).toFixed(0)}KB`);
}
