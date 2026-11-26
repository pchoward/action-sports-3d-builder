/** Build permalinks: `?sport=scooter&deck=<id>&fork=<id>...` */
export function serializeBuild(sportId: string, ids: Record<string, string | undefined>): string {
  const params = new URLSearchParams({ sport: sportId });
  for (const [cat, id] of Object.entries(ids)) if (id) params.set(cat, id);
  return params.toString();
}

export function parseBuild<Cat extends string>(
  search: string,
  categories: readonly Cat[],
): Partial<Record<Cat, string>> | null {
  const params = new URLSearchParams(search);
  const ids: Partial<Record<Cat, string>> = {};
  let found = false;
  for (const cat of categories) {
    const id = params.get(cat);
    if (id) {
      ids[cat] = id;
      found = true;
    }
  }
  return found ? ids : null;
}
