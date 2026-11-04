export function nextPow2(n) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/** In-place iterative radix-2 FFT. `re`/`im` must be equal-length powers of two. */
export function fft(re, im, inverse) {
  const n = re.length;
  if (n !== im.length) throw new Error("fft: re/im length mismatch");
  if (n & (n - 1)) throw new Error(`fft: length ${n} is not a power of two`);
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const ang = ((inverse ? 2 : -2) * Math.PI) / size;
    const wpr = Math.cos(ang), wpi = Math.sin(ang);
    for (let i = 0; i < n; i += size) {
      let wr = 1, wi = 0;
      for (let k = 0; k < half; k++) {
        const ar = re[i + k], ai = im[i + k];
        const br = re[i + k + half] * wr - im[i + k + half] * wi;
        const bi = re[i + k + half] * wi + im[i + k + half] * wr;
        re[i + k] = ar + br; im[i + k] = ai + bi;
        re[i + k + half] = ar - br; im[i + k + half] = ai - bi;
        const nwr = wr * wpr - wi * wpi;
        wi = wr * wpi + wi * wpr;
        wr = nwr;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

/** Frequency-domain convolution. Assets here are short (<3s) and IRs <=3.2s, so a
    single FFT of the full linear-convolution length is fast enough — no need for
    partitioned overlap-add. Falls back to nothing: if this ever becomes the
    bottleneck, ffmpeg's `afir` filter is the escape hatch. */
export function convolve(input, ir) {
  const outLen = input.length + ir.length - 1;
  const n = nextPow2(Math.max(outLen, 2));
  const ar = new Float64Array(n), ai = new Float64Array(n);
  const br = new Float64Array(n), bi = new Float64Array(n);
  ar.set(input); br.set(ir);
  fft(ar, ai, false);
  fft(br, bi, false);
  const cr = new Float64Array(n), ci = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    cr[i] = ar[i] * br[i] - ai[i] * bi[i];
    ci[i] = ar[i] * bi[i] + ai[i] * br[i];
  }
  fft(cr, ci, true);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) out[i] = cr[i];
  return out;
}
