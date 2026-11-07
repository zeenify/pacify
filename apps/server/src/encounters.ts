import { randomInt } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { PreparedAiPick } from "./ai-pick.js";
import type { EncounterRecord, EncounterStore, KleinHistory, KleinScene } from "./encounter-types.js";
import { replayEncounter } from "./encounter-replay.js";
import { buildKleinContext } from "./klein-context.js";

export type EncounterDependencies = {
  store: EncounterStore;
  authenticate: (req: FastifyRequest) => string | null | Promise<string | null>;
  generateScene: (history: KleinHistory) => Promise<KleinScene>;
  seed?: () => number;
};
export class EncounterError extends Error {
  constructor(readonly statusCode: number, message: string) { super(message); }
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const bodyOf = (req: FastifyRequest): Record<string, unknown> => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) throw new EncounterError(400, "Invalid request");
  return req.body as Record<string, unknown>;
};
async function account(req: FastifyRequest, deps: EncounterDependencies) {
  const userId = await deps.authenticate(req);
  if (!userId) throw new EncounterError(401, "NOT LOGGED IN");
  return userId;
}
function encounterId(value: unknown): string {
  if (typeof value !== "string" || !uuid.test(value)) throw new EncounterError(400, "Invalid encounter");
  return value;
}
function owned(record: EncounterRecord | null): EncounterRecord {
  if (!record) throw new EncounterError(404, "Encounter not found");
  return record;
}
function readCount(record: EncounterRecord, value: unknown) {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > (record.data.scene?.lines.length ?? 0)) {
    throw new EncounterError(400, "Invalid scene position");
  }
  record.data.readCount = Math.max(record.data.readCount, value as number);
}
function replay(record: EncounterRecord, transcript: unknown) {
  try { return replayEncounter(record.seed, transcript, record.data.commits.map((c) => ({
    ...c, p1Locked: record.data.locks[c.round] ?? c.p1Locked,
  }))); }
  catch { throw new EncounterError(409, "Transcript does not match this encounter"); }
}
function samePrefix(record: EncounterRecord, transcript: { round: number; p1: string; p2: string }[]) {
  if (record.data.transcript.some((row, i) => transcript[i] && JSON.stringify(row) !== JSON.stringify(transcript[i]))) {
    throw new EncounterError(409, "Revealed history cannot be changed");
  }
}
const publicScene = (record: EncounterRecord) => ({
  id: record.id, studentId: record.studentId, scene: record.data.scene,
  readCount: record.data.readCount, started: record.data.started, completed: !!record.completedAt,
});

export function registerEncounterRoutes(app: FastifyInstance, deps: EncounterDependencies) {
  const generating = new Map<string, Promise<void>>();
  app.post("/campaign/encounters", { bodyLimit: 1024 }, async (req) => {
    const userId = await account(req, deps);
    const body = bodyOf(req);
    if (body.studentId !== 1) throw new EncounterError(400, "Only Klein's story is available");
    const id = encounterId(body.id);
    let record = owned(await deps.store.create(userId, id, deps.seed?.() ?? randomInt(0x7fffffff)));
    if (!record.data.scene) {
      let pending = generating.get(id);
      if (!pending) {
        if (generating.size >= 32) throw new EncounterError(503, "Please try again shortly");
        pending = (async () => {
          const history = await deps.store.history(userId, id);
          const scene = await deps.generateScene(history);
          await deps.store.change(userId, id, (current) => { current.data.scene ??= scene; });
        })().finally(() => { generating.delete(id); });
        generating.set(id, pending);
      }
      await pending;
      record = owned(await deps.store.read(userId, id));
    }
    return publicScene(record);
  });
  app.get("/campaign/encounters/:id", async (req) => {
    const userId = await account(req, deps);
    const id = encounterId((req.params as { id: string }).id);
    return publicScene(owned(await deps.store.read(userId, id)));
  });
  app.post("/campaign/encounters/:id/read", { bodyLimit: 1024 }, async (req) => {
    const userId = await account(req, deps);
    const id = encounterId((req.params as { id: string }).id);
    const body = bodyOf(req);
    const record = owned(await deps.store.change(userId, id, (r) => readCount(r, body.readCount)));
    return { readCount: record.data.readCount };
  });
  app.post("/campaign/encounters/:id/start", { bodyLimit: 1024 }, async (req) => {
    const userId = await account(req, deps);
    const id = encounterId((req.params as { id: string }).id);
    const body = bodyOf(req);
    const record = owned(await deps.store.change(userId, id, (r) => {
      if (!r.data.scene || r.completedAt) throw new EncounterError(409, "Encounter cannot be started");
      readCount(r, body.readCount);
      r.data.started = true;
    }));
    return { ...publicScene(record), seed: record.seed, transcript: record.data.transcript,
      p1Locked: record.data.locks[record.data.transcript.length + 1] ?? null };
  });
  app.post("/campaign/encounters/:id/round", { bodyLimit: 8192 }, async (req) => {
    const userId = await account(req, deps);
    const id = encounterId((req.params as { id: string }).id);
    const body = bodyOf(req);
    owned(await deps.store.change(userId, id, (r) => {
      if (!r.data.started) throw new EncounterError(409, "Encounter has not started");
      const verified = replay(r, body.transcript);
      samePrefix(r, verified.transcript);
      if (verified.state.phase === "over") throw new EncounterError(409, "Submit the finished duel as a result");
      if (verified.transcript.length > r.data.transcript.length) r.data.transcript = verified.transcript;
    }));
    return { ok: true };
  });
  app.post("/campaign/encounters/:id/result", { bodyLimit: 8192 }, async (req) => {
    const userId = await account(req, deps);
    const id = encounterId((req.params as { id: string }).id);
    const body = bodyOf(req);
    const record = owned(await deps.store.change(userId, id, (r) => {
      if (!r.data.started) throw new EncounterError(409, "Encounter has not started");
      const verified = replay(r, body.transcript);
      samePrefix(r, verified.transcript);
      if (verified.state.phase !== "over") throw new EncounterError(409, "Duel is not finished");
      r.data.transcript = verified.transcript;
      r.data.result = verified.state.result!.winner === "p1" ? "win" : verified.state.result!.winner === "p2" ? "loss" : "draw";
      r.completedAt ??= new Date();
    }));
    const verified = replay(record, record.data.transcript);
    return { ok: true, result: record.data.result, p1Score: verified.state.p1Score, p2Score: verified.state.p2Score };
  });
}

export async function prepareEncounterPick(req: FastifyRequest, deps: EncounterDependencies): Promise<PreparedAiPick | null> {
  const body = bodyOf(req);
  if (body.encounterId === undefined) return null;
  const userId = await account(req, deps);
  const id = encounterId(body.encounterId);
  let record = owned(await deps.store.read(userId, id));
  if (!record.data.started || record.completedAt) throw new EncounterError(409, "Encounter is not active");
  const verified = replay(record, body.transcript);
  samePrefix(record, verified.transcript);
  const state = verified.state;
  if (state.phase !== "commit") throw new EncounterError(409, "Duel is finished");
  if (!Number.isInteger(body.attempt) || (body.attempt as number) < 0 || (body.attempt as number) > 3 ||
      (body.p1Locked !== null && !state.p1Hand.some((c) => c.id === body.p1Locked))) {
    throw new EncounterError(400, "Invalid turn request");
  }
  record = owned(await deps.store.change(userId, id, (r) => {
    samePrefix(r, verified.transcript);
    const previous = r.data.locks[state.round];
    if (previous && body.p1Locked !== null && body.p1Locked !== previous) throw new EncounterError(409, "Locked card changed");
    if (body.p1Locked !== null) r.data.locks[state.round] = body.p1Locked as typeof previous;
  }));
  const locked = record.data.locks[state.round] ?? null;
  const history = await deps.store.history(userId, id);
  const context = buildKleinContext(history, {
    heardLines: record.data.scene?.lines.slice(0, record.data.readCount).map((l) => l.text) ?? [],
    speech: record.data.speech, results: verified.results,
  });
  const committed = record.data.commits.find((c) => c.round === state.round);
  if (committed?.p1Locked && locked !== committed.p1Locked) throw new EncounterError(409, "Locked card changed");
  const cachedLine = record.data.speech.find((s) => s.key === `${state.round}:commit`);
  return {
    scope: userId, context,
    body: {
      duelId: id, seed: record.seed, attempt: body.attempt, p1Locked: locked, characterId: 2,
      view: { studentId: 2, phase: "commit", round: state.round, myScore: state.p2Score, oppScore: state.p1Score,
        myHand: state.p2Hand, oppHand: state.p1Hand, peeked: state.p1Hand, oppPeeked: verified.playerPeeked,
        burned: state.burned, rngState: state.rngState, echoNext: state.echoNext, shieldOff: state.shieldOff },
      roundResults: verified.results,
    },
    cached: committed ? { picked: state.p2Hand.find((c) => c.id === committed.cardId)!, message: cachedLine?.message ?? "Your move.",
      interactionId: null, attempt: committed.attempt, waitMs: 0 } : undefined,
    finish: async (response) => {
      await deps.store.change(userId, id, (current) => {
        if (current.completedAt) throw new EncounterError(409, "Encounter is finished");
        samePrefix(current, verified.transcript);
        if (verified.transcript.length > current.data.transcript.length) current.data.transcript = verified.transcript;
        const key = response.picked ? `${state.round}:commit` : `${state.round}:thinking:${response.attempt}`;
        if (response.picked) {
          const previous = current.data.commits.find((c) => c.round === state.round);
          if (previous && previous.cardId !== response.picked.id) throw new EncounterError(409, "AI commitment changed");
          if (!previous) current.data.commits.push({ round: state.round, cardId: response.picked.id,
            p1Locked: locked, attempt: response.attempt });
        }
        if (!current.data.speech.some((s) => s.key === key)) current.data.speech.push({
          key, round: state.round, beat: response.picked ? "commit" : "thinking", message: response.message,
        });
      });
    },
  };
}
