// mulberry32 — deterministic, seed replay for sanity check
export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 5-card singleton hand, ~30% tricks (≈1-2 tricks per hand)
export function dealHand(catalogue: import("./types.js").Card[], seed: number) {
  const shuffled = shuffle(catalogue, seed);
  const hand: typeof catalogue = [];
  let tricks = 0;
  for (const c of shuffled) {
    if (hand.length >= 5) break;
    const isTrick = c.kind === "trick";
    if (isTrick && tricks >= 2) continue; // cap at 2 tricks = 40% max, avg ~30%
    // 30% overall: skip trick 70% of the time when we could take it
    if (isTrick && Math.random() > 0.3 && tricks === 0) continue;
    hand.push(c);
    if (isTrick) tricks++;
  }
  // fill remaining with numbers if we skipped too many tricks
  if (hand.length < 5) {
    for (const c of shuffled) {
      if (hand.length >= 5) break;
      if (!hand.includes(c) && c.kind === "number") hand.push(c);
    }
  }
  return hand.slice(0, 5);
}
