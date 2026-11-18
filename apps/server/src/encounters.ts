import { randomInt } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { PreparedAiPick } from "./ai-pick.js";
import type { EncounterData, EncounterRecord, EncounterStore, KleinHistory, KleinMatch, KleinScene } from "./encounter-types.js";
import type { MemoryGeneration, SceneGeneration } from "./klein-context.js";
import type { RoundResult } from "./personality.js";
import { replayEncounter } from "./encounter-replay.js";
import type { CardId } from "@pacify/engine";
import { kleinMemoryBrief, kleinPlayerScene } from "./klein-context.js";
import { STORY_PROFILES } from "./story-profiles.js";
import { deliveryFor, poseStyle, revealStyle, stripDeliveryTags } from "./voice-direction.js";
import type { VoiceIssuer } from "./voice.js";

export type EncounterMoment = { heardLines: string[]; speech: EncounterData["speech"]; results: RoundResult[] };
export type EncounterDependencies = {
  store: EncounterStore & {
    saveMemory(userId: string, id: string, memory: { summary: string; moments: { round: number; text: string }[] }): Promise<boolean>;
  };
  authenticate: (req: FastifyRequest) => string | null | Promise<string | null>;
  generateScene: (history: KleinHistory, studentId: number) => Promise<SceneGeneration>;
  generateEpilogue: (history: KleinHistory, match: KleinMatch, studentId: number) => Promise<SceneGeneration>;
  generateMemory: (history: KleinHistory, match: KleinMatch, studentId: number) => Promise<MemoryGeneration>;
  react: (history: KleinHistory, moment: EncounterMoment, result: RoundResult, studentId: number) => Promise<{ message: string }>;
  // Recent-line exclusion and prompt context are wired in index.ts via moment.speech.
  seed?: () => number;
  /** Optional TTS ticket issuer (voice.ts). Tickets are computed per response,
   *  never persisted, and only issued for authenticated encounter callers. */
  voice?: VoiceIssuer;
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
  if (record.data.transcript.some((row, i) => {
    const sent = transcript[i];
    return sent && (row.round !== sent.round || row.p1 !== sent.p1 || row.p2 !== sent.p2);
  })) {
    throw new EncounterError(409, "Revealed history cannot be changed");
  }
}

/** Strict replay first; when it fails only because a round has no AI commit
 *  (the provider hiccuped mid-duel and the client finished the round locally),
 *  the transcript's own card is trusted for exactly those rounds. Everything
 *  else — hand membership, resolution, contiguity — stays engine-verified. */
function replayForRead(record: EncounterRecord, transcript: unknown) {
  try {
    return replay(record, transcript);
  } catch (err) {
    const rows = (Array.isArray(transcript) ? transcript : []) as { round: number; p1: string; p2: string }[];
    const commits = record.data.commits.map((c) => ({ ...c, p1Locked: record.data.locks[c.round] ?? c.p1Locked }));
    const patched = rows
      .filter((row) => !commits.some((c) => c.round === row.round))
      .map((row) => ({ round: row.round, cardId: row.p2 as CardId, p1Locked: row.p1 as CardId }));
    if (!patched.length) throw err;
    return replayEncounter(record.seed, transcript, [...commits, ...patched]);
  }
}

export function registerEncounterRoutes(app: FastifyInstance, deps: EncounterDependencies) {
  const generating = new Map<string, Promise<void>>();
  const reacting = new Map<string, Promise<string>>();
  const storyWrites = new Map<string, Promise<void>>();

  // The encounter row's studentId is the campaign seat; the engine/TTS character
  // id is seat + 1 (student 1 Klein = character 2), the same map as ai-brain.
  const voiceCharacter = (studentId: number) => studentId + 1;
  /** Tickets are response-only decoration: the key is absent (never null) when
   *  voice is off, so every no-voice response shape is unchanged. */
  const ticketFor = (userId: string, studentId: number, text: string, style = "") => {
    const voiceTicket = deps.voice?.issue(userId, voiceCharacter(studentId), text, deliveryFor(text, style)) ?? null;
    return voiceTicket ? { voiceTicket } : {};
  };
  // Lines keep their [delivery tags] in the ticket (Fish renders them) while the
  // displayed text is stripped clean. Exchange responses strip the same way.
  const voicedScene = (userId: string, studentId: number, scene: KleinScene | null) => {
    if (!scene) return null;
    const lines = scene.lines.map((line) => ({
      ...line, text: stripDeliveryTags(line.text),
      ...ticketFor(userId, studentId, line.text, poseStyle(line.pose)),
    }));
    const exchange = scene.exchange
      ? { ...scene.exchange, choices: scene.exchange.choices.map((c) => ({ ...c, response: { ...c.response, text: stripDeliveryTags(c.response.text) } })) }
      : undefined;
    return { ...scene, lines, exchange };
  };
  const publicScene = (userId: string, record: EncounterRecord) => ({
    id: record.id, studentId: record.studentId,
    scene: voicedScene(userId, record.studentId, record.data.scene ? kleinPlayerScene(record.data.scene) : null),
    readCount: record.data.readCount, started: record.data.started, completed: !!record.completedAt,
  });

  /** Generate + persist the post-duel epilogue and the verified episodic memory.
   *  Fire-and-forget after the result commit; the epilogue route awaits the same
   *  promise. Never runs inside a store transaction (pool max: 1 would deadlock). */
  function finalizeStory(userId: string, id: string): Promise<void> {
    const dedupe = `${userId}:${id}`;
    let pending = storyWrites.get(dedupe);
    if (!pending) {
      pending = (async () => {
        const record = owned(await deps.store.read(userId, id));
        if (!record.completedAt || record.data.epilogue) return;
        const verified = replay(record, record.data.transcript);
        const match: KleinMatch = {
          result: record.data.result ?? "draw",
          playerScore: verified.state.p1Score, kleinScore: verified.state.p2Score,
          rounds: verified.results,
        };
        const history = await deps.store.history(userId, id, record.studentId);
        const [memory, epilogue] = await Promise.all([
          deps.generateMemory(history, match, record.studentId), deps.generateEpilogue(history, match, record.studentId),
        ]);
        // Fill the memory FIRST and write the epilogue LAST: the epilogue is the
        // completion marker the retry paths gate on, so a failed memory write must
        // leave it absent — otherwise a pending memory row would never be retried.
        await deps.store.saveMemory(userId, id, { summary: memory.summary, moments: memory.moments });
        await deps.store.change(userId, id, (current) => {
          current.data.epilogue ??= epilogue.scene;
          current.data.generation.epilogueSource ??= epilogue.source;
          current.data.generation.epilogueLatencyMs ??= epilogue.latencyMs;
          current.data.generation.epilogueAudited ??= epilogue.audited;
          current.data.generation.memorySource ??= memory.source;
          current.data.generation.memoryLatencyMs ??= memory.latencyMs;
        });
      })().finally(() => storyWrites.delete(dedupe));
      storyWrites.set(dedupe, pending);
    }
    return pending;
  }

  app.post("/campaign/encounters", { bodyLimit: 1024 }, async (req) => {
    const userId = await account(req, deps);
    const body = bodyOf(req);
    const studentId = body.studentId;
    if (!Number.isInteger(studentId) || !STORY_PROFILES[studentId as number]) {
      throw new EncounterError(400, "That seat's story is not available yet");
    }
    const id = encounterId(body.id);
    let record = owned(await deps.store.create(userId, id, deps.seed?.() ?? randomInt(0x7fffffff), studentId as number));
    // A scene that was stored as a fallback (transport timeout at creation time)
    // is retried here: the rematch opening is the most important moment in the
    // relationship and must not open on canned text when a retry can fix it.
    const retryFallbackScene = !!record.data.scene && record.data.generation.sceneSource === "fallback"
      && !record.data.started && !record.completedAt;
    if (!record.data.scene || retryFallbackScene) {
      let pending = generating.get(id);
      if (!pending) {
        if (generating.size >= 32) throw new EncounterError(503, "Please try again shortly");
        pending = (async () => {
          const history = await deps.store.history(userId, id, record.studentId);
          const generation = await deps.generateScene(history, record.studentId);
          await deps.store.change(userId, id, (current) => {
            if (retryFallbackScene) {
              current.data.scene = generation.scene;
              current.data.generation.sceneSource = generation.source;
              current.data.generation.sceneLatencyMs = generation.latencyMs;
              current.data.generation.sceneAudited = generation.audited;
            } else {
              current.data.scene ??= generation.scene;
              current.data.generation.sceneSource ??= generation.source;
              current.data.generation.sceneLatencyMs ??= generation.latencyMs;
              current.data.generation.sceneAudited ??= generation.audited;
            }
          });
        })().finally(() => { generating.delete(id); });
        generating.set(id, pending);
      }
      await pending;
      record = owned(await deps.store.read(userId, id));
    }
    return publicScene(userId, record);
  });
  app.get("/campaign/encounters/:id", async (req) => {
    const userId = await account(req, deps);
    const id = encounterId((req.params as { id: string }).id);
    return publicScene(userId, owned(await deps.store.read(userId, id)));
  });
  app.post("/campaign/encounters/:id/read", { bodyLimit: 1024 }, async (req) => {
    const userId = await account(req, deps);
    const id = encounterId((req.params as { id: string }).id);
    const body = bodyOf(req);
    const record = owned(await deps.store.change(userId, id, (r) => readCount(r, body.readCount)));
    return { readCount: record.data.readCount };
  });
  app.post("/campaign/encounters/:id/reply", { bodyLimit: 1024 }, async (req) => {
    const userId = await account(req, deps);
    const id = encounterId((req.params as { id: string }).id);
    const body = bodyOf(req);
    const record = owned(await deps.store.read(userId, id));
    if (!record.data.scene || record.data.started || record.completedAt) {
      throw new EncounterError(409, "This encounter cannot take a reply");
    }
    const existing = record.data.replies[0];
    if (existing) {
      const choice = record.data.scene.exchange?.choices.find((c) => c.id === existing.choiceId);
      // The first reply sticks on replays; the ticket is re-issued fresh for the
      // authoritative (stored) response text each time.
      const response = choice ? { ...choice.response, ...ticketFor(userId, record.studentId, choice.response.text, poseStyle(choice.response.pose)) } : null;
      return { ok: true, response };
    }
    if (!record.data.scene.exchange || typeof body.choiceId !== "string") {
      throw new EncounterError(400, "Invalid reply");
    }
    // The reply text is resolved from the server-owned scene; the client never
    // supplies words, only a choice id.
    const choice = record.data.scene.exchange.choices.find((c) => c.id === body.choiceId);
    if (!choice) throw new EncounterError(400, "Invalid reply");
    await deps.store.change(userId, id, (current) => {
      if (!current.data.replies.length) {
        current.data.replies.push({ choiceId: choice.id, text: choice.text, response: choice.response.text });
      }
    });
    return { ok: true, response: { ...choice.response, ...ticketFor(userId, record.studentId, choice.response.text, poseStyle(choice.response.pose)) } };
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
    return { ...publicScene(userId, record), seed: record.seed, transcript: record.data.transcript,
      p1Locked: record.data.locks[record.data.transcript.length + 1] ?? null };
  });
  app.post("/campaign/encounters/:id/round", { bodyLimit: 8192 }, async (req) => {
    const userId = await account(req, deps);
    const id = encounterId((req.params as { id: string }).id);
    const body = bodyOf(req);
    owned(await deps.store.change(userId, id, (r) => {
      if (!r.data.started) throw new EncounterError(409, "Encounter has not started");
      const verified = replayForRead(r, body.transcript);
      samePrefix(r, verified.transcript);
      if (verified.state.phase === "over") throw new EncounterError(409, "Submit the finished duel as a result");
      if (verified.transcript.length > r.data.transcript.length) r.data.transcript = verified.transcript;
    }));
    return { ok: true };
  });
  app.post("/campaign/encounters/:id/reactions", { bodyLimit: 8192 }, async (req) => {
    const userId = await account(req, deps);
    const id = encounterId((req.params as { id: string }).id);
    const body = bodyOf(req);
    let record = owned(await deps.store.read(userId, id));
    if (!record.data.started || record.completedAt) throw new EncounterError(409, "Encounter is not active");
    const verified = replayForRead(record, body.transcript);
    samePrefix(record, verified.transcript);
    const result = verified.results.at(-1);
    if (!result) throw new EncounterError(400, "Nothing to react to yet");
    const key = `${result.round}:reveal`;
    const existing = record.data.speech.find((s) => s.key === key);
    if (existing) return { message: existing.message, round: result.round, ...ticketFor(userId, record.studentId, existing.message, revealStyle(result)) };
    // Reactions are reveal-phase speech; they never touch locks, commits or /ai-pick.
    const dedupe = `${userId}:${id}:${key}`;
    let pending = reacting.get(dedupe);
    if (!pending) {
      pending = (async () => {
        const history = await deps.store.history(userId, id, record.studentId);
        const moment: EncounterMoment = {
          heardLines: record.data.scene?.lines.slice(0, record.data.readCount).map((l) => l.text) ?? [],
          speech: record.data.speech, results: verified.results,
        };
        const reaction = await deps.react(history, moment, result, record.studentId);
        await deps.store.change(userId, id, (current) => {
          // An empty reaction is deliberate silence (exhausted fallback bank) —
          // silence beats a repeated line, and it is never stored.
          if (reaction.message.trim() && !current.data.speech.some((s) => s.key === key)) {
            current.data.speech.push({ key, round: result.round, beat: "reveal", message: reaction.message });
          }
        });
        return reaction.message;
      })().finally(() => { reacting.delete(dedupe); });
      reacting.set(dedupe, pending);
    }
    const message = await pending;
    return { message, round: result.round, ...ticketFor(userId, record.studentId, message, revealStyle(result)) };
  });
  app.post("/campaign/encounters/:id/result", { bodyLimit: 8192 }, async (req) => {
    const userId = await account(req, deps);
    const id = encounterId((req.params as { id: string }).id);
    const body = bodyOf(req);
    const record = owned(await deps.store.change(userId, id, (r) => {
      if (!r.data.started) throw new EncounterError(409, "Encounter has not started");
      const verified = replayForRead(r, body.transcript);
      samePrefix(r, verified.transcript);
      if (verified.state.phase !== "over") throw new EncounterError(409, "Duel is not finished");
      r.data.transcript = verified.transcript;
      r.data.result = verified.state.result!.winner === "p1" ? "win" : verified.state.result!.winner === "p2" ? "loss" : "draw";
      // Backfill commits for rounds the client played through provider failures
      // (no server commit exists) — the store's completion replay needs one per
      // round, and the story writer replays the same way.
      for (const row of verified.transcript) {
        if (!r.data.commits.some((c) => c.round === row.round)) {
          r.data.commits.push({ round: row.round, cardId: row.p2 as CardId, p1Locked: row.p1 as CardId, attempt: 0 });
        }
      }
      r.completedAt ??= new Date();
    }));
    const verified = replayForRead(record, record.data.transcript);
    // Prewarm the story: epilogue + episodic memory generate in the background so
    // the post-duel scene is ready the moment the player taps CONTINUE.
    if (!record.data.epilogue) void finalizeStory(userId, id).catch(() => {});
    return { ok: true, result: record.data.result, p1Score: verified.state.p1Score, p2Score: verified.state.p2Score };
  });
  // FORFEIT — the player walks out mid-duel. The seat keeps the win: the same
  // completion transaction credits the match as a loss for the player (matches
  // row 'lose', progress, global stats) but the story stops here — no epilogue,
  // and the episodic memory claim stays pending (invisible) since there is no
  // finished duel for the writer to retell.
  app.post("/campaign/encounters/:id/forfeit", { bodyLimit: 1024 }, async (req) => {
    const userId = await account(req, deps);
    const id = encounterId((req.params as { id: string }).id);
    const record = owned(await deps.store.change(userId, id, (r) => {
      if (r.completedAt) return; // already finished — forfeit changes nothing
      r.data.result = "loss";
      r.data.forfeited = true;
      r.completedAt = new Date();
    }));
    return { ok: true, result: record.data.result, forfeited: !!record.data.forfeited };
  });
  app.get("/campaign/encounters/:id/epilogue", async (req) => {
    const userId = await account(req, deps);
    const id = encounterId((req.params as { id: string }).id);
    let record = owned(await deps.store.read(userId, id));
    if (!record.completedAt) throw new EncounterError(409, "Duel is not finished");
    if (!record.data.epilogue) await finalizeStory(userId, id);
    record = owned(await deps.store.read(userId, id));
    return { id, result: record.data.result, epilogue: voicedScene(userId, record.studentId, record.data.epilogue), epilogueReadCount: record.data.epilogueReadCount };
  });
  app.post("/campaign/encounters/:id/epilogue/read", { bodyLimit: 1024 }, async (req) => {
    const userId = await account(req, deps);
    const id = encounterId((req.params as { id: string }).id);
    const body = bodyOf(req);
    const record = owned(await deps.store.change(userId, id, (r) => {
      if (!r.completedAt || !r.data.epilogue) throw new EncounterError(409, "No epilogue to read");
      if (!Number.isInteger(body.readCount) || (body.readCount as number) < 0 || (body.readCount as number) > r.data.epilogue.lines.length) {
        throw new EncounterError(400, "Invalid epilogue position");
      }
      r.data.epilogueReadCount = Math.max(r.data.epilogueReadCount, body.readCount as number);
    }));
    return { epilogueReadCount: record.data.epilogueReadCount };
  });
}

export async function prepareEncounterPick(req: FastifyRequest, deps: EncounterDependencies): Promise<PreparedAiPick | null> {
  const body = bodyOf(req);
  if (body.encounterId === undefined) return null;
  const userId = await account(req, deps);
  const id = encounterId(body.encounterId);
  let record = owned(await deps.store.read(userId, id));
  if (!record.data.started || record.completedAt) throw new EncounterError(409, "Encounter is not active");
  const verified = replayForRead(record, body.transcript);
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
  const history = await deps.store.history(userId, id, record.studentId);
  const moment: EncounterMoment = {
    heardLines: record.data.scene?.lines.slice(0, record.data.readCount).map((l) => l.text) ?? [],
    speech: record.data.speech, results: verified.results,
  };
  // Prose memory, not a JSON policy wall: the same lived-experience brief the
  // prelude, reactions and epilogue read. Secrets are absent by construction.
  const context = kleinMemoryBrief(history, moment);
  const situation = history.verified.games > 0 || history.hasMet || history.hasLegacyHistory ? "returning" : "first-meeting";
  const committed = record.data.commits.find((c) => c.round === state.round);
  if (committed?.p1Locked && locked !== committed.p1Locked) throw new EncounterError(409, "Locked card changed");
  const cachedLine = record.data.speech.find((s) => s.key === `${state.round}:commit`);
  return {
    scope: userId, context, situation,
    recent: record.data.speech.slice(-8).map((s) => s.message).filter((m) => m.trim().length > 0),
    recentAll: record.data.speech.map((s) => s.message).filter((m) => m.trim().length > 0),
    body: {
      duelId: id, seed: record.seed, attempt: body.attempt, p1Locked: locked, characterId: record.studentId + 1,
      view: { studentId: record.studentId + 1, phase: "commit", round: state.round, myScore: state.p2Score, oppScore: state.p1Score,
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
        // Canned transport fallbacks are shown but never become memory.
        if (!response.fallback && !current.data.speech.some((s) => s.key === key)) current.data.speech.push({
          key, round: state.round, beat: response.picked ? "commit" : "thinking", message: response.message,
        });
      });
    },
  };
}
