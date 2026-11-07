import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import { createDuel, dispatch } from "@pacify/engine";
import { registerEncounterRoutes, prepareEncounterPick } from "../src/encounters.js";
import type { EncounterRecord, EncounterStore, KleinHistory } from "../src/encounter-types.js";

const id = "00000000-0000-4000-8000-000000000001";
const scene = { chapter: "The Lowest Seat", lines: [{ text: "Pull up a chair.", pose: "welcoming" as const }] };
const emptyHistory: KleinHistory = { verified: { games: 0, wins: 0, losses: 0, draws: 0 }, hasLegacyHistory: false, hasMet: false, recentMatches: [], recentSpeech: [] };

async function fixture() {
  const rows = new Map<string, EncounterRecord>();
  let completions = 0;
  let generations = 0;
  let tail = Promise.resolve();
  const store: EncounterStore = {
    async create(userId, encounterId, seed) {
      if (!rows.has(encounterId)) rows.set(encounterId, {
        id: encounterId, userId, studentId: 1, seed, createdAt: new Date(), completedAt: null,
        data: { scene: null, readCount: 0, started: false, transcript: [], locks: {}, commits: [], speech: [], result: null },
      });
      return this.read(userId, encounterId);
    },
    async read(userId, encounterId) { const row = rows.get(encounterId); return row?.userId === userId ? structuredClone(row) : null; },
    async change(userId, encounterId, edit) {
      const task = tail.then(async () => {
        const row = await this.read(userId, encounterId);
        if (!row) return null;
        const before = row.completedAt;
        edit(row);
        if (!before && row.completedAt) completions++;
        rows.set(encounterId, structuredClone(row));
        return row;
      });
      tail = task.then(() => {}, () => {});
      return task;
    },
    async history() { return structuredClone(emptyHistory); },
  };
  const app = Fastify();
  const dependencies = {
    store, authenticate: (req: any) => req.headers["x-test-user"] as string || null,
    generateScene: async () => { generations++; return scene; }, seed: () => 12345,
  };
  registerEncounterRoutes(app, dependencies);
  const request = (url: string, payload?: unknown, user = "account-a") => app.inject({
    method: payload === undefined ? "GET" : "POST", url, payload,
    headers: { "x-test-user": user },
  });
  return { app, rows, store, dependencies, request, completions: () => completions, generations: () => generations };
}

test("encounters require an account and only implement Klein", async () => {
  const f = await fixture();
  assert.equal((await f.request("/campaign/encounters", { id, studentId: 1 }, "")).statusCode, 401);
  assert.equal((await f.request("/campaign/encounters", { id, studentId: 2 })).statusCode, 400);
  await f.app.close();
});

test("scene creation and reload are idempotent without exposing the seed before play", async () => {
  const f = await fixture();
  const responses = await Promise.all([1, 2, 3].map(() => f.request("/campaign/encounters", { id, studentId: 1 })));
  for (const res of responses) {
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json().scene, scene);
    assert.equal(res.json().seed, undefined);
  }
  assert.equal(f.generations(), 1);
  assert.equal(f.rows.size, 1);
  await f.app.close();
});

test("another account cannot read, start, acknowledge or finalize an encounter", async () => {
  const f = await fixture();
  await f.request("/campaign/encounters", { id, studentId: 1 });
  for (const path of ["", "/read", "/start", "/result"]) {
    const res = await f.request(`/campaign/encounters/${id}${path}`, path ? { readCount: 1, transcript: [] } : undefined, "account-b");
    assert.equal(res.statusCode, 404);
    assert.equal(res.json().scene, undefined);
  }
  assert.equal((await f.request("/campaign/encounters", { id, studentId: 1 }, "account-b")).statusCode, 404);
  await f.app.close();
});

test("only actually read lines are acknowledged; skipping does not invent a conversation", async () => {
  const f = await fixture();
  await f.request("/campaign/encounters", { id, studentId: 1 });
  assert.equal((await f.request(`/campaign/encounters/${id}/read`, { readCount: 99 })).statusCode, 400);
  const started = await f.request(`/campaign/encounters/${id}/start`, { readCount: 0 });
  assert.equal(started.statusCode, 200);
  assert.equal(started.json().seed, 12345);
  assert.equal(f.rows.get(id)!.data.readCount, 0);
  await f.request(`/campaign/encounters/${id}/read`, { readCount: 1 });
  await f.request(`/campaign/encounters/${id}/read`, { readCount: 0 });
  assert.equal(f.rows.get(id)!.data.readCount, 1);
  assert.equal(f.completions(), 0);
  await f.app.close();
});

test("incomplete and fabricated final results never enter memory", async () => {
  const f = await fixture();
  await f.request("/campaign/encounters", { id, studentId: 1 });
  await f.request(`/campaign/encounters/${id}/start`, { readCount: 1 });
  assert.equal((await f.request(`/campaign/encounters/${id}/result`, { transcript: [], p1Score: 100 })).statusCode, 409);
  assert.equal(f.completions(), 0);
  await f.app.close();
});

test("retries of a real terminal duel save exactly once and ignore claimed scores", async () => {
  const f = await fixture();
  await f.request("/campaign/encounters", { id, studentId: 1 });
  await f.request(`/campaign/encounters/${id}/start`, { readCount: 1 });
  let state = createDuel({ seed: 12345, studentId: 2 });
  const transcript: { round: number; p1: string; p2: string }[] = [];
  while (state.phase !== "over") {
    const p1 = state.p1Hand[0].id, p2 = state.p2Hand[0].id;
    f.rows.get(id)!.data.commits.push({ round: state.round, cardId: p2, p1Locked: null, attempt: 0 });
    transcript.push({ round: state.round, p1, p2 });
    state = dispatch(state, { t: "lock_ai", cardId: p2 }).state;
    state = dispatch(state, { t: "lock_player", cardId: p1 }).state;
    if (state.phase === "reveal") state = dispatch(state, { t: "next_round" }).state;
  }
  const responses = await Promise.all([1, 2, 3].map(() => f.request(`/campaign/encounters/${id}/result`, { transcript, p1Score: 100, p2Score: 0 })));
  assert.equal(f.completions(), 1);
  for (const res of responses) {
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().p1Score, state.p1Score);
    assert.equal(res.json().p2Score, state.p2Score);
  }
  assert.equal((await f.request(`/campaign/encounters/${id}/result`, { transcript: [] })).statusCode, 409);
  await f.app.close();
});

test("a pending player lock survives reload and cannot be switched", async () => {
  const f = await fixture();
  await f.request("/campaign/encounters", { id, studentId: 1 });
  await f.request(`/campaign/encounters/${id}/start`, { readCount: 0 });
  const state = createDuel({ seed: 12345, studentId: 2 });
  const req = (card: string | null) => ({ headers: { "x-test-user": "account-a" },
    body: { encounterId: id, attempt: 0, p1Locked: card, transcript: [] } }) as any;
  await prepareEncounterPick(req(state.p1Hand[0].id), f.dependencies);
  const resumed = await f.request(`/campaign/encounters/${id}/start`, { readCount: 0 });
  assert.equal(resumed.json().p1Locked, state.p1Hand[0].id);
  const prepared = await prepareEncounterPick(req(null), f.dependencies);
  assert.equal((prepared!.body as any).p1Locked, state.p1Hand[0].id);
  await assert.rejects(() => prepareEncounterPick(req(state.p1Hand[1].id), f.dependencies));
  await f.app.close();
});

test("revealed round checkpoints support reload without counting unfinished matches", async () => {
  const f = await fixture();
  await f.request("/campaign/encounters", { id, studentId: 1 });
  await f.request(`/campaign/encounters/${id}/start`, { readCount: 0 });
  const state = createDuel({ seed: 12345, studentId: 2 });
  const row = { round: 1, p1: state.p1Hand[0].id, p2: state.p2Hand[0].id };
  f.rows.get(id)!.data.commits.push({ round: 1, cardId: row.p2, p1Locked: null, attempt: 0 });
  const response = await f.request(`/campaign/encounters/${id}/round`, { transcript: [row] });
  assert.equal(response.statusCode, 200);
  const resumed = await f.request(`/campaign/encounters/${id}/start`, { readCount: 0 });
  assert.deepEqual(resumed.json().transcript, [row]);
  assert.equal(f.completions(), 0);
  assert.equal((await f.request(`/campaign/encounters/${id}/round`, { transcript: [{ ...row, p1: row.p2 }] })).statusCode, 409);
  await f.app.close();
});

test("AI preparation uses canonical hands and account context, not client claims or conversation IDs", async () => {
  const f = await fixture();
  await f.request("/campaign/encounters", { id, studentId: 1 });
  await f.request(`/campaign/encounters/${id}/start`, { readCount: 1 });
  const prepared = await prepareEncounterPick({
    headers: { "x-test-user": "account-a" },
    body: { encounterId: id, attempt: 0, p1Locked: null, transcript: [], characterId: 999, interactionId: "other-account", view: { myScore: 99 } },
  } as any, f.dependencies);
  assert.ok(prepared);
  assert.equal((prepared.body as any).characterId, 2);
  assert.equal((prepared.body as any).interactionId, undefined);
  assert.equal((prepared.body as any).view.myScore, 0);
  assert.equal((prepared.body as any).view.myHand.length, 7);
  assert.ok(prepared.context.includes("Pull up a chair."));
  assert.equal(prepared.context.includes("other-account"), false);
  await assert.rejects(() => prepareEncounterPick({
    headers: { "x-test-user": "account-b" }, body: { encounterId: id, attempt: 0, p1Locked: null, transcript: [] },
  } as any, f.dependencies));
  await f.app.close();
});
