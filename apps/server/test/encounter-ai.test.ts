import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import { createDuel } from "@pacify/engine";
import { registerAiPickRoutes } from "../src/ai-pick.js";

const state = createDuel({ seed: 12345, studentId: 2 });
const canonical = {
  duelId: "owned-encounter", seed: 12345, characterId: 2, attempt: 0, p1Locked: state.p1Hand[0].id,
  roundResults: [],
  view: { studentId: 2, round: 1, phase: "commit", myScore: 0, oppScore: 0,
    myHand: state.p2Hand, oppHand: state.p1Hand, peeked: [], oppPeeked: [], burned: [],
    echoNext: false, shieldOff: 0, rngState: state.rngState },
};

test("prepared account context replaces untrusted request and is persisted before returning a commitment", async () => {
  const app = Fastify();
  let persisted = false;
  let calls = 0;
  registerAiPickRoutes(app, {
    prepare: async () => ({ body: canonical, scope: "account-a", context: "verified history only", finish: async () => { persisted = true; } }),
    rankMoves: () => [{ card: state.p2Hand[0], v: 1, rank: 1 }],
    pickFromPool: async (_pool, _character, _view, ctx) => {
      calls++;
      assert.equal(ctx?.context, "verified history only");
      return { picked: state.p2Hand[0], message: "Ready when you are.", interactionId: null, resultsDelivered: true,
        prompt: "", reasoning: "", reasoningContent: "", neurons: 0, latencyMs: 0 };
    },
  });
  const res = await app.inject({ method: "POST", url: "/ai-pick", payload: { encounterId: "bad-client-state" } });
  assert.equal(res.statusCode, 200);
  assert.equal(calls, 1);
  assert.equal(persisted, true);
  assert.equal(res.json().picked.id, state.p2Hand[0].id);
  await app.close();
});

test("account identity separates round caches even with identical duel IDs", async () => {
  const app = Fastify();
  let calls = 0;
  registerAiPickRoutes(app, {
    prepare: async (req) => ({ body: canonical, scope: String(req.headers["x-owner"]), context: String(req.headers["x-owner"]), finish: async () => {} }),
    rankMoves: () => [{ card: state.p2Hand[0], v: 1, rank: 1 }],
    pickFromPool: async (_pool, _character, _view, ctx) => {
      calls++;
      return { picked: state.p2Hand[0], message: ctx!.context!, interactionId: null, resultsDelivered: true,
        prompt: "", reasoning: "", reasoningContent: "", neurons: 0, latencyMs: 0 };
    },
  });
  for (const owner of ["account-a", "account-b"]) {
    const res = await app.inject({ method: "POST", url: "/ai-pick", headers: { "x-owner": owner }, payload: {} });
    assert.equal(res.json().message, owner);
  }
  assert.equal(calls, 2);
  await app.close();
});

test("persisted commitments survive cache loss without another solver or persona call", async () => {
  const app = Fastify();
  const cached = { picked: state.p2Hand[0], message: "Still your move.", interactionId: null, attempt: 0, waitMs: 0 };
  registerAiPickRoutes(app, {
    prepare: async () => ({ body: canonical, scope: "account-a", context: "", cached, finish: async () => {} }),
    rankMoves: () => { throw new Error("must not reroll"); },
  });
  const res = await app.inject({ method: "POST", url: "/ai-pick", payload: {} });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), cached);
  await app.close();
});
