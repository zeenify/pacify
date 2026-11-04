import { writeFile, readFile } from "node:fs/promises";

/** Mono float32 buffer. `data` values are nominal [-1, 1]. */
export function makeBuffer(seconds, sampleRate = 44100) {
  return { sampleRate, data: new Float32Array(Math.max(1, Math.ceil(seconds * sampleRate))) };
}

export async function writeWav(path, buf) {
  const { sampleRate, data } = buf;
  const n = data.length;
  const bytes = 44 + n * 2;
  const ab = new ArrayBuffer(bytes);
  const v = new DataView(ab);
  const str = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
  str(0, "RIFF");
  v.setUint32(4, bytes - 8, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);      // PCM fmt chunk size
  v.setUint16(20, 1, true);       // 1 = PCM
  v.setUint16(22, 1, true);       // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);  // byte rate: sr * channels * bytes/sample
  v.setUint16(32, 2, true);       // block align
  v.setUint16(34, 16, true);      // bits per sample
  str(36, "data");
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    // Math.round is required: DataView.setInt16 truncates toward zero, which
    // adds up to ~1 LSB of extra error and breaks the round-trip tolerance.
    v.setInt16(44 + i * 2, Math.round(s < 0 ? s * 0x8000 : s * 0x7fff), true);
  }
  await writeFile(path, Buffer.from(ab));
  return path;
}

/** Walks chunks rather than assuming a 44-byte header — real-world WAVs from
    ffmpeg and from library downloads carry LIST/JUNK/fact chunks. */
export async function readWav(path) {
  const raw = await readFile(path);
  const v = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const tag = (off) => String.fromCharCode(v.getUint8(off), v.getUint8(off + 1), v.getUint8(off + 2), v.getUint8(off + 3));
  if (tag(0) !== "RIFF" || tag(8) !== "WAVE") throw new Error(`${path}: not a RIFF/WAVE file`);
  let off = 12, fmt = null, dataOff = -1, dataLen = 0;
  while (off + 8 <= raw.byteLength) {
    const id = tag(off);
    const size = v.getUint32(off + 4, true);
    if (id === "fmt ") {
      fmt = { encoding: v.getUint16(off + 8, true), channels: v.getUint16(off + 10, true),
              sampleRate: v.getUint32(off + 12, true), bits: v.getUint16(off + 22, true) };
    } else if (id === "data") { dataOff = off + 8; dataLen = size; }
    off += 8 + size + (size % 2);   // chunks are word-aligned
  }
  if (!fmt) throw new Error(`${path}: no fmt chunk`);
  if (dataOff < 0) throw new Error(`${path}: no data chunk`);
  if (fmt.encoding !== 1) throw new Error(`${path}: encoding ${fmt.encoding}, expected 1 (PCM)`);
  if (fmt.channels !== 1) throw new Error(`${path}: ${fmt.channels} channels, expected 1 (mono)`);
  if (fmt.bits !== 16) throw new Error(`${path}: ${fmt.bits} bits, expected 16`);
  const n = Math.floor(dataLen / 2);
  const data = new Float32Array(n);
  for (let i = 0; i < n; i++) data[i] = v.getInt16(dataOff + i * 2, true) / 32768;
  return { sampleRate: fmt.sampleRate, data };
}
