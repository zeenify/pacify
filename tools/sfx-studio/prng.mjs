/* mulberry32 — small, fast, seedable. Every random choice in a recipe MUST come
   from here so re-rendering produces byte-identical WAVs (spec §4.2). */
export function prng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Convenience: a float in [lo, hi]. */
export function range(rand, lo, hi) {
  return lo + (hi - lo) * rand();
}
