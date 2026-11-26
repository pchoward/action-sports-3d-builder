import type { PartImages } from "./types";

const KEYS: (keyof PartImages)[] = ["product", "graphic"];

/** Local path under /images/ or an https URL, and always WebP. */
const WEBP_URL = /^(\/images\/|https:\/\/)[^\s?#]+\.webp([?#].*)?$/i;

/** Returns problems with a part's `images` object (empty = valid). */
export function validateImages(raw: unknown): string[] {
  if (raw === undefined) return [];
  if (typeof raw !== "object" || raw === null) return ["images must be an object"];
  return Object.entries(raw).flatMap(([k, v]) => {
    if (!KEYS.includes(k as keyof PartImages)) return [`images.${k} is not supported (use ${KEYS.join(", ")})`];
    if (typeof v !== "string" || !WEBP_URL.test(v))
      return [`images.${k} must be a .webp under /images/ or an https URL — run \`npm run images\` to convert (got ${JSON.stringify(v)})`];
    return [];
  });
}
