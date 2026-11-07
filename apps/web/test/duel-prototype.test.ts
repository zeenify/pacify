import { readFileSync } from "node:fs";
import { runInContext, createContext } from "node:vm";
import { describe, expect, it } from "vitest";

const html = readFileSync(new URL("../public/duel-prototype.html", import.meta.url), "utf8");
const code = html.match(/<script>([\s\S]*?)<\/script>/)![1];
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

function load(waitFirst = false, fallbackSecond = false) {
  const calls: any[] = [];
  const timers = new Map<number, () => void>();
  const elements = new Map<string, any>();
  const element = () => ({ textContent: "", innerHTML: "", className: "", style: {}, appendChild() {}, scrollHeight: 0 });
  const context = createContext({
    console: { log() {}, warn() {} }, URLSearchParams, AbortController,
    crypto: { randomUUID: () => "prototype-duel" },
    location: { port: "8081", origin: "http://localhost:8081", search: "" },
    localStorage: { getItem: () => null, setItem() {} },
    setTimeout: (fn: () => void) => { const id = timers.size + 1; timers.set(id, fn); return id; },
    clearTimeout: (id: number) => timers.delete(id),
    document: {
      createElement: element,
      getElementById: (id: string) => {
        if (!elements.has(id)) elements.set(id, element());
        return elements.get(id);
      },
    },
    fetch: async (_url: string, init: any) => {
      const body = JSON.parse(init.body);
      calls.push(body);
      const waiting = (waitFirst && calls.length === 1) || (fallbackSecond && calls.length === 2);
      return { ok: true, json: async () => ({
        picked: waiting ? null : body.view.myHand[0], message: waiting ? "Still considering." : "Your turn.",
        interactionId: fallbackSecond && calls.length === 2 ? "chain-1" : `chain-${calls.length}`,
        attempt: body.attempt ?? 0, waitMs: waiting ? 6000 : 0,
      }) };
    },
  });
  runInContext(code, context);
  runInContext("chooseGodCard = (view) => view.myHand[0]", context);
  return { calls, context, timers, elements };
}

describe("standalone duel protocol", () => {
  it("sends the round identity and initial lock state required by the shared AI endpoint", async () => {
    const game = load();
    await flush();
    expect(game.calls[0]).toMatchObject({ duelId: "prototype-duel", attempt: 0, p1Locked: null });
    expect(Number.isInteger(game.calls[0].seed)).toBe(true);
    expect(game.calls[0].interactionId).toBeUndefined();
    expect(runInContext("lastEngine.type", game.context)).toBe("LLM");
  });

  it("accepts a chat-only beat, then sends the player's lock without removing it from the request view", async () => {
    const game = load(true);
    await flush();
    expect(runInContext("state.p2Hand.length", game.context)).toBe(7);
    expect(runInContext("state.p2Locked", game.context)).toBeNull();
    runInContext("onPick(state.p1Hand[0].id)", game.context);
    await flush();
    expect(game.calls).toHaveLength(2);
    expect(game.calls[1].attempt).toBe(0);
    expect(game.calls[1].p1Locked).toBe(game.calls[0].view.oppHand[0].id);
    expect(game.calls[1].view.oppHand).toEqual(game.calls[0].view.oppHand);
    expect(runInContext("state.p2Hand.length", game.context)).toBe(6);
    expect(runInContext("transcript.length", game.context)).toBe(1);
    expect(game.timers.size).toBe(0);
  });

  it("keeps undelivered round results after fallback and acknowledges them only when the chain advances", async () => {
    const game = load(false, true);
    await flush();
    runInContext("onPick(state.p1Hand[0].id)", game.context);
    game.elements.get("nextBtn").onclick();
    await flush();
    expect(game.calls[1].view.burned).toHaveLength(2);
    expect(game.calls[1].roundResults).toHaveLength(1);
    runInContext("onPick(state.p1Hand[0].id)", game.context);
    await flush();
    expect(game.calls[2].interactionId).toBe("chain-1");
    expect(game.calls[2].roundResults).toEqual(game.calls[1].roundResults);
    expect(game.calls[2].view.oppHand).toEqual(game.calls[1].view.oppHand);
    expect(runInContext("resultsSent", game.context)).toBe(1);
    expect(runInContext("transcript.length", game.context)).toBe(2);
  });
});
