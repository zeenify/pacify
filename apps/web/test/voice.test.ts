import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* Voice player gates — no real network, no real audio element (node has none).
   What must hold: the disabled/pre-unlock/empty paths fetch NOTHING, a live
   session hits POST {API}/voice with credentials + the exact ticket, and a
   same-ticket prefetch is ADOPTED (one fetch total) while a different ticket
   evicts it (two fetches). Element-less environments land on onEnd("error") —
   text-only play — which is exactly the browser's failure fallback. */

type FetchCall = { url: string; init: RequestInit };

describe("voice player", () => {
  let calls: FetchCall[];

  const load = async () => {
    vi.resetModules();
    const sfx = await import("../src/lib/sfx");
    const voice = await import("../src/lib/voice");
    return { sfx, voice };
  };

  beforeEach(() => {
    calls = [];
    vi.stubGlobal("fetch", vi.fn(async (url: unknown, init: RequestInit) => {
      calls.push({ url: String(url), init });
      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("never fetches when voice is disabled", async () => {
    const { voice } = await load();
    voice.setVoiceEnabled(false);
    const ended: string[] = [];
    voice.playVoice("ticket-1", { onEnd: (r) => ended.push(r) });
    voice.prefetchVoice("ticket-2");
    await vi.waitFor(() => expect(ended).toEqual(["disabled"]));
    expect(calls).toEqual([]);
    expect(voice.isVoiceEnabled()).toBe(false);
  });

  it("treats an empty ticket as a no-op play", async () => {
    const { sfx, voice } = await load();
    sfx.unlockSfx();
    voice.setVoiceEnabled(true);
    const ended: string[] = [];
    voice.playVoice("", { onEnd: (r) => ended.push(r) });
    expect(ended).toEqual(["cancelled"]);
    expect(calls).toEqual([]);
  });

  it("fetches nothing before the audio-unlock gesture", async () => {
    const { voice } = await load();
    voice.setVoiceEnabled(true);
    const ended: string[] = [];
    voice.playVoice("ticket-1", { onEnd: (r) => ended.push(r) });
    voice.prefetchVoice("ticket-2");
    await new Promise((r) => setTimeout(r, 10));
    expect(ended).toEqual(["cancelled"]);
    expect(calls).toEqual([]);
  });

  it("posts the exact ticket to the voice endpoint with credentials", async () => {
    const { sfx, voice } = await load();
    sfx.unlockSfx(); // login-gesture equivalent
    voice.setVoiceEnabled(true);
    const events: string[] = [];
    voice.playVoice("ticket-1", {
      onBeforePlay: () => events.push("before"),
      onStart: () => events.push("start"),
      onEnd: () => events.push("end"),
      onError: () => events.push("error"),
    });
    await vi.waitFor(() => expect(calls.length).toBe(1));
    expect(calls[0].url.endsWith("/voice")).toBe(true);
    expect(calls[0].init.method).toBe("POST");
    expect(calls[0].init.credentials).toBe("include");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ ticket: "ticket-1" });
    // No audio element in node → the session fails to text-only, exactly once.
    await vi.waitFor(() => expect(events[events.length - 1]).toBe("end"));
    expect(events[0]).toBe("error");
  });

  it("adopts a same-ticket prefetch with a single fetch", async () => {
    const { sfx, voice } = await load();
    sfx.unlockSfx();
    voice.setVoiceEnabled(true);
    voice.prefetchVoice("ticket-1");
    await vi.waitFor(() => expect(calls.length).toBe(1));
    voice.playVoice("ticket-1", { onEnd: () => {} });
    await new Promise((r) => setTimeout(r, 20));
    expect(calls.length).toBe(1); // adopted — no duplicate request
  });

  it("evicts a stale prefetch when a different ticket plays", async () => {
    const { sfx, voice } = await load();
    sfx.unlockSfx();
    voice.setVoiceEnabled(true);
    voice.prefetchVoice("ticket-a");
    await vi.waitFor(() => expect(calls.length).toBe(1));
    voice.playVoice("ticket-b", { onEnd: () => {} });
    await vi.waitFor(() => expect(calls.length).toBe(2));
    expect(calls.map((c) => JSON.parse(String(c.init.body)).ticket)).toEqual(["ticket-a", "ticket-b"]);
  });
});
