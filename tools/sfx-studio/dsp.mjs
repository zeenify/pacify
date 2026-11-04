/* DSP primitives for the offline SFX renderer. All functions are pure: they take
   Float32Array (or plain params) and return a new Float32Array. No I/O here. */

export const dbToLin = (db) => Math.pow(10, db / 20);
export const linToDb = (lin) => (lin > 0 ? 20 * Math.log10(lin) : -Infinity);

const len = (dur, sampleRate) => Math.max(1, Math.ceil(dur * sampleRate));

export function stats(data) {
  let peak = 0, sum = 0;
  for (let i = 0; i < data.length; i++) {
    const a = Math.abs(data[i]);
    if (a > peak) peak = a;
    sum += data[i] * data[i];
  }
  const rms = data.length ? Math.sqrt(sum / data.length) : 0;
  return { peak, peakDbfs: linToDb(peak), rms, rmsDbfs: linToDb(rms), duration: data.length };
}

export function osc({ wave, f, fEnd, glide = "lin", dur, sampleRate, phase = 0 }) {
  const n = len(dur, sampleRate);
  const out = new Float32Array(n);
  let ph = phase * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    let hz = f;
    if (fEnd !== undefined && fEnd !== f) {
      hz = glide === "exp" ? f * Math.pow(fEnd / f, t) : f + (fEnd - f) * t;
    }
    // integrate frequency rather than computing f*t — correct under a glide
    ph += (2 * Math.PI * hz) / sampleRate;
    if (ph > Math.PI * 2) ph -= Math.PI * 2;
    const u = ph / (2 * Math.PI);          // 0..1
    let v;
    switch (wave) {
      case "sine": v = Math.sin(ph); break;
      case "tri": v = 4 * Math.abs(u - Math.floor(u + 0.75) + 0.25) - 1; break;
      case "saw": v = 2 * (u - Math.floor(u + 0.5)); break;
      case "square": v = u < 0.5 ? 1 : -1; break;
      default: throw new Error(`unknown wave: ${wave}`);
    }
    out[i] = v;
  }
  return out;
}

export function noise({ color, dur, sampleRate, rand }) {
  const n = len(dur, sampleRate);
  const out = new Float32Array(n);
  if (color === "white") {
    for (let i = 0; i < n; i++) out[i] = rand() * 2 - 1;
    return out;
  }
  if (color === "pink") {
    // Voss-McCartney via the classic Paul Kellet approximation
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < n; i++) {
      const w = rand() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.0168980;
      out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
    return out;
  }
  if (color === "brown") {
    let last = 0;
    for (let i = 0; i < n; i++) {
      const w = rand() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      out[i] = last * 3.5;
    }
    return out;
  }
  throw new Error(`unknown noise colour: ${color}`);
}

/** Breakpoint envelope. `points` = [[sec, level], ...] ascending, first must be 0.
    "exp" curves between breakpoints (musical); "lin" is a straight ramp. */
export function applyEnv(data, sampleRate, points, { curve = "exp" } = {}) {
  if (!points.length || points[0][0] !== 0) throw new Error("envelope must start at t=0");
  const out = new Float32Array(data.length);
  const FLOOR = 1e-4;                                  // exp interpolation cannot reach 0
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    let v = points[points.length - 1][1];
    for (let s = 0; s < points.length - 1; s++) {
      const [t0, v0] = points[s];
      const [t1, v1] = points[s + 1];
      if (t >= t0 && t <= t1) {
        const k = t1 === t0 ? 1 : (t - t0) / (t1 - t0);
        v = curve === "exp"
          ? Math.max(v0, FLOOR) * Math.pow(Math.max(v1, FLOOR) / Math.max(v0, FLOOR), k)
          : v0 + (v1 - v0) * k;
        break;
      }
    }
    out[i] = data[i] * v;
  }
  return out;
}

/** RBJ Audio EQ Cookbook coefficients. */
function biquadCoefs({ type, f, q = 0.707, gainDb = 0, sampleRate }) {
  const w0 = (2 * Math.PI * Math.min(f, sampleRate * 0.499)) / sampleRate;
  const cw = Math.cos(w0), sw = Math.sin(w0);
  const A = Math.pow(10, gainDb / 40);
  const alpha = sw / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  switch (type) {
    case "lowpass":  b0 = (1 - cw) / 2; b1 = 1 - cw;       b2 = (1 - cw) / 2; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
    case "highpass": b0 = (1 + cw) / 2; b1 = -(1 + cw);    b2 = (1 + cw) / 2; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
    case "bandpass": b0 = alpha;        b1 = 0;            b2 = -alpha;       a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
    case "notch":    b0 = 1;            b1 = -2 * cw;      b2 = 1;            a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
    case "peaking":  b0 = 1 + alpha * A; b1 = -2 * cw;     b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cw; a2 = 1 - alpha / A; break;
    default: throw new Error(`unknown biquad type: ${type}`);
  }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

export function biquad(data, sampleRate, { type, f, fEnd, q = 0.707, gainDb = 0 }) {
  const out = new Float32Array(data.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  let c = biquadCoefs({ type, f, q, gainDb, sampleRate });
  for (let i = 0; i < data.length; i++) {
    if (fEnd !== undefined && fEnd !== f) {
      const t = data.length === 1 ? 0 : i / (data.length - 1);
      c = biquadCoefs({ type, f: f + (fEnd - f) * t, q, gainDb, sampleRate });
    }
    const x0 = data[i];
    const y0 = c.b0 * x0 + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
    out[i] = y0;
  }
  return out;
}

export function shape(data, fn) {
  const out = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = fn(data[i]);
  return out;
}

export function delay(data, sampleRate, { ms, feedback = 0, mix = 1 }) {
  const d = Math.max(1, Math.round((ms / 1000) * sampleRate));
  const buf = new Float32Array(data.length + d);
  for (let i = 0; i < data.length; i++) {
    const wet = buf[i] + data[i];
    buf[i + d] += wet * mix;
    if (feedback) buf[i + d] += buf[i] * feedback;
  }
  // second pass: fold the accumulated wet back into the output window
  const out = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] + buf[i];
  return out;
}

/** Linear-interpolated resample. rate>1 = up in pitch AND shorter. */
export function pitch(data, rate) {
  if (rate <= 0) throw new Error("pitch rate must be > 0");
  const n = Math.max(1, Math.ceil(data.length / rate));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const src = i * rate;
    const i0 = Math.floor(src);
    const i1 = Math.min(i0 + 1, data.length - 1);
    const k = src - i0;
    out[i] = data[i0] * (1 - k) + data[i1] * k;
  }
  return out;
}

export function panGain(pan) {
  const p = (Math.max(-1, Math.min(1, pan)) + 1) * 0.25 * Math.PI;   // -1..1 -> 0..pi/2
  return { l: Math.cos(p) * Math.SQRT2, r: Math.sin(p) * Math.SQRT2 };
}

/** Lookahead peak limiter: gain envelope derived from the max over a sliding
    window, then smoothed so the reduction does not click. */
export function limit(data, { ceiling = dbToLin(-1), lookahead = 64 } = {}) {
  const n = data.length;
  const out = new Float32Array(n);
  const gain = new Float32Array(n).fill(1);
  for (let i = 0; i < n; i++) {
    const a = Math.abs(data[i]);
    if (a > ceiling) {
      const g = ceiling / a;
      const from = Math.max(0, i - lookahead);
      for (let j = from; j <= i; j++) if (g < gain[j]) gain[j] = g;
    }
  }
  // smooth: attack fast, release slow
  let sm = 1;
  for (let i = 0; i < n; i++) {
    const target = gain[i];
    sm = target < sm ? sm + (target - sm) * 0.6 : sm + (target - sm) * 0.002;
    out[i] = data[i] * sm;
  }
  return out;
}

export function normalize(data, targetDbfs) {
  const { peak } = stats(data);
  if (peak < 1e-9) return new Float32Array(data);
  const g = dbToLin(targetDbfs) / peak;
  const out = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] * g;
  return out;
}

/** Enforces spec §9.1a's "leading silence < 5ms". Leaves `keepMs` of pre-roll so
    the transient is not chopped, and trims an inaudible tail. */
export function trimSilence(data, sampleRate, { thresholdDb = -50, keepMs = 1 } = {}) {
  const thr = dbToLin(thresholdDb);
  let first = 0;
  while (first < data.length && Math.abs(data[first]) < thr) first++;
  if (first >= data.length) return new Float32Array(1);
  let last = data.length - 1;
  while (last > first && Math.abs(data[last]) < thr) last--;
  const keep = Math.ceil((keepMs / 1000) * sampleRate);
  const start = Math.max(0, first - keep);
  const end = Math.min(data.length, last + keep + 1);
  return data.slice(start, end);
}

export function mixInto(dest, src, atSec, sampleRate, gain = 1) {
  const off = Math.round(atSec * sampleRate);
  for (let i = 0; i < src.length; i++) {
    const j = off + i;
    if (j < 0 || j >= dest.length) continue;
    dest[j] = Math.max(-1, Math.min(1, dest[j] + src[i] * gain));
  }
  return dest;
}
