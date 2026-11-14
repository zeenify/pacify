import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import Fastify from "fastify";
import { CATALOGUE, cardById, type BrainView, type Card } from "@pacify/engine";
import { bestCounter, type RankedMove } from "@pacify/ai-brain";

process.env.LLM_PROVIDER = "gemini-interactions";
process.env.GEMINI_API_KEY = "test-only";
const { registerAiPickRoutes: register } = await import("../src/ai-pick.js");
const { pickFromPool, THINKING_FALLBACKS } = await import("../src/personality.js");
const { CHARACTERS } = await import("@pacify/ai-brain");

type Dependencies = {
  rankMoves?: (...args: any[]) => RankedMove[];
  bestCounter?: typeof bestCounter;
  pickFromPool?: typeof pickFromPool;
  clock?: () => number;
};

function view(round = 3): BrainView {
  const n = 8 - round;
  return {
    studentId: 2, round, phase: "commit", myScore: 3, oppScore: 4,
    myHand: CATALOGUE.slice(0, n), oppHand: CATALOGUE.slice(n, 2 * n),
    burned: CATALOGUE.slice(2 * n, 14), peeked: [], oppPeeked: [],
    shieldOff: 0, echoNext: false, rngState: 13579,
  };
}

function payload(seed = 1, round = 3, duelId = `duel-${seed}`) {
  return { duelId, seed, view: view(round), characterId: 2, attempt: 0, p1Locked: null as string | null };
}

async function fixture(extra: Dependencies = {}) {
  let now = 1000;
  const calls: { pool: RankedMove[]; view: BrainView; ctx: any }[] = [];
  let ranks = 0;
  let counters = 0;
  let clockObserved: (() => void) | undefined;
  const app = Fastify();
  register(app, {
    rankMoves: (v: BrainView) => {
      ranks++;
      return v.myHand.map((card, i) => ({ card, rank: i + 1, v: 0.5 }));
    },
    bestCounter: (root: any, locked: Card) => {
      counters++;
      assert.ok(root.theirs.some((c: Card) => c.id === locked.id));
      assert.deepEqual(locked, cardById(locked.id));
      return { card: root.mine[root.mine.length - 1], value: 1 };
    },
    pickFromPool: async (pool: RankedMove[], _character: any, v: BrainView, ctx: any) => {
      calls.push({ pool, view: v, ctx });
      return {
        picked: pool[0].card, message: ctx.beat === "thinking" ? "A quiet pause." : "Your turn.",
        reasoning: "SECRET", reasoningContent: "SECRET", prompt: "SECRET", neurons: 1,
        latencyMs: 1, interactionId: `chain-${calls.length}`, resultsDelivered: true,
      };
    },
    clock: () => {
      const notify = clockObserved; clockObserved = undefined;
      notify?.(); return now;
    },
    ...extra,
  });
  const post = (body: any) => app.inject({ method: "POST", url: "/ai-pick", payload: body });
  return { app, post, calls, get ranks() { return ranks; }, get counters() { return counters; },
    advance(ms: number) { now += ms; },
    nextClock() { return new Promise<void>((resolve) => { clockObserved = resolve; }); } };
}

// Discover seeded branches at the HTTP boundary rather than duplicating the roll algorithm.
async function find(f: Awaited<ReturnType<typeof fixture>>, kind: "miss" | "hit" | "bluff", round = 3) {
  for (let seed = 1; seed <= 100; seed++) {
    const body = payload(seed, round, `find-${kind}-${round}-${seed}`);
    const first = await f.post(body);
    assert.equal(first.statusCode, 200);
    const chat = first.json().picked === null;
    if (kind === "miss" && !chat) return { body, first: first.json() };
    if (!chat) continue;
    const locked = await f.post({ ...body, p1Locked: body.view.oppHand![0].id });
    assert.equal(locked.statusCode, 200);
    const isHit = locked.json().picked.id === body.view.myHand[body.view.myHand.length - 1].id;
    if ((kind === "hit") === isHit) return { body, first: first.json() };
  }
  assert.fail(`no ${kind} branch found`);
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

function shape(result: any) {
  assert.deepEqual(Object.keys(result).sort(), ["attempt", "interactionId", "message", "picked", "waitMs"]);
  assert.equal(typeof result.message, "string");
  assert.ok(result.interactionId === null || typeof result.interactionId === "string");
  assert.ok(Number.isInteger(result.attempt));
  assert.ok(Number.isInteger(result.waitMs));
  assert.equal(result.picked === null, result.waitMs > 0);
  assert.ok(!JSON.stringify(result).includes("SECRET"));
}

test("blind miss commits a legal minimal response and never changes after a lock", async (t) => {
  const f = await fixture(); t.after(() => f.app.close());
  const { body, first } = await find(f, "miss");
  shape(first);
  assert.equal(first.picked.id, body.view.myHand[0].id);
  const calls = f.calls.length;
  const again = await f.post({ ...body, p1Locked: body.view.oppHand![0].id });
  assert.deepEqual(again.json(), first);
  assert.equal(f.calls.length, calls);
});

test("hit chat conceals prepared move; a live lock commits a one-card counter with neutral context", async (t) => {
  const f = await fixture(); t.after(() => f.app.close());
  const { body } = await find(f, "hit");
  const fresh = { ...body, duelId: "hit-live", interactionId: "previous", roundResults: [
    { round: 2, klein: "Ogre", you: "Wizard", kleinPts: 0, youPts: 3, kleinScore: 3, youScore: 4 },
  ] };
  const first = (await f.post(fresh)).json();
  shape(first); assert.equal(first.picked, null);
  assert.ok(first.waitMs >= 5000 && first.waitMs <= 9000);
  const thinking = f.calls.at(-1)!;
  assert.equal(thinking.ctx.beat, "thinking");
  assert.equal(thinking.ctx.roundResults.length, 1);
  const result = (await f.post({ ...fresh, p1Locked: fresh.view.oppHand![0].id })).json();
  shape(result); assert.equal(result.picked.id, fresh.view.myHand.at(-1)!.id);
  const commit = f.calls.at(-1)!;
  assert.equal(commit.pool.length, 1);
  assert.equal(commit.ctx.beat, "commit");
  assert.equal(commit.ctx.interactionId, first.interactionId);
  assert.deepEqual(commit.ctx.roundResults, []);
  assert.deepEqual(commit.view, thinking.view);
  assert.deepEqual(Object.keys(commit.ctx).sort(), ["beat", "interactionId", "recent", "roundResults", "stance"]);
});

test("bluff chat commits its cached blind choice even when human locks during the window", async (t) => {
  const f = await fixture(); t.after(() => f.app.close());
  const { body } = await find(f, "bluff", 2);
  const fresh = { ...body, duelId: "bluff-live" };
  const first = (await f.post(fresh)).json();
  assert.equal(first.picked, null);
  const counters = f.counters;
  const result = (await f.post({ ...fresh, p1Locked: fresh.view.oppHand![0].id })).json();
  assert.equal(result.picked.id, fresh.view.myHand[0].id);
  assert.equal(f.counters, counters);
  assert.equal(f.calls.at(-1)!.pool.length, 1);
});

test("player-first hits counter immediately; player-first misses and bluffs stay blind", async (t) => {
  const f = await fixture(); t.after(() => f.app.close());
  for (const kind of ["hit", "miss", "bluff"] as const) {
    const { body } = await find(f, kind, 2);
    const result = (await f.post({ ...body, duelId: `initial-${kind}`, p1Locked: body.view.oppHand![0].id })).json();
    shape(result);
    assert.equal(result.waitMs, 0);
    assert.equal(result.picked.id, kind === "hit" ? body.view.myHand.at(-1)!.id : body.view.myHand[0].id);
  }
});

test("expired hit cannot read a late lock; only the next attempt can advance once", async (t) => {
  const f = await fixture(); t.after(() => f.app.close());
  const { body } = await find(f, "hit");
  const fresh = { ...body, duelId: "expiry" };
  const first = (await f.post(fresh)).json();
  assert.equal((await f.post({ ...fresh, attempt: 1 })).statusCode, 409);
  f.advance(1234);
  const residual = (await f.post(fresh)).json();
  assert.equal(residual.waitMs, first.waitMs - 1234);
  f.advance(first.waitMs - 1234);
  const counters = f.counters;
  const late = (await f.post({ ...fresh, p1Locked: fresh.view.oppHand![0].id })).json();
  assert.equal(late.picked, null); assert.equal(late.attempt, 0); assert.ok(late.waitMs > 0);
  assert.equal(f.counters, counters);
  const next = (await f.post({ ...fresh, attempt: 1 })).json();
  assert.equal(next.attempt, 1);
  const duplicate = (await f.post({ ...fresh, attempt: 1 })).json();
  assert.deepEqual(duplicate, next);
  assert.deepEqual((await f.post(fresh)).json(), next);
});

test("rerolls are capped at two or three stalls and compute the normal pool once", async (t) => {
  const f = await fixture(); t.after(() => f.app.close());
  let sawCap = false;
  for (let seed = 1; seed <= 40; seed++) {
    const body = payload(seed, 4, `cap-${seed}`);
    const ranks = f.ranks;
    let result = (await f.post(body)).json();
    let stalls = 0;
    while (result.picked === null) {
      stalls++;
      assert.ok(stalls <= 3);
      f.advance(result.waitMs);
      result = (await f.post({ ...body, attempt: stalls })).json();
      assert.equal(result.attempt, stalls);
    }
    assert.equal(f.ranks, ranks + 1);
    if (stalls >= 2) sawCap = true;
    shape(result);
  }
  assert.ok(sawCap);
});

test("seeded windows are independent of wall time and preserve the blind choice through rerolls", async (t) => {
  const a = await fixture(); const b = await fixture();
  t.after(() => a.app.close()); t.after(() => b.app.close());
  b.advance(100000000);
  const seen = new Set<number>();
  for (let seed = 1; seed <= 40; seed++) {
    const body = payload(seed, 4, `deterministic-${seed}`);
    let attempt = 0;
    let ra = (await a.post(body)).json();
    let rb = (await b.post(body)).json();
    assert.deepEqual(ra, rb);
    while (ra.picked === null) {
      a.advance(ra.waitMs); b.advance(rb.waitMs);
      attempt++;
      const next = { ...body, attempt };
      const before = a.calls.length;
      const responses = await Promise.all([a.post(next), a.post(next), b.post(next)]);
      ra = responses[0].json(); rb = responses[2].json();
      assert.deepEqual(ra, rb); assert.deepEqual(ra, responses[1].json());
      assert.equal(a.calls.length, before + 1);
      assert.equal(a.calls.at(-1)!.pool.length, 1);
      assert.equal(a.calls.at(-1)!.pool[0].card.id, body.view.myHand[0].id);
      assert.ok(attempt <= 3);
    }
    seen.add(attempt);
  }
  assert.ok(seen.has(2)); assert.ok(seen.has(3));
});

test("failed reroll retries the same attempt without replaying a successful thinking turn", async (t) => {
  const probe = await fixture(); t.after(() => probe.app.close());
  const { body } = await find(probe, "hit");
  let fail = false;
  let turns = 0;
  const f = await fixture({ pickFromPool: async (pool, _c, _v, ctx) => {
    if (fail) { fail = false; throw new Error("retry"); }
    turns++;
    return { picked: pool[0].card, message: "pause", reasoning: "", reasoningContent: "", prompt: "",
      neurons: 0, latencyMs: 0, interactionId: `success-${turns}`, resultsDelivered: true };
  } }); t.after(() => f.app.close());
  const fresh = { ...body, duelId: "reroll-failure" };
  const first = (await f.post(fresh)).json();
  f.advance(first.waitMs);
  fail = true;
  assert.equal((await f.post({ ...fresh, attempt: 1 })).statusCode, 502);
  const stale = (await f.post(fresh)).json();
  assert.equal(stale.attempt, 0); assert.equal(stale.interactionId, first.interactionId);
  const next = (await f.post({ ...fresh, attempt: 1 })).json();
  assert.equal(next.attempt, 1); assert.equal(next.interactionId, "success-2");
  assert.deepEqual((await f.post({ ...fresh, attempt: 1 })).json(), next);
  assert.equal(f.ranks, 1); assert.equal(turns, 2);
});

test("queued same-lock retry received before deadline still counters after failed narration crosses it", async (t) => {
  const probe = await fixture(); t.after(() => probe.app.close());
  const { body } = await find(probe, "hit");
  const entered = deferred(); const release = deferred();
  let beats = 0;
  const f = await fixture({ pickFromPool: async (pool) => {
    if (++beats === 2) { entered.resolve(); await release.promise; throw new Error("slow narration failure"); }
    return { picked: pool[0].card, message: "Klein waits.", reasoning: "", reasoningContent: "", prompt: "",
      neurons: 0, latencyMs: 0, interactionId: `delivered-${beats}`, resultsDelivered: true };
  } }); t.after(() => { release.resolve(); return f.app.close(); });
  const fresh = { ...body, duelId: "queued-lock-retry" };
  const first = (await f.post(fresh)).json();
  f.advance(first.waitMs - 1);
  const locked = { ...fresh, p1Locked: fresh.view.oppHand![0].id };
  const failed = f.post(locked);
  await entered.promise;
  const received = f.nextClock();
  const retry = f.post(locked);
  await received;
  f.advance(2); release.resolve();
  assert.equal((await failed).statusCode, 502);
  const result = await retry;
  assert.equal(result.statusCode, 200); shape(result.json());
  assert.equal(result.json().picked?.id, fresh.view.myHand.at(-1)!.id);
  assert.equal(result.json().attempt, 0); assert.equal(f.counters, 1); assert.equal(beats, 3);
});

test("late retry of a lock first received before deadline retains the original read", async (t) => {
  const probe = await fixture(); t.after(() => probe.app.close());
  const { body } = await find(probe, "hit");
  let beats = 0;
  const f = await fixture({ pickFromPool: async (pool) => {
    if (++beats === 2) throw new Error("narration failed");
    return { picked: pool[0].card, message: "Klein waits.", reasoning: "", reasoningContent: "", prompt: "",
      neurons: 0, latencyMs: 0, interactionId: `delivered-${beats}`, resultsDelivered: true };
  } }); t.after(() => f.app.close());
  const fresh = { ...body, duelId: "late-valid-retry" };
  const first = (await f.post(fresh)).json();
  const locked = { ...fresh, p1Locked: fresh.view.oppHand![0].id };
  f.advance(first.waitMs - 1);
  assert.equal((await f.post(locked)).statusCode, 502);
  f.advance(2);
  const result = await f.post(locked);
  assert.equal(result.statusCode, 200); shape(result.json());
  assert.equal(result.json().picked?.id, fresh.view.myHand.at(-1)!.id);
  assert.equal(result.json().attempt, 0); assert.equal(f.counters, 1);
});

test("a replacement lock is rejected after failed narration and after the original card commits", async (t) => {
  const probe = await fixture(); t.after(() => probe.app.close());
  const { body } = await find(probe, "hit");
  let beats = 0;
  const f = await fixture({ pickFromPool: async (pool) => {
    if (++beats === 2) throw new Error("narration failed");
    return { picked: pool[0].card, message: "Klein waits.", reasoning: "", reasoningContent: "", prompt: "",
      neurons: 0, latencyMs: 0, interactionId: `delivered-${beats}`, resultsDelivered: true };
  } }); t.after(() => f.app.close());
  const fresh = { ...body, duelId: "bound-lock" };
  await f.post(fresh);
  const locked = { ...fresh, p1Locked: fresh.view.oppHand![0].id };
  const replacement = { ...fresh, p1Locked: fresh.view.oppHand![1].id };
  assert.equal((await f.post(locked)).statusCode, 502);
  assert.equal((await f.post(replacement)).statusCode, 409);
  assert.equal(f.counters, 1); assert.equal(beats, 2);
  const committed = (await f.post(locked)).json();
  assert.equal(committed.picked.id, fresh.view.myHand.at(-1)!.id);
  assert.equal((await f.post(replacement)).statusCode, 409);
  assert.deepEqual((await f.post(locked)).json(), committed);
});

test("early next attempt queued behind slow failed narration stays rejected after expiry", async (t) => {
  const probe = await fixture(); t.after(() => probe.app.close());
  const { body } = await find(probe, "hit");
  const entered = deferred(); const release = deferred();
  let beats = 0;
  const f = await fixture({ pickFromPool: async (pool) => {
    if (++beats === 2) { entered.resolve(); await release.promise; throw new Error("slow narration failure"); }
    return { picked: pool[0].card, message: "Klein waits.", reasoning: "", reasoningContent: "", prompt: "",
      neurons: 0, latencyMs: 0, interactionId: `delivered-${beats}`, resultsDelivered: true };
  } }); t.after(() => { release.resolve(); return f.app.close(); });
  const fresh = { ...body, duelId: "early-queued-attempt" };
  const first = (await f.post(fresh)).json();
  const failed = f.post({ ...fresh, p1Locked: fresh.view.oppHand![0].id });
  await entered.promise;
  const received = f.nextClock();
  const early = f.post({ ...fresh, attempt: 1 });
  await received;
  f.advance(first.waitMs + 1); release.resolve();
  assert.equal((await failed).statusCode, 502);
  assert.equal((await early).statusCode, 409);
  assert.equal(beats, 2);
  const next = await f.post({ ...fresh, attempt: 1 });
  assert.equal(next.statusCode, 200); assert.equal(next.json().attempt, 1);
});

test("a genuinely expired first lock remains chat on retries before the next seeded attempt", async (t) => {
  const probe = await fixture(); t.after(() => probe.app.close());
  const { body } = await find(probe, "hit");
  const f = await fixture(); t.after(() => f.app.close());
  const fresh = { ...body, duelId: "late-first-lock" };
  const first = (await f.post(fresh)).json();
  const locked = { ...fresh, p1Locked: fresh.view.oppHand![0].id };
  f.advance(first.waitMs);
  const expired = (await f.post(locked)).json();
  shape(expired); assert.equal(expired.picked, null); assert.equal(expired.attempt, 0);
  f.advance(100);
  assert.equal((await f.post(locked)).json().picked, null); assert.equal(f.counters, 0);
  const next = (await f.post({ ...locked, attempt: 1 })).json();
  shape(next); assert.equal(next.attempt, 1); assert.notEqual(next.picked, null);
  assert.deepEqual((await f.post({ ...locked, attempt: 1 })).json(), next);
});

test("a lock received before the first thinking response is bound while narration is pending", async (t) => {
  const probe = await fixture(); t.after(() => probe.app.close());
  const { body } = await find(probe, "hit");
  const entered = deferred(); const release = deferred();
  let beats = 0;
  const f = await fixture({ pickFromPool: async (pool) => {
    if (++beats === 1) { entered.resolve(); await release.promise; }
    return { picked: pool[0].card, message: "Klein waits.", reasoning: "", reasoningContent: "", prompt: "",
      neurons: 0, latencyMs: 0, interactionId: `delivered-${beats}`, resultsDelivered: true };
  } }); t.after(() => { release.resolve(); return f.app.close(); });
  const fresh = { ...body, duelId: "pre-thinking-lock" };
  const thinking = f.post(fresh);
  await entered.promise;
  const locked = { ...fresh, p1Locked: fresh.view.oppHand![0].id };
  const lockReceived = f.nextClock();
  const commit = f.post(locked);
  await lockReceived;
  const replacementReceived = f.nextClock();
  const replacement = f.post({ ...fresh, p1Locked: fresh.view.oppHand![1].id });
  await replacementReceived;
  f.advance(10000); release.resolve();
  assert.equal((await thinking).json().picked, null);
  const result = (await commit).json();
  shape(result); assert.equal(result.picked?.id, fresh.view.myHand.at(-1)!.id);
  assert.equal((await replacement).statusCode, 409);
  assert.equal(beats, 2); assert.equal(f.counters, 1);
});

test("R1 and R7 never read, including human-first requests", async (t) => {
  const f = await fixture(); t.after(() => f.app.close());
  for (const round of [1, 7]) {
    for (let seed = 1; seed <= 12; seed++) {
      const body = payload(seed, round, `dead-${round}-${seed}`);
      const result = (await f.post({ ...body, p1Locked: body.view.oppHand![0].id })).json();
      shape(result); assert.equal(result.picked.id, body.view.myHand[0].id);
    }
  }
  assert.equal(f.counters, 0);
});

test("concurrent initial, lock, and duplicate calls serialize without duplicate chain turns", async (t) => {
  const probe = await fixture(); t.after(() => probe.app.close());
  const { body } = await find(probe, "hit");
  let release!: () => void;
  const gate = new Promise<void>((r) => { release = r; });
  let entered!: () => void;
  const started = new Promise<void>((r) => { entered = r; });
  let beats = 0;
  const f = await fixture({ pickFromPool: async (pool, _c, _v, ctx) => {
    beats++;
    if (beats === 1) { entered(); await gate; }
    return { picked: pool[0].card, message: "pause", reasoning: "", reasoningContent: "", prompt: "",
      neurons: 0, latencyMs: 0, interactionId: `turn-${beats}`, resultsDelivered: true };
  } }); t.after(() => f.app.close());
  const fresh = { ...body, duelId: "concurrent" };
  const a = f.post(fresh);
  await started;
  const b = f.post(fresh);
  const c = f.post({ ...fresh, p1Locked: fresh.view.oppHand![0].id });
  const d = f.post({ ...fresh, p1Locked: fresh.view.oppHand![0].id });
  release();
  const [ra, rb, rc, rd] = await Promise.all([a, b, c, d]);
  assert.equal(ra.json().picked, null);
  assert.deepEqual(ra.json(), rb.json());
  assert.equal(rc.json().picked.id, fresh.view.myHand.at(-1)!.id);
  assert.deepEqual(rc.json(), rd.json());
  assert.equal(beats, 2); assert.equal(f.ranks, 1); assert.equal(f.counters, 1);
});

test("persona failure preserves attempt, cached pool, chain and successful results cursor", async (t) => {
  const probe = await fixture(); t.after(() => probe.app.close());
  const { body } = await find(probe, "hit");
  let fail = false;
  const contexts: any[] = [];
  const f = await fixture({ pickFromPool: async (pool, _c, _v, ctx) => {
    contexts.push(ctx);
    if (fail) { fail = false; throw new Error("PRIVATE transport prompt"); }
    return { picked: pool[0].card, message: "pause", reasoning: "", reasoningContent: "", prompt: "",
      neurons: 0, latencyMs: 0, interactionId: `ok-${contexts.length}`, resultsDelivered: true };
  } }); t.after(() => f.app.close());
  const fresh = { ...body, duelId: "failure", interactionId: "original", roundResults: [
    { round: 1, klein: "Ogre", you: "Wizard", kleinPts: 0, youPts: 3, kleinScore: 0, youScore: 3 },
  ] };
  fail = true;
  const failed = await f.post(fresh);
  assert.equal(failed.statusCode, 502); assert.ok(!failed.body.includes("PRIVATE"));
  const first = (await f.post(fresh)).json();
  assert.equal(first.attempt, 0); assert.equal(f.ranks, 1);
  assert.equal(contexts[1].interactionId, "original"); assert.equal(contexts[1].roundResults.length, 1);
  const locked = { ...fresh, p1Locked: fresh.view.oppHand![0].id };
  fail = true;
  assert.equal((await f.post(locked)).statusCode, 502);
  const result = (await f.post(locked)).json();
  assert.equal(result.picked.id, fresh.view.myHand.at(-1)!.id);
  assert.equal(f.counters, 1);
  assert.equal(contexts.at(-1).interactionId, first.interactionId);
  assert.deepEqual(contexts.at(-1).roundResults, []);
});

test("solver failure can retry without consuming an attempt", async (t) => {
  let calls = 0;
  const f = await fixture({ rankMoves: (v) => {
    calls++; if (calls === 1) throw new Error("private solver internals");
    return [{ card: v.myHand[0], rank: 1, v: 1 }];
  } }); t.after(() => f.app.close());
  const body = { ...payload(3, 7), p1Locked: "paladin" };
  assert.equal((await f.post(body)).statusCode, 502);
  const result = (await f.post(body)).json();
  shape(result); assert.equal(result.attempt, 0); assert.equal(calls, 2);
});

test("rejects malformed views/cards/locks/attempts before expensive dependencies", async (t) => {
  const f = await fixture(); t.after(() => f.app.close());
  const base = payload(1);
  const cases: any[] = [
    null, {}, { ...base, duelId: "" }, { ...base, duelId: "x".repeat(129) },
    { ...base, seed: 1.5 }, { ...base, seed: 2 ** 32 }, { ...base, characterId: "2" },
    ...[-1, 0.5, 4, 100000, "1"].map((attempt) => ({ ...base, attempt })),
    { ...base, p1Locked: "archon" }, { ...base, p1Locked: "bandit" },
    { ...base, p1Locked: { id: "wizard", power: 999 } },
    ...[0, 8, 1.5].map((round) => ({ ...base, view: { ...base.view, round } })),
    { ...base, view: { ...base.view, phase: "reveal" } },
    { ...base, view: { ...base.view, myScore: 1e100 } },
    { ...base, view: { ...base.view, oppScore: null } },
    { ...base, view: { ...base.view, shieldOff: 3 } },
    { ...base, view: { ...base.view, echoNext: "false" } },
    { ...base, view: { ...base.view, rngState: 1.2 } },
    { ...base, view: { ...base.view, oppHand: undefined } },
    { ...base, view: { ...base.view, myHand: base.view.myHand.slice(1) } },
    { ...base, view: { ...base.view, myHand: Array(5).fill(base.view.myHand[0]) } },
    { ...base, view: { ...base.view, oppHand: base.view.myHand } },
    { ...base, view: { ...base.view, myHand: [{ ...base.view.myHand[0], power: 999 }, ...base.view.myHand.slice(1)] } },
    { ...base, view: { ...base.view, peeked: [base.view.myHand[0]] } },
    { ...base, view: { ...base.view, peeked: null } },
    { ...base, view: { ...base.view, oppPeeked: null } },
    { ...base, view: { ...base.view, burned: [] } },
    { ...base, roundResults: null },
    { ...base, interactionId: "x".repeat(513) },
    { ...base, roundResults: [{ round: 3, klein: "x", you: "y", kleinPts: 0, youPts: 0, kleinScore: 0, youScore: 0 }] },
  ];
  for (const body of cases) {
    const response = await f.post(body);
    assert.equal(response.statusCode, 400, JSON.stringify(body));
  }
  assert.equal(f.ranks, 0); assert.equal(f.calls.length, 0);
  assert.equal((await f.post({ ...base, characterId: 999 })).statusCode, 404);
  assert.equal((await f.post({ ...base, attempt: 1 })).statusCode, 409);
});

test("round key binds seed and canonical original view; different duels are isolated", async (t) => {
  const f = await fixture(); t.after(() => f.app.close());
  const body = { ...payload(1, 7), p1Locked: "paladin" };
  const first = (await f.post(body)).json();
  assert.equal((await f.post({ ...body, seed: 2 })).statusCode, 409);
  assert.equal((await f.post({ ...body, view: { ...body.view, myScore: 5 } })).statusCode, 409);
  const copy = structuredClone(body);
  copy.view.burned.reverse();
  assert.deepEqual((await f.post(copy)).json(), first);
  assert.equal((await f.post({ ...body, duelId: "separate", seed: 2 })).statusCode, 200);
  assert.equal(f.ranks, 2);
});

test("cache rejects new rounds when full without evicting committed decisions, then expires by TTL", async (t) => {
  const f = await fixture(); t.after(() => f.app.close());
  const body = { ...payload(1, 7, "retained"), p1Locked: "paladin" };
  const first = (await f.post(body)).json();
  for (let i = 1; i < 512; i++) {
    assert.equal((await f.post({ ...body, duelId: `cache-${i}` })).statusCode, 200);
  }
  assert.equal((await f.post({ ...body, duelId: "overflow" })).statusCode, 503);
  assert.deepEqual((await f.post(body)).json(), first);
  f.advance(30 * 60 * 1000 + 1);
  assert.equal((await f.post({ ...body, duelId: "overflow" })).statusCode, 200);
});

test("real bestCounter integration chooses the game-optimal shield in a small R6 fixture", async (t) => {
  const probe = await fixture(); t.after(() => probe.app.close());
  const { body } = await find(probe, "hit", 6);
  const f = await fixture({ bestCounter }); t.after(() => f.app.close());
  const mine = [cardById("bandit"), cardById("angel")];
  const theirs = [cardById("paladin"), cardById("demon")];
  const burned = CATALOGUE.filter((c) => ![...mine, ...theirs].some((x) => x.id === c.id)).slice(0, 10);
  const fresh = { ...body, duelId: "real-counter", p1Locked: "demon", view: {
    ...body.view, myHand: mine, oppHand: theirs, burned, myScore: 0, oppScore: 0,
  } };
  const result = (await f.post(fresh)).json();
  // Shield the demon with bandit, reserving angel to beat paladin in the x2 climax.
  assert.equal(result.picked.id, "bandit"); shape(result);
});

test("missing provider configuration does not prevent route registration or safe thinking fallback", () => {
  const moduleUrl = new URL("../src/ai-pick.ts", import.meta.url).href;
  const engineUrl = new URL("../../../packages/engine/src/index.ts", import.meta.url).href;
  const script = `
    process.env.LLM_PROVIDER = "cloudflare";
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_API_TOKEN;
    const { registerAiPickRoutes } = await import(${JSON.stringify(moduleUrl)});
    const { default: Fastify } = await import("fastify");
    const { CATALOGUE } = await import(${JSON.stringify(engineUrl)});
    const app = Fastify();
    registerAiPickRoutes(app);
    const response = await app.inject({ method: "POST", url: "/ai-pick", payload: {
      duelId: "no-provider", seed: 1, characterId: 2, attempt: 0, p1Locked: "paladin",
      view: { studentId: 2, round: 7, phase: "commit", myScore: 0, oppScore: 0,
        myHand: [CATALOGUE[0]], oppHand: [CATALOGUE[1]], burned: CATALOGUE.slice(2, 14),
        shieldOff: 0, echoNext: false, rngState: 1 },
    } });
    if (response.statusCode !== 200 || response.json().picked.id !== "bandit") process.exitCode = 1;
    await app.close();
  `;
  const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script],
    { encoding: "utf8", timeout: 15000 });
  assert.equal(result.status, 0, result.stderr);
});

test("thinking persona transport fallback never claims a play or reveals a card", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("offline"); };
  try {
    const v = view();
    const result = await pickFromPool([{ card: v.myHand[0], rank: 1, v: 1 }], CHARACTERS[2], v,
      { beat: "thinking", interactionId: "keep-chain" });
    assert.ok(!/play|commit|bandit|telegraph/i.test(result.message), result.message);
    assert.equal(result.interactionId, "keep-chain");
    assert.equal(result.resultsDelivered, false);
    assert.match(result.prompt, /thinking|not.*played/i);
  } finally { globalThis.fetch = original; }
});

test("thinking LLM output cannot leak its private choice; strategy is stateless and speech owns the chain", async () => {
  const original = globalThis.fetch;
  const sent: any[] = [];
  globalThis.fetch = async (_url, init) => {
    sent.push(JSON.parse(String(init!.body)));
    return new Response(JSON.stringify({ id: `provider-${sent.length}`, output_text: JSON.stringify({
      picked: sent.length === 1 ? "invalid" : "bandit", message: "I play Bandit.", reasoning: "private",
    }) }), { status: 200 });
  };
  try {
    const v = view();
    const result = await pickFromPool([{ card: v.myHand[0], rank: 1, v: 1 }], CHARACTERS[2], v, {
      beat: "thinking", interactionId: "before", roundResults: [
        { round: 1, klein: "Ogre", you: "Wizard", kleinPts: 0, youPts: 3, kleinScore: 0, youScore: 3 },
      ],
    });
    assert.ok(!/bandit|play|commit/i.test(result.message), result.message);
    // Strategy call: stateless — no chain head, no results block.
    assert.equal(sent[0].previous_interaction_id, undefined);
    assert.ok(!sent[0].input.includes("RESULTS OF PREVIOUS ROUNDS"));
    // Speech call: chains from the caller's head and delivers the outcomes.
    assert.equal(sent[1].previous_interaction_id, "before");
    assert.match(sent[1].input, /RESULTS OF PREVIOUS ROUNDS/);
    assert.equal(result.interactionId, "provider-2");
    assert.equal(result.resultsDelivered, true);
  } finally { globalThis.fetch = original; }
});

test("undelivered thinking fallback resends outcomes when the speech provider recovers", async (t) => {
  const probe = await fixture(); t.after(() => probe.app.close());
  const { body } = await find(probe, "hit");
  const f = await fixture({ pickFromPool }); t.after(() => f.app.close());
  const original = globalThis.fetch;
  const sent: any[] = [];
  globalThis.fetch = async (_url, init) => {
    sent.push(JSON.parse(String(init!.body)));
    if (sent.length === 2) throw new Error("offline before delivery");
    return new Response(JSON.stringify({ id: "recovered", output_text: JSON.stringify({
      picked: body.view.myHand.at(-1)!.id, message: "Klein nods.",
    }) }), { status: 200 });
  };
  try {
    const fresh = { ...body, duelId: "undelivered", interactionId: "previous", roundResults: [
      { round: 1, klein: "Ogre", you: "Wizard", kleinPts: 0, youPts: 3, kleinScore: 0, youScore: 3 },
    ] };
    const first = (await f.post(fresh)).json();
    shape(first); assert.equal(first.picked, null); assert.equal(first.interactionId, "previous");
    const locked = (await f.post({ ...fresh, p1Locked: fresh.view.oppHand![0].id })).json();
    shape(locked); assert.equal(locked.picked.id, fresh.view.myHand.at(-1)!.id);
    assert.equal(locked.interactionId, "recovered");
    assert.equal(sent[3].previous_interaction_id, "previous");
    assert.match(sent[3].input, /RESULTS OF PREVIOUS ROUNDS/);
    assert.match(sent[3].input, /Round 1: You played Ogre, opponent played Wizard/);
  } finally { globalThis.fetch = original; }
});

test("an invalid strategy turn never disturbs speech delivery; delivered outcomes are not resent", async (t) => {
  const probe = await fixture(); t.after(() => probe.app.close());
  const { body } = await find(probe, "hit");
  const f = await fixture({ pickFromPool }); t.after(() => f.app.close());
  const original = globalThis.fetch;
  const sent: any[] = [];
  globalThis.fetch = async (_url, init) => {
    sent.push(JSON.parse(String(init!.body)));
    return new Response(JSON.stringify({ id: `turn-${sent.length}`, output_text: JSON.stringify({
      picked: sent.length === 1 ? "invalid" : body.view.myHand.at(-1)!.id, message: "Klein nods.",
    }) }), { status: 200 });
  };
  try {
    const fresh = { ...body, duelId: "invalid-delivered", interactionId: "previous", roundResults: [
      { round: 1, klein: "Ogre", you: "Wizard", kleinPts: 0, youPts: 3, kleinScore: 0, youScore: 3 },
    ] };
    const first = (await f.post(fresh)).json();
    shape(first); assert.equal(first.picked, null); assert.equal(first.interactionId, "turn-2");
    const locked = (await f.post({ ...fresh, p1Locked: fresh.view.oppHand![0].id })).json();
    shape(locked); assert.equal(locked.picked.id, fresh.view.myHand.at(-1)!.id);
    // Speech keeps its own chain across the strategy correction.
    assert.equal(sent[4].previous_interaction_id, "turn-2");
    assert.ok(!sent[4].input.includes("RESULTS OF PREVIOUS ROUNDS"));
    assert.ok(!sent[1].input.includes("CORRECTION"), "corrections stay on the strategy call");
  } finally { globalThis.fetch = original; }
});

test("stateless fallback retains outcomes until successful delivery", async (t) => {
  const probe = await fixture(); t.after(() => probe.app.close());
  const { body } = await find(probe, "hit");
  const contexts: any[] = [];
  const f = await fixture({ pickFromPool: async (pool, _c, _v, ctx) => {
    contexts.push(ctx);
    return { picked: pool[0].card, message: "A quiet pause.", reasoning: "", reasoningContent: "", prompt: "",
      neurons: 0, latencyMs: 0, interactionId: null, resultsDelivered: contexts.length > 1 };
  } }); t.after(() => f.app.close());
  const fresh = { ...body, duelId: "stateless-delivery", roundResults: [
    { round: 1, klein: "Ogre", you: "Wizard", kleinPts: 0, youPts: 3, kleinScore: 0, youScore: 3 },
  ] };
  const first = (await f.post(fresh)).json();
  assert.equal(first.picked, null); assert.equal(first.interactionId, null);
  f.advance(first.waitMs);
  const next = (await f.post({ ...fresh, attempt: 1 })).json();
  shape(next); assert.equal(next.interactionId, null);
  assert.deepEqual(contexts[1].roundResults, fresh.roundResults);
});

test("stateless successful thinking delivery deduplicates outcomes in the locked beat", async (t) => {
  const probe = await fixture(); t.after(() => probe.app.close());
  const { body } = await find(probe, "hit");
  const contexts: any[] = [];
  const f = await fixture({ pickFromPool: async (pool, _c, _v, ctx) => {
    contexts.push(ctx);
    return { picked: pool[0].card, message: "A quiet pause.", reasoning: "", reasoningContent: "", prompt: "",
      neurons: 0, latencyMs: 0, interactionId: null, resultsDelivered: true };
  } }); t.after(() => f.app.close());
  const fresh = { ...body, duelId: "stateless-dedup", roundResults: [
    { round: 1, klein: "Ogre", you: "Wizard", kleinPts: 0, youPts: 3, kleinScore: 0, youScore: 3 },
  ] };
  const first = (await f.post(fresh)).json();
  assert.equal(first.picked, null); assert.equal(first.interactionId, null);
  const locked = (await f.post({ ...fresh, p1Locked: fresh.view.oppHand![0].id })).json();
  shape(locked); assert.equal(locked.picked.id, fresh.view.myHand.at(-1)!.id);
  assert.deepEqual(contexts[0].roundResults, fresh.roundResults);
  assert.deepEqual(contexts[1].roundResults, []);
});

test("strategy transport failure degrades to the god pool without blocking speech delivery", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(String(init!.body));
    // Strategy calls carry the pool; speech calls never do.
    if (String(body.input).includes("ALLOWED CHOICES")) throw new Error("strategy offline");
    return new Response(JSON.stringify({ id: "speech-ok", output_text: JSON.stringify({
      message: "Klein waits.",
    }) }), { status: 200 });
  };
  try {
    const v = view();
    const result = await pickFromPool([{ card: v.myHand[0], rank: 1, v: 1 }], CHARACTERS[2], v,
      { beat: "thinking", interactionId: "previous", roundResults: [
        { round: 1, klein: "Ogre", you: "Wizard", kleinPts: 0, youPts: 3, kleinScore: 0, youScore: 3 },
      ] });
    assert.equal(result.picked.id, v.myHand[0].id);
    assert.equal(result.message, "Klein waits.");
    assert.equal(result.interactionId, "speech-ok");
    assert.equal(result.resultsDelivered, true);
    assert.equal(result.fallback, false);
  } finally { globalThis.fetch = original; }
});

test("speech transport failure keeps the chain, resends outcomes later and flags the canned line", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(String(init!.body));
    if (!String(body.input).includes("ALLOWED CHOICES")) throw new Error("speech offline");
    return new Response(JSON.stringify({ id: "strategy-ok", output_text: JSON.stringify({
      picked: "bandit", reasoning: "why not",
    }) }), { status: 200 });
  };
  try {
    const v = view();
    const result = await pickFromPool([{ card: v.myHand[0], rank: 1, v: 1 }], CHARACTERS[2], v,
      { beat: "thinking", interactionId: "keep-chain" });
    assert.equal(result.picked.id, "bandit");
    assert.notEqual(result.message, "");
    assert.ok(!/bandit|play|commit/i.test(result.message), result.message);
    assert.equal(result.interactionId, "keep-chain");
    assert.equal(result.resultsDelivered, false);
    assert.equal(result.fallback, true);
  } finally { globalThis.fetch = original; }
});

test("thinking LLM replaces descriptive card leaks and blank messages with a neutral pause", async (t) => {
  const original = globalThis.fetch;
  const messages = [
    "The one-power bad card is my choice.", "I favor 1.", "I favor twelve.",
    "Its power suits me.", "I prefer bad.", "I favor GOOD.", "The alignment suits me.",
    "A card waits.", "My hand is strong.", "My pick is certain.", "I have chosen.",
    "A trick awaits.", "My strategy will prevail.", "My tactics are sound.", "", " \t\n ",
  ];
  try {
    for (const message of messages) {
      await t.test(JSON.stringify(message), async () => {
        globalThis.fetch = async () => new Response(JSON.stringify({ id: "thinking-leak", output_text: JSON.stringify({
          picked: "bandit", message,
        }) }), { status: 200 });
        const v = view();
        const result = await pickFromPool([{ card: v.myHand[0], rank: 1, v: 1 }], CHARACTERS[2], v,
          { beat: "thinking" });
        assert.notEqual(result.message, message);
        assert.ok(result.message.trim().length > 0);
        assert.ok(!/card|hand|pick|choice|power|align|good|bad|trick|strateg|tactic|\d/i.test(result.message), result.message);
        assert.equal(result.picked.id, "bandit");
      });
    }
  } finally { globalThis.fetch = original; }
});

test("thinking prompt requests mood-only knowledge-neutral pauses and preserves neutral persona lines", async () => {
  const original = globalThis.fetch;
  const messages = ["A quiet pause.", "Klein smiles faintly.", "Patience. I'm not in a hurry."];
  try {
    for (const message of messages) {
      let sent: any;
      globalThis.fetch = async (_url, init) => {
        sent = JSON.parse(String(init!.body));
        return new Response(JSON.stringify({ id: "neutral", output_text: JSON.stringify({ picked: "bandit", message }) }),
          { status: 200 });
      };
      const v = view();
      const result = await pickFromPool([{ card: v.myHand[0], rank: 1, v: 1 }], CHARACTERS[2], v,
        { beat: "thinking" });
      assert.equal(result.message, message);
      assert.match(sent.input, /mood-only.*knowledge-neutral/i);
    }
  } finally { globalThis.fetch = original; }
});

test("commit persona fake signaling of a different card is not filtered as a thinking leak", async () => {
  const original = globalThis.fetch;
  const message = "Perhaps Angel would suit this moment.";
  globalThis.fetch = async () => new Response(JSON.stringify({ id: "commit", output_text: JSON.stringify({
    picked: "bandit", message,
  }) }), { status: 200 });
  try {
    const v = view();
    const result = await pickFromPool([{ card: v.myHand[0], rank: 1, v: 1 }], CHARACTERS[2], v,
      { beat: "commit" });
    assert.equal(result.picked.id, "bandit"); assert.equal(result.message, message);
  } finally { globalThis.fetch = original; }
});

test("commit prompt forbids actual-card disclosure and lock knowledge while preserving persona bluffing", async () => {
  const original = globalThis.fetch;
  let sent: any;
  globalThis.fetch = async (_url, init) => {
    sent = JSON.parse(String(init!.body));
    return new Response(JSON.stringify({ id: "commit-prompt", output_text: JSON.stringify({
      picked: "bandit", message: "Klein nods.",
    }) }), { status: 200 });
  };
  try {
    const v = view();
    await pickFromPool([{ card: v.myHand[0], rank: 1, v: 1 }], CHARACTERS[2], v, { beat: "commit" });
    const instruction = sent.input.slice(sent.input.indexOf("COMMIT BEAT"));
    assert.doesNotMatch(instruction, /narrate.*selected card/i);
    assert.match(instruction, /never name, describe or hint at your actual chosen card/i);
    assert.match(instruction, /even when committing before the opponent/i);
    assert.match(instruction, /never claim knowledge of the opponent's current lock or choice/i);
    assert.match(instruction, /fake signaling a different card.*persona/i);
  } finally { globalThis.fetch = original; }
});

test("fallback speech avoids recent lines and goes silent when the bank is exhausted", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("offline"); };
  try {
    const v = view();
    const seen = new Set<string>();
    // walk the whole bank: every used line is excluded from the next pick
    for (let i = 0; i < THINKING_FALLBACKS.length; i++) {
      const result = await pickFromPool([{ card: v.myHand[0], rank: 1, v: 1 }], CHARACTERS[2], v,
        { beat: "thinking", interactionId: "keep-chain", recent: [...seen] });
      assert.equal(result.fallback, true);
      assert.ok(result.message.length > 0, "bank not yet exhausted");
      assert.ok(!seen.has(result.message), "fallback must not repeat a recent line");
      assert.ok(THINKING_FALLBACKS.includes(result.message), result.message);
      seen.add(result.message);
    }
    const silent = await pickFromPool([{ card: v.myHand[0], rank: 1, v: 1 }], CHARACTERS[2], v,
      { beat: "thinking", interactionId: "keep-chain", recent: [...seen] });
    assert.equal(silent.message, "", "silence beats a repeat once the bank is exhausted");
    assert.equal(silent.interactionId, "keep-chain");
    assert.equal(silent.resultsDelivered, false);
  } finally { globalThis.fetch = original; }
});

test("commit speech carries a private tone tell; thinking beats stay knowledge-neutral", async () => {
  const original = globalThis.fetch;
  const sent: any[] = [];
  globalThis.fetch = async (_url, init) => {
    sent.push(JSON.parse(String(init!.body)));
    return new Response(JSON.stringify({ id: "t", output_text: JSON.stringify({ picked: "bandit", message: "Klein nods." }) }), { status: 200 });
  };
  try {
    const v = view();
    await pickFromPool([{ card: v.myHand[0], rank: 1, v: 1 }], CHARACTERS[2], v, { beat: "commit", stance: "smug", recent: ["Old line."] });
    const speech = sent.find((b) => String(b.input).includes("COMMIT BEAT"));
    assert.match(String(speech.input), /TONE TELL \(private, this moment only\): you feel smug/);
    assert.match(String(speech.input), /LINES YOU HAVE ALREADY SAID/);
    assert.match(String(speech.input), /"Old line\."/);
    sent.length = 0;
    await pickFromPool([{ card: v.myHand[0], rank: 1, v: 1 }], CHARACTERS[2], v, { beat: "thinking", stance: "smug" });
    const thinking = sent.find((b) => String(b.input).includes("THINKING BEAT"));
    assert.doesNotMatch(String(thinking.input), /TONE TELL/);
  } finally { globalThis.fetch = original; }
});

test("a generated line that verbatim-repeats a recent line is replaced, never sent twice", async () => {
  const original = globalThis.fetch;
  const repeat = "Heh. Okay. I'm in."; // a COMMIT_FALLBACKS line, returned by the model
  globalThis.fetch = async () => new Response(JSON.stringify({ id: "t", output_text: JSON.stringify({
    picked: "bandit", message: repeat,
  }) }), { status: 200 });
  try {
    const v = view();
    const result = await pickFromPool([{ card: v.myHand[0], rank: 1, v: 1 }], CHARACTERS[2], v,
      { beat: "commit", recent: [repeat] });
    assert.notEqual(result.message, repeat, "verbatim repeat must be rejected");
    assert.notEqual(result.message, "");
    assert.equal(result.fallback, true);
    assert.equal(result.picked.id, "bandit");
    // without the recent line the same model output passes through untouched
    const clean = await pickFromPool([{ card: v.myHand[0], rank: 1, v: 1 }], CHARACTERS[2], v, { beat: "commit" });
    assert.equal(clean.message, repeat);
    assert.equal(clean.fallback, false);
  } finally { globalThis.fetch = original; }
});
