/* Deterministic RNG — mulberry32 as a PURE state step.
   The rng state lives inside DuelState so the whole duel is serializable
   and replayable. Never use Math.random() anywhere in the engine. */

export function stepRng(state: number): [value: number, next: number] {
  let t = (state + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, t];
}

/** Fisher-Yates using the stepped rng. Returns shuffled copy + new rng state. */
export function shuffled<T>(items: readonly T[], rngState: number): [T[], number] {
  const a = [...items];
  let s = rngState;
  for (let i = a.length - 1; i > 0; i--) {
    const [r, next] = stepRng(s);
    s = next;
    const j = Math.floor(r * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return [a, s];
}

/** Pick n random items (no repeat) from a pool. */
export function pickRandom<T>(pool: readonly T[], n: number, rngState: number): [T[], number] {
  const [shuffledPool, next] = shuffled(pool, rngState);
  return [shuffledPool.slice(0, n), next];
}
