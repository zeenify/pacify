/* Deterministic animation core.
   EVERYTHING here is a pure function of seconds. No Date.now, no performance.now,
   no requestAnimationFrame clock, no Math.random. The capture harness calls
   seek(frame) and the whole world must be reproducible from that number alone.

   CSS transitions and keyframe animations are wall-clock driven and therefore
   BANNED in capture pages — drive DOM styles from these tracks instead. */

export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inQuart: (t) => t ** 4,
  outQuart: (t) => 1 - (1 - t) ** 4,
  inOutQuart: (t) => (t < 0.5 ? 8 * t ** 4 : 1 - Math.pow(-2 * t + 2, 4) / 2),
  inQuint: (t) => t ** 5,
  outQuint: (t) => 1 - (1 - t) ** 5,
  inOutQuint: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outCirc: (t) => Math.sqrt(1 - (t - 1) ** 2),
  // P5-flavoured overshoot — matches theme.motion.overshoot
  outBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  outBackSoft: (t) => {
    const c1 = 1.2;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  inBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  outElastic: (t) => {
    const c4 = (2 * Math.PI) / 3;
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  // Hard P5 snap: near-instant settle with a small kick.
  slam: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 6) * Math.cos(t * Math.PI * 1.5)),
};

export function resolveEase(e) {
  if (typeof e === "function") return e;
  if (typeof e === "string") return ease[e] ?? ease.linear;
  return ease.linear;
}

export const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);

/** Normalised, clamped progress of `t` through the window [start, end]. */
export const span = (t, start, end) => (end <= start ? (t >= end ? 1 : 0) : clamp((t - start) / (end - start)));

/** Progress through [start, end] with an easing applied. */
export const spanE = (t, start, end, e = "linear") => resolveEase(e)(span(t, start, end));

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

function lerpValue(a, b, k) {
  if (isNum(a) && isNum(b)) return a + (b - a) * k;
  if (Array.isArray(a) && Array.isArray(b)) return a.map((x, i) => lerpValue(x, b[i] ?? x, k));
  if (a && b && typeof a === "object" && typeof b === "object") {
    const out = {};
    for (const key of Object.keys(a)) out[key] = lerpValue(a[key], b[key] ?? a[key], k);
    return out;
  }
  // Non-numeric, non-structured: hard switch at the midpoint.
  return k < 0.5 ? a : b;
}

/**
 * Sample a keyframe track.
 * Keys: [{ t, v, e }] where `e` is the easing used leaving THIS key (default linear).
 * Returns the first value before the track starts and the last after it ends.
 */
export function track(keys, t) {
  if (!Array.isArray(keys) || keys.length === 0) return 0;
  if (keys.length === 1) return keys[0].v;
  if (t <= keys[0].t) return keys[0].v;

  const last = keys[keys.length - 1];
  if (t >= last.t) return last.v;

  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].t <= t) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const k = resolveEase(a.e)(span(t, a.t, b.t));
  return lerpValue(a.v, b.v, k);
}

/** True only while `t` is inside [start, end]. Useful for gating visibility. */
export const within = (t, start, end) => t >= start && t <= end;

/** Map a 0..1 progress onto a sub-window, so beats can be composed. */
export const sub = (t, start, end) => span(t, start, end);

/** Deterministic hash-based pseudo random in [0,1). Replaces Math.random everywhere. */
export function rand(seed) {
  let x = Math.imul(seed | 0, 1103515245) + 12345;
  x = (x ^ (x >>> 15)) >>> 0;
  x = Math.imul(x, 2246822507) >>> 0;
  x = (x ^ (x >>> 13)) >>> 0;
  return x / 4294967296;
}

/** Deterministic value in [lo, hi). */
export const randRange = (seed, lo, hi) => lo + rand(seed) * (hi - lo);

export const lerp = (a, b, k) => a + (b - a) * k;
export const mix = lerp;
export const deg = (r) => (r * 180) / Math.PI;
export const rad = (d) => (d * Math.PI) / 180;
