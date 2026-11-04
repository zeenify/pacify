import { describe, it, expect, beforeEach, vi } from "vitest";

// Minimal AudioContext stub. Only what the engine touches.
class FakeParam { value = 1; setValueAtTime(v: number) { this.value = v; return this; } }
class FakeNode {
  gain = new FakeParam(); pan = new FakeParam(); playbackRate = new FakeParam();
  buffer: any = null; loop = false; onended: (() => void) | null = null;
  connect(d: any) { return d; }
  disconnect() {}
  start() {}
  stop() {}
}
class FakeCtx {
  currentTime = 0;
  state: "suspended" | "running" = "suspended";
  sampleRate = 44100;
  destination = new FakeNode();
  createGain() { return new FakeNode(); }
  createStereoPanner() { return new FakeNode(); }
  createBufferSource() { return new FakeNode(); }
  createConvolver() { return { buffer: null, normalize: true, connect(d: any) { return d; }, disconnect() {} }; }
  createBuffer(ch: number, len: number, sr: number) { return { numberOfChannels: ch, length: len, sampleRate: sr, duration: len / sr, getChannelData: () => new Float32Array(len) }; }
  resume() { this.state = "running"; return Promise.resolve(); }
  decodeAudioData(_ab: ArrayBuffer) { return Promise.resolve(this.createBuffer(1, 4410, 44100)); }
}

beforeEach(() => {
  // Fresh module instance per test: voices, decoded buffers and lastPlayed stamps are
  // module state, and vitest shares one registry across tests in a file.
  vi.resetModules();
  vi.stubGlobal("AudioContext", FakeCtx as any);
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(8) })) as any);
});

const mod = () => import("../src/lib/sfx");

describe("sfx engine voice policy", () => {
  it("exports every legacy name so the thirteen importers keep working", async () => {
    const s = await mod();
    for (const fn of ["initSfx", "unlockSfx", "playHover", "playClick", "playSliderTick",
      "playCardPop", "sfxReady", "setVolumes", "setSfxEnabled", "initBgm", "unlockBgm",
      "playBgm", "stopBgm", "getCurrentBgm", "bgmReady", "getBgmLevel", "getBgmMuted"]) {
      expect(typeof (s as any)[fn], fn).toBe("function");
    }
    for (const fn of ["play", "playAt", "scheduleTimeline", "cancelTimeline", "duckBgm", "listSfx", "debugAudio"]) {
      expect(typeof (s as any)[fn], fn).toBe("function");
    }
  });

  it("is a silent no-op before unlock and never throws", async () => {
    const s = await mod();
    expect(() => s.play("ui.click")).not.toThrow();
    expect(s.debugAudio().liveVoices).toBe(0);
    expect(s.debugAudio().unlocked).toBe(false);
  });

  it("allocates a voice after unlock", async () => {
    const s = await mod();
    await s.initSfx();
    s.unlockSfx();
    expect(s.debugAudio().unlocked).toBe(true);
    s.play("duel.intro.slam");
    expect(s.debugAudio().liveVoices).toBe(1);
  });

  it("lets a sound overlap itself — the bug the rewrite exists to fix", async () => {
    const s = await mod();
    await s.initSfx(); s.unlockSfx();
    // duel.intro.slam declares no cooldownMs; the old one-element-per-sound design
    // would have restarted it and produced a single voice for any cue.
    s.play("duel.intro.slam");
    s.play("duel.intro.slam");
    s.play("duel.intro.slam");
    expect(s.debugAudio().liveVoices).toBe(3);
  });

  it("honours per-cue maxVoices by stealing the oldest", async () => {
    const s = await mod();
    await s.initSfx(); s.unlockSfx();
    // duel.thinking declares maxVoices: 1
    for (let i = 0; i < 5; i++) s.play("duel.thinking");
    expect(s.debugAudio().liveVoices).toBeLessThanOrEqual(1);
  });

  it("honours cooldownMs", async () => {
    const s = await mod();
    await s.initSfx(); s.unlockSfx();
    s.play("ui.slider");
    s.play("ui.slider");     // same ctx.currentTime => inside the 45ms cooldown
    expect(s.debugAudio().liveVoices).toBe(1);
  });

  it("never exceeds the 24-voice hard cap", async () => {
    const s = await mod();
    await s.initSfx(); s.unlockSfx();
    // One play of EVERY distinct cue. The fake ctx keeps currentTime at 0, so each cue's
    // cooldown passes on its first call — this exercises the global cap, not the per-cue one.
    // Playing a single cue 200x would be a useless test here: its cooldown would block all
    // but the first and liveVoices would sit at 1.
    const names = s.listSfx();
    expect(names.length).toBeGreaterThan(24);
    for (const n of names) s.play(n);
    expect(s.debugAudio().liveVoices).toBe(24);
  });

  it("setSfxEnabled(false) silences everything", async () => {
    const s = await mod();
    await s.initSfx(); s.unlockSfx();
    s.setSfxEnabled(false);
    s.play("duel.victory");
    expect(s.debugAudio().liveVoices).toBe(0);
    s.setSfxEnabled(true);
    s.play("duel.victory");
    expect(s.debugAudio().liveVoices).toBe(1);
  });

  it("scheduleTimeline allocates every event and cancelTimeline releases them", async () => {
    const s = await mod();
    await s.initSfx(); s.unlockSfx();
    const h = s.scheduleTimeline([
      { cue: "duel.flip.whoosh", at: 0 },
      { cue: "duel.flip.snap", at: 210 },
      { cue: "duel.stamp", at: 1800 },
    ]);
    expect(s.debugAudio().liveVoices).toBe(3);
    s.cancelTimeline(h);
    expect(s.debugAudio().liveVoices).toBe(0);
  });

  it("reports decode failures instead of swallowing them", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) })) as any);
    vi.resetModules();
    const s = await mod();
    await s.initSfx();
    expect(s.debugAudio().failed.length).toBeGreaterThan(0);
    expect(s.debugAudio().failed[0]).toMatch(/404/);
  });
});
