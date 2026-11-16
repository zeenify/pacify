import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import { createDuel, dispatch } from "@pacify/engine";
import { registerEncounterRoutes, prepareEncounterPick } from "../src/encounters.js";
import type { EncounterRecord, EncounterStore, KleinHistory } from "../src/encounter-types.js";

const id = "00000000-0000-4000-8000-000000000001";
const scene = { chapter: "The Lowest Seat", lines: [{ text: "Pull up a chair.", pose: "welcoming" as const }, { text: "A line you skipped.", pose: "playful" as const }] };
const epilogueScene = { chapter: "After the Duel", lines: [{ text: "Good game. You had me worried.", pose: "welcoming" as const }] };
const emptyHistory: KleinHistory = {
  verified: { games: 0, wins: 0, losses: 0, draws: 0 }, hasLegacyHistory: false, hasMet: false,
  playerName: null, lastPlayedAt: null, recentMatches: [], recentSpeech: [], playerReplies: [], memories: [],
};

async function fixture() {
  const rows = new Map<string, EncounterRecord>();
  let completions = 0;
  let generations = 0;
  let tail = Promise.resolve();
  const store: EncounterStore & {
    saveMemory(userId: string, id: string, memory: { summary: string; moments: { round: number; text: string }[] }): Promise<boolean>;
  } = {
    async create(userId, encounterId, seed) {
      if (!rows.has(encounterId)) rows.set(encounterId, {
        id: encounterId, userId, studentId: 1, seed, createdAt: new Date(), completedAt: null,
        data: { scene: null, readCount: 0, started: false, transcript: [], locks: {}, commits: [], speech: [], result: null,
          epilogue: null, epilogueReadCount: 0, replies: [], generation: {} },
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
    async saveMemory(_userId, encounterId, memory) {
      const row = rows.get(encounterId);
      if (!row?.completedAt) return false;
      (row.data as any).savedMemory = memory;
      return true;
    },
  };
  const app = Fastify();
  const dependencies = {
    store, authenticate: (req: any) => req.headers["x-test-user"] as string || null,
    generateScene: async () => { generations++; return { scene, source: "generated" as const, latencyMs: 1, audited: false }; },
    generateEpilogue: async () => ({ scene: epilogueScene, source: "generated" as const, latencyMs: 1, audited: true }),
    generateMemory: async () => ({ summary: "They took the match 20-4.", moments: [], source: "generated" as const, latencyMs: 1 }),
    react: async (_history: unknown, _moment: unknown, result: { round: number }) => ({ message: `Round ${result.round} reaction.` }),
    seed: () => 12345,
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

test("revealed history comparison ignores JSON key order from storage", async () => {
  const f = await fixture();
  await f.request("/campaign/encounters", { id, studentId: 1 });
  await f.request(`/campaign/encounters/${id}/start`, { readCount: 0 });
  const state = createDuel({ seed: 12345, studentId: 2 });
  const row = { round: 1, p1: state.p1Hand[0].id, p2: state.p2Hand[0].id };
  f.rows.get(id)!.data.commits.push({ round: 1, cardId: row.p2, p1Locked: null, attempt: 0 });
  f.rows.get(id)!.data.transcript = [{ p1: row.p1, p2: row.p2, round: row.round }];
  const next = await prepareEncounterPick({ headers: { "x-test-user": "account-a" },
    body: { encounterId: id, attempt: 0, p1Locked: null, transcript: [row] } } as any, f.dependencies);
  assert.equal((next!.body as any).view.round, 2);
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
  assert.ok(prepared!.context.includes("Pull up a chair."));
  assert.equal(prepared.context.includes("other-account"), false);
  // Prose memory: heard lines are quoted, unheard lines stay out.
  assert.match(prepared.context, /You've already said to them this encounter: "Pull up a chair\."/);
  assert.equal(prepared.context.includes("A line you skipped."), false);
  assert.match(prepared.context, /never met .* before\. This is a first encounter\./);
  assert.equal(prepared.situation, "first-meeting");
  await assert.rejects(() => prepareEncounterPick({
    headers: { "x-test-user": "account-b" }, body: { encounterId: id, attempt: 0, p1Locked: null, transcript: [] },
  } as any, f.dependencies));
  await f.app.close();
});

test("reveal reactions are replay-verified, idempotent and never created for unseen rounds", async () => {
  const f = await fixture();
  await f.request("/campaign/encounters", { id, studentId: 1 });
  await f.request(`/campaign/encounters/${id}/start`, { readCount: 1 });
  assert.equal((await f.request(`/campaign/encounters/${id}/reactions`, { transcript: [] })).statusCode, 400);
  const state = createDuel({ seed: 12345, studentId: 2 });
  const p1 = state.p1Hand[0].id, p2 = state.p2Hand[0].id;
  f.rows.get(id)!.data.commits.push({ round: 1, cardId: p2, p1Locked: null, attempt: 0 });
  const row = { round: 1, p1, p2 };
  const first = await f.request(`/campaign/encounters/${id}/reactions`, { transcript: [row] });
  assert.equal(first.statusCode, 200);
  assert.equal(first.json().message, "Round 1 reaction.");
  assert.equal(first.json().round, 1);
  const stored = f.rows.get(id)!.data.speech.find((s) => s.key === "1:reveal");
  assert.equal(stored?.beat, "reveal");
  assert.equal(stored?.message, "Round 1 reaction.");
  const second = await f.request(`/campaign/encounters/${id}/reactions`, { transcript: [row] });
  assert.equal(second.json().message, "Round 1 reaction.");
  await f.app.close();
});

test("reactions reject fabricated transcripts and other accounts", async () => {
  const f = await fixture();
  await f.request("/campaign/encounters", { id, studentId: 1 });
  await f.request(`/campaign/encounters/${id}/start`, { readCount: 1 });
  const state = createDuel({ seed: 12345, studentId: 2 });
  const p1 = state.p1Hand[0].id, p2 = state.p2Hand[0].id;
  f.rows.get(id)!.data.commits.push({ round: 1, cardId: p2, p1Locked: null, attempt: 0 });
  const forged = { round: 1, p1: p2, p2 };
  assert.equal((await f.request(`/campaign/encounters/${id}/reactions`, { transcript: [forged] }, "account-b")).statusCode, 404);
  assert.equal((await f.request(`/campaign/encounters/${id}/reactions`, { transcript: [forged] })).statusCode, 409);
  await f.app.close();
});

test("replies are resolved from the server-owned scene, never client text", async () => {
  const f = await fixture();
  const exchange = { choices: [
    { id: "c1", text: "Let's do this!", response: { text: "Ha! That's the spirit.", pose: "playful" as const } },
    { id: "c2", text: "Go easy on me.", response: { text: "Relax, you've got this.", pose: "welcoming" as const } },
  ] };
  await f.request("/campaign/encounters", { id, studentId: 1 });
  f.rows.get(id)!.data.scene = { ...scene, lines: [{ text: "Ready to play?", pose: "playful" as const }], exchange };
  assert.equal((await f.request(`/campaign/encounters/${id}/reply`, { choiceId: "cX" })).statusCode, 400);
  const reply = await f.request(`/campaign/encounters/${id}/reply`, { choiceId: "c1" });
  assert.equal(reply.statusCode, 200);
  assert.deepEqual(reply.json().response, exchange.choices[0].response);
  assert.deepEqual(f.rows.get(id)!.data.replies, [{ choiceId: "c1", text: "Let's do this!", response: "Ha! That's the spirit." }]);
  const repeat = await f.request(`/campaign/encounters/${id}/reply`, { choiceId: "c2" });
  assert.equal(repeat.statusCode, 200);
  assert.deepEqual(repeat.json().response, exchange.choices[0].response, "first reply sticks");
  await f.request(`/campaign/encounters/${id}/start`, { readCount: 1 });
  assert.equal((await f.request(`/campaign/encounters/${id}/reply`, { choiceId: "c1" })).statusCode, 409);
  await f.app.close();
});

test("finished duels finalize story in the background and serve the epilogue idempotently", async () => {
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
  await f.request(`/campaign/encounters/${id}/result`, { transcript });
  const epilogue = await f.request(`/campaign/encounters/${id}/epilogue`);
  assert.equal(epilogue.statusCode, 200);
  assert.equal(epilogue.json().result, state.p1Score > state.p2Score ? "win" : state.p1Score < state.p2Score ? "loss" : "draw");
  assert.deepEqual(epilogue.json().epilogue, epilogueScene);
  assert.equal(f.rows.get(id)!.data.generation.epilogueSource, "generated");
  assert.equal(f.rows.get(id)!.data.generation.memorySource, "generated");
  assert.deepEqual((f.rows.get(id)!.data as any).savedMemory, { summary: "They took the match 20-4.", moments: [] });
  const again = await f.request(`/campaign/encounters/${id}/epilogue`);
  assert.deepEqual(again.json().epilogue, epilogueScene);
  const read = await f.request(`/campaign/encounters/${id}/epilogue/read`, { readCount: 99 });
  assert.equal(read.statusCode, 400);
  assert.equal((await f.request(`/campaign/encounters/${id}/epilogue/read`, { readCount: 1 })).statusCode, 200);
  await f.app.close();
});

test("a memory fill that fails after the epilogue is retried, never stranded pending", async () => {
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
  // The first memory write dies (transient DB blip / crash between the two writes).
  const realSave = f.store.saveMemory.bind(f.store);
  let saves = 0;
  f.store.saveMemory = async (u, eid, mem) => {
    saves++;
    if (saves === 1) throw new Error("transient memory write failure");
    return realSave(u, eid, mem);
  };
  await f.request(`/campaign/encounters/${id}/result`, { transcript });
  await new Promise((r) => setTimeout(r, 60)); // let the first finalize settle
  // The epilogue route must still drive the story to completion: the memory is
  // filled on retry and the epilogue is served, not stranded as a pending row.
  const epilogue = await f.request(`/campaign/encounters/${id}/epilogue`);
  assert.equal(epilogue.statusCode, 200);
  assert.deepEqual(epilogue.json().epilogue, epilogueScene);
  assert.ok(saves >= 2, "memory write was retried");
  assert.deepEqual((f.rows.get(id)!.data as any).savedMemory, { summary: "They took the match 20-4.", moments: [] });
  await f.app.close();
});

test("epilogue is refused before completion", async () => {
  const f = await fixture();
  await f.request("/campaign/encounters", { id, studentId: 1 });
  assert.equal((await f.request(`/campaign/encounters/${id}/epilogue`)).statusCode, 409);
  await f.app.close();
});

test("a fallback scene regenerates on the next visit before the duel starts", async () => {
  const f = await fixture();
  let calls = 0;
  const fallbackScene = { chapter: "The Lowest Seat", lines: [{ text: "Canned opener.", pose: "welcoming" as const }] };
  f.dependencies.generateScene = async () => {
    calls++;
    return calls === 1
      ? { scene: fallbackScene, source: "fallback" as const, latencyMs: 1, audited: false }
      : { scene, source: "generated" as const, latencyMs: 2, audited: true };
  };
  await f.request("/campaign/encounters", { id, studentId: 1 });
  assert.deepEqual(f.rows.get(id)!.data.scene, fallbackScene);
  assert.equal(f.rows.get(id)!.data.generation.sceneSource, "fallback");
  const again = await f.request("/campaign/encounters", { id, studentId: 1 });
  assert.equal(again.statusCode, 200);
  assert.deepEqual(again.json().scene, scene, "fallback scene replaced by the generated one");
  assert.equal(f.rows.get(id)!.data.generation.sceneSource, "generated");
  assert.equal(calls, 2);
  // started encounters never regenerate
  await f.request(`/campaign/encounters/${id}/start`, { readCount: 1 });
  f.dependencies.generateScene = async () => { calls++; return { scene: epilogueScene, source: "generated" as const, latencyMs: 1, audited: false }; };
  await f.request("/campaign/encounters", { id, studentId: 1 });
  assert.equal(f.rows.get(id)!.data.generation.sceneSource, "generated");
  assert.equal(calls, 2, "no regeneration after start");
  await f.app.close();
});

test("a silent reaction (exhausted bank) is never stored or returned", async () => {
  const f = await fixture();
  await f.request("/campaign/encounters", { id, studentId: 1 });
  await f.request(`/campaign/encounters/${id}/start`, { readCount: 1 });
  f.dependencies.react = async () => ({ message: "" });
  const state = createDuel({ seed: 12345, studentId: 2 });
  const p1 = state.p1Hand[0].id, p2 = state.p2Hand[0].id;
  f.rows.get(id)!.data.commits.push({ round: 1, cardId: p2, p1Locked: null, attempt: 0 });
  const res = await f.request(`/campaign/encounters/${id}/reactions`, { transcript: [{ round: 1, p1, p2 }] });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().message, "");
  assert.equal(f.rows.get(id)!.data.speech.some((s) => s.key === "1:reveal"), false);
  await f.app.close();
});

// The stub mirrors the real issuer contract: empty/blank text earns no ticket.
const voiceStub = (issued: { uid: string; character: number; text: string }[]) => ({
  issue: (uid: string, character: number, text: string) => {
    if (!text.trim()) return null;
    issued.push({ uid, character, text });
    return `t:${character}:${text}`;
  },
});

test("voice tickets ride scene lines and reply responses, issued for character 2, never stored", async () => {
  const f = await fixture();
  const issued: { uid: string; character: number; text: string }[] = [];
  (f.dependencies as any).voice = voiceStub(issued);
  const exchange = { choices: [
    { id: "c1", text: "Let's do this!", response: { text: "Ha! That's the spirit.", pose: "playful" as const } },
  ] };
  await f.request("/campaign/encounters", { id, studentId: 1 });
  f.rows.get(id)!.data.scene = { ...scene, lines: [{ text: "Ready to play?", pose: "playful" as const }], exchange };
  const created = await f.request("/campaign/encounters", { id, studentId: 1 });
  assert.deepEqual(created.json().scene.lines,
    [{ text: "Ready to play?", pose: "playful", voiceTicket: "t:2:Ready to play?" }]);
  // Klein's voice is engine character 2 even though the encounter studentId is 1.
  assert.ok(issued.length > 0);
  assert.ok(issued.every((i) => i.uid === "account-a" && i.character === 2));
  const reply = await f.request(`/campaign/encounters/${id}/reply`, { choiceId: "c1" });
  assert.deepEqual(reply.json().response,
    { text: "Ha! That's the spirit.", pose: "playful", voiceTicket: "t:2:Ha! That's the spirit." });
  // The stored (authoritative) reply replays with a freshly issued ticket.
  const repeat = await f.request(`/campaign/encounters/${id}/reply`, { choiceId: "c1" });
  assert.equal(repeat.json().response.voiceTicket, "t:2:Ha! That's the spirit.");
  // The stored reply row keeps its plain text shape; tickets are response-only.
  assert.deepEqual(f.rows.get(id)!.data.replies,
    [{ choiceId: "c1", text: "Let's do this!", response: "Ha! That's the spirit." }]);
  assert.equal(JSON.stringify(f.rows.get(id)).includes("voiceTicket"), false);
  await f.app.close();
});

test("voice tickets ride reactions and epilogue lines and are never stored", async () => {
  const f = await fixture();
  const issued: { uid: string; character: number; text: string }[] = [];
  (f.dependencies as any).voice = voiceStub(issued);
  await f.request("/campaign/encounters", { id, studentId: 1 });
  await f.request(`/campaign/encounters/${id}/start`, { readCount: 1 });
  const state = createDuel({ seed: 12345, studentId: 2 });
  const p1 = state.p1Hand[0].id, p2 = state.p2Hand[0].id;
  f.rows.get(id)!.data.commits.push({ round: 1, cardId: p2, p1Locked: null, attempt: 0 });
  const row = { round: 1, p1, p2 };
  const reaction = await f.request(`/campaign/encounters/${id}/reactions`, { transcript: [row] });
  assert.equal(reaction.json().message, "Round 1 reaction.");
  assert.equal(reaction.json().voiceTicket, "t:2:Round 1 reaction.");
  // The stored reaction replays with a freshly issued ticket too.
  const repeat = await f.request(`/campaign/encounters/${id}/reactions`, { transcript: [row] });
  assert.equal(repeat.json().voiceTicket, "t:2:Round 1 reaction.");
  let live = createDuel({ seed: 12345, studentId: 2 });
  const transcript: { round: number; p1: string; p2: string }[] = [];
  while (live.phase !== "over") {
    const c1 = live.p1Hand[0].id, c2 = live.p2Hand[0].id;
    f.rows.get(id)!.data.commits.push({ round: live.round, cardId: c2, p1Locked: null, attempt: 0 });
    transcript.push({ round: live.round, p1: c1, p2: c2 });
    live = dispatch(live, { t: "lock_ai", cardId: c2 }).state;
    live = dispatch(live, { t: "lock_player", cardId: c1 }).state;
    if (live.phase === "reveal") live = dispatch(live, { t: "next_round" }).state;
  }
  await f.request(`/campaign/encounters/${id}/result`, { transcript });
  const epilogue = await f.request(`/campaign/encounters/${id}/epilogue`);
  assert.deepEqual(epilogue.json().epilogue.lines,
    [{ text: "Good game. You had me worried.", pose: "welcoming", voiceTicket: "t:2:Good game. You had me worried." }]);
  assert.ok(issued.every((i) => i.uid === "account-a" && i.character === 2));
  assert.equal(JSON.stringify(f.rows.get(id)).includes("voiceTicket"), false);
  await f.app.close();
});

test("scene tickets carry a delivery direction: a vocal cue wins over the pose style", async () => {
  const f = await fixture();
  const issued: { text: string; direction: any }[] = [];
  (f.dependencies as any).voice = {
    issue: (_uid: string, character: number, text: string, direction?: any) => {
      issued.push({ text, direction });
      return `t:${character}:${text}`;
    },
  };
  await f.request("/campaign/encounters", { id, studentId: 1 });
  f.rows.get(id)!.data.scene = { chapter: "The Lowest Seat", lines: [
    { text: "Heh. Ready to play?", pose: "playful" as const },
    { text: "Take your time.", pose: "thoughtful" as const },
  ] };
  issued.length = 0;
  await f.request(`/campaign/encounters/${id}`);
  // "Heh" supports a chuckle, so the vocal tag wins and hugs the cue word.
  assert.deepEqual(issued[0], { text: "Heh. Ready to play?", direction: { tag: "chuckling", before: "Heh" } });
  // No vocal cue → the thoughtful pose becomes a delivery-style tag.
  assert.deepEqual(issued[1], { text: "Take your time.", direction: { tag: "soft voice" } });
  await f.app.close();
});

test("a silent reaction earns no voice ticket", async () => {
  const f = await fixture();
  const issued: { uid: string; character: number; text: string }[] = [];
  (f.dependencies as any).voice = voiceStub(issued);
  f.dependencies.react = async () => ({ message: "" });
  await f.request("/campaign/encounters", { id, studentId: 1 });
  await f.request(`/campaign/encounters/${id}/start`, { readCount: 1 });
  const before = issued.length;
  const state = createDuel({ seed: 12345, studentId: 2 });
  const p1 = state.p1Hand[0].id, p2 = state.p2Hand[0].id;
  f.rows.get(id)!.data.commits.push({ round: 1, cardId: p2, p1Locked: null, attempt: 0 });
  const res = await f.request(`/campaign/encounters/${id}/reactions`, { transcript: [{ round: 1, p1, p2 }] });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().message, "");
  assert.equal("voiceTicket" in res.json(), false);
  assert.equal(issued.length, before, "a silent reaction issues nothing");
  await f.app.close();
});
