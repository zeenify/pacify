import type { FastifyInstance, FastifyRequest } from "fastify";
import { CATALOGUE, SCORE_THRESHOLD, type BrainView, type Card, type CardId } from "@pacify/engine";
import { rankMoves, bestCounter, readChance, CHARACTERS, type RankedMove, type SolverState } from "@pacify/ai-brain";
import { pickFromPool, type RoundResult } from "./personality.js";

export type AiPickDependencies = {
  rankMoves?: typeof rankMoves;
  bestCounter?: typeof bestCounter;
  pickFromPool?: typeof pickFromPool;
  clock?: () => number;
  prepare?: (req: FastifyRequest) => Promise<PreparedAiPick | null>;
};

export type PreparedAiPick = {
  body: unknown;
  scope: string;
  context: string;
  cached?: Response;
  finish: (response: Response) => Promise<void>;
};

type Input = {
  duelId: string;
  seed: number;
  view: BrainView;
  characterId: number;
  attempt: number;
  p1Locked: CardId | null;
  interactionId?: string;
  roundResults: RoundResult[];
  context?: string;
};

type Response = {
  picked: Card | null;
  message: string;
  interactionId: string | null;
  attempt: number;
  waitMs: number;
};

type Decision = {
  mode: "hit" | "bluff" | "commit";
  deadline: number;
  response: Response;
};

type Round = {
  seed: number;
  view: BrainView;
  fingerprint: string;
  expiresAt: number;
  tail: Promise<void>;
  pending: number;
  pool?: RankedMove[];
  blind?: Card;
  counters: Map<CardId, RankedMove>;
  lock?: { cardId: CardId; receivedAt: number };
  decision?: Decision;
  interactionId: string | null;
  recordedResults: Map<number, string>;
};

const TTL_MS = 30 * 60 * 1000;
const MAX_ROUNDS = 512;
const cards = new Map(CATALOGUE.map((c) => [c.id, c]));
class InputError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}
const invalid = (): never => { throw new InputError(400, "invalid ai-pick request"); };
const object = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
const integer = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
// Engine RNG states are signed; initial seeds may also use the unsigned 32-bit representation.
const int32 = (v: unknown): v is number => integer(v, -0x80000000, 0xffffffff);
const text = (v: unknown, max: number): v is string => typeof v === "string" && v.length > 0 && v.length <= max;

function cardList(value: unknown): Card[] {
  if (!Array.isArray(value) || value.length > CATALOGUE.length) return invalid();
  const seen = new Set<CardId>();
  return value.map((item) => {
    if (!object(item)) return invalid();
    const canonical = cards.get(item.id);
    if (!canonical || seen.has(canonical.id)) return invalid();
    // Never let client-supplied card power, alignment or names reach the solver/LLM.
    if (Object.entries(canonical).some(([key, v]) => item[key] !== v)) return invalid();
    seen.add(canonical.id);
    return Object.freeze({ ...canonical });
  });
}

function parse(body: unknown): Input {
  if (!object(body) || !text(body.duelId, 128) || !/^[A-Za-z0-9_-]+$/.test(body.duelId) ||
      !int32(body.seed) || !integer(body.characterId, 0, 0x7fffffff) || !integer(body.attempt, 0, 3)) return invalid();
  if (body.interactionId !== undefined && !text(body.interactionId, 512)) return invalid();
  const v = body.view;
  if (!object(v) || !integer(v.studentId, 0, 0x7fffffff) || !integer(v.round, 1, 7) || v.phase !== "commit" ||
      !integer(v.myScore, 0, SCORE_THRESHOLD - 1) || !integer(v.oppScore, 0, SCORE_THRESHOLD - 1) ||
      !integer(v.shieldOff, 0, 2) || typeof v.echoNext !== "boolean" || !int32(v.rngState)) return invalid();
  const myHand = cardList(v.myHand);
  const oppHand = cardList(v.oppHand);
  const burned = cardList(v.burned);
  const peeked = cardList(v.peeked === undefined ? [] : v.peeked);
  const oppPeeked = cardList(v.oppPeeked === undefined ? [] : v.oppPeeked);
  const n = 8 - v.round;
  if (myHand.length !== n || oppHand.length !== n || burned.length !== 2 * (v.round - 1)) return invalid();
  const all = [...myHand, ...oppHand, ...burned];
  if (new Set(all.map((c) => c.id)).size !== all.length ||
      peeked.some((c) => !oppHand.some((x) => x.id === c.id)) ||
      oppPeeked.some((c) => !myHand.some((x) => x.id === c.id))) return invalid();
  if (body.p1Locked !== null && (typeof body.p1Locked !== "string" ||
      !oppHand.some((c) => c.id === body.p1Locked))) return invalid();
  const roundResults = body.roundResults === undefined ? [] : body.roundResults;
  if (!Array.isArray(roundResults) || roundResults.length > v.round - 1) return invalid();
  const seen = new Set<number>();
  const results: RoundResult[] = roundResults.map((r) => {
    if (!object(r) || !integer(r.round, 1, v.round - 1) || seen.has(r.round) ||
        !text(r.klein, 128) || !text(r.you, 128) ||
        !integer(r.kleinPts, 0, 100) || !integer(r.youPts, 0, 100) ||
        !integer(r.kleinScore, 0, 100) || !integer(r.youScore, 0, 100) ||
        (r.note !== undefined && !text(r.note, 256))) return invalid();
    seen.add(r.round);
    return { round: r.round, klein: r.klein, you: r.you, kleinPts: r.kleinPts, youPts: r.youPts,
      kleinScore: r.kleinScore, youScore: r.youScore, ...(r.note === undefined ? {} : { note: r.note }) };
  });
  const normalized: BrainView = {
    studentId: v.studentId, round: v.round, phase: "commit", myScore: v.myScore, oppScore: v.oppScore,
    myHand, oppHand, burned, peeked, oppPeeked, shieldOff: v.shieldOff, echoNext: v.echoNext,
    rngState: v.rngState | 0,
  };
  for (const list of [myHand, oppHand, burned, peeked, oppPeeked]) Object.freeze(list);
  Object.freeze(normalized);
  return { duelId: body.duelId, seed: body.seed | 0, view: normalized, characterId: body.characterId,
    attempt: body.attempt, p1Locked: body.p1Locked, interactionId: body.interactionId,
    roundResults: results.sort((a, b) => a.round - b.round) };
}

function fingerprint(v: BrainView): string {
  const ids = (list: Card[] = []) => list.map((c) => c.id).sort();
  return JSON.stringify({ ...v, myHand: ids(v.myHand), oppHand: ids(v.oppHand), burned: ids(v.burned),
    peeked: ids(v.peeked), oppPeeked: ids(v.oppPeeked) });
}

// Separate salts keep read, bluff, delay and cap independent and replay-known.
function roll(round: Round, characterId: number, attempt: number, salt: number): number {
  let x = round.seed ^ round.view.rngState ^ Math.imul(characterId, 0x9e3779b1) ^
    Math.imul(round.view.round, 0x85ebca6b) ^ Math.imul(attempt, 0xc2b2ae35) ^ salt;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return ((x ^ (x >>> 16)) >>> 0) / 0x100000000;
}

function root(view: BrainView): SolverState {
  return { round: view.round, mine: view.myHand, theirs: view.oppHand!, myScore: view.myScore,
    theirScore: view.oppScore, echoNext: view.echoNext, shieldOff: view.shieldOff };
}

/** Private per-process, bounded round cache. No authoritative match or replay state. */
export function registerAiPickRoutes(app: FastifyInstance, dependencies: AiPickDependencies = {}): void {
  const rank = dependencies.rankMoves ?? rankMoves;
  const counter = dependencies.bestCounter ?? bestCounter;
  const persona = dependencies.pickFromPool ?? pickFromPool;
  const clock = dependencies.clock ?? Date.now;
  const rounds = new Map<string, Round>();

  const current = (round: Round): Response => {
    const decision = round.decision!;
    return { ...decision.response, waitMs: decision.mode === "commit" ? 0 : Math.max(1, Math.ceil(decision.deadline - clock())) };
  };

  async function decide(round: Round, input: Input, receivedAt: number): Promise<Response> {
    const old = round.decision;
    if (old?.mode === "commit" || (old && input.attempt < old.response.attempt)) return current(round);
    if (old) {
      if (input.attempt > old.response.attempt + 1) throw new InputError(409, "attempt out of sequence");
      if (input.attempt === old.response.attempt + 1 && receivedAt < old.deadline)
        throw new InputError(409, "window still active");
      if (input.attempt === old.response.attempt &&
          (input.p1Locked === null || (round.lock?.receivedAt ?? receivedAt) >= old.deadline))
        return current(round);
    } else if (input.attempt !== 0) {
      throw new InputError(409, "initial attempt must be zero");
    }
    const unrecorded = input.roundResults.filter((r) => {
      const recorded = round.recordedResults.get(r.round);
      if (recorded && recorded !== JSON.stringify(r)) throw new InputError(409, "round results conflict");
      return !recorded;
    });
    const character = CHARACTERS[input.characterId];
    if (!round.pool) {
      const pool = rank(round.view, { skill: character.skill });
      if (!pool.length || pool.some((m) => !round.view.myHand.some((c) => c.id === m.card.id)))
        throw new Error("invalid winning pool");
      round.pool = pool;
    }
    const cap = 2 + Math.floor(roll(round, input.characterId, 0, 0x243f6a88) * 2);
    const mode = old && input.attempt === old.response.attempt ? old.mode :
      input.attempt >= cap ? "commit" :
      roll(round, input.characterId, input.attempt, 0xa4093822) < readChance(round.view.round) ? "hit" :
      roll(round, input.characterId, input.attempt, 0x299f31d0) < 0.25 ? "bluff" : "commit";
    const thinking = mode !== "commit" && input.p1Locked === null;
    let pool = round.blind ? [{ card: round.blind, v: 0, rank: 1 }] : round.pool;
    if (mode === "hit" && input.p1Locked !== null) {
      let prepared = round.counters.get(input.p1Locked);
      if (!prepared) {
        const locked = round.view.oppHand!.find((c) => c.id === input.p1Locked)!;
        const choice = counter(root(round.view), locked);
        const canonical = round.view.myHand.find((c) => c.id === choice.card.id);
        if (!canonical) throw new Error("illegal counter");
        prepared = { card: canonical, v: choice.value, rank: 1 };
        round.counters.set(input.p1Locked, prepared);
      }
      pool = [prepared];
    }
    // The persona never sees the lock, read mode, probability, deadline or counter reason.
    const result = await persona(pool, character, round.view, {
      interactionId: input.context ? null : round.interactionId,
      roundResults: input.context ? input.roundResults : unrecorded,
      beat: thinking ? "thinking" : "commit", ...(input.context ? { context: input.context } : {}),
    });
    const chosen = pool.find((m) => m.card.id === result.picked?.id)?.card;
    if (!chosen || typeof result.message !== "string" ||
        (result.interactionId !== null && !text(result.interactionId, 512))) throw new Error("invalid persona response");
    // Failed narration must not consume attempts or advance the conversation.
    if (thinking) round.blind = chosen;
    round.interactionId = result.interactionId;
    if (result.resultsDelivered === true) {
      for (const r of unrecorded) round.recordedResults.set(r.round, JSON.stringify(r));
    }
    const waitMs = thinking ? 5000 + Math.floor(roll(round, input.characterId, input.attempt, 0x082efa98) * 2001) : 0;
    const response: Response = { picked: thinking ? null : chosen, message: result.message,
      interactionId: round.interactionId, attempt: input.attempt, waitMs };
    round.decision = { mode: thinking ? mode : "commit", deadline: clock() + waitMs, response };
    return response;
  }

  app.post("/ai-pick", { bodyLimit: 64 * 1024 }, async (req, reply) => {
    const receivedAt = clock();
    let input: Input;
    let round: Round;
    let prepared: PreparedAiPick | null = null;
    try {
      prepared = await dependencies.prepare?.(req) ?? null;
      input = parse(prepared?.body ?? req.body);
      input.context = prepared?.context;
      if (prepared?.cached) return reply.send(prepared.cached);
      if (!Object.hasOwn(CHARACTERS, input.characterId)) throw new InputError(404, "unknown character");
      const now = receivedAt;
      for (const [key, cached] of rounds) {
        if (cached.pending === 0 && cached.expiresAt <= now &&
            (!cached.decision || cached.decision.mode === "commit" || cached.decision.deadline <= now)) rounds.delete(key);
      }
      const key = JSON.stringify([prepared?.scope ?? "anonymous", input.duelId, input.characterId, input.view.round]);
      const print = fingerprint(input.view);
      const existing = rounds.get(key);
      if (existing && (existing.seed !== input.seed || existing.fingerprint !== print))
        throw new InputError(409, "round key conflicts with original request");
      if (!existing && input.attempt !== 0) throw new InputError(409, "initial attempt must be zero");
      if (!existing && rounds.size >= MAX_ROUNDS) throw new InputError(503, "ai-pick cache full");
      round = existing ?? { seed: input.seed, view: input.view, fingerprint: print, expiresAt: now + TTL_MS,
        tail: Promise.resolve(), pending: 0, counters: new Map(), interactionId: input.interactionId ?? null,
        recordedResults: new Map() };
      rounds.set(key, round);
      if (round.pending >= 32) throw new InputError(503, "round busy");
      if (input.p1Locked !== null) {
        if (round.lock && round.lock.cardId !== input.p1Locked)
          throw new InputError(409, "locked card conflicts with original request");
        round.lock ??= { cardId: input.p1Locked, receivedAt };
      }
    } catch (error) {
      const e = error instanceof InputError ? error : error instanceof Error && "statusCode" in error
        ? new InputError(Number(error.statusCode), error.message) : new InputError(400, "invalid ai-pick request");
      return reply.code(e.status).send({ error: e.message });
    }
    round.pending++;
    // A queued lock response must not overtake its preceding thinking beat.
    const task = round.tail.then(async () => {
      try {
        const response = await decide(round, input, receivedAt);
        await prepared?.finish(response);
        reply.send(response);
      }
      catch (error) {
        if (error instanceof InputError) reply.code(error.status).send({ error: error.message });
        else reply.code(502).send({ error: "ai-pick temporarily unavailable" });
      } finally { round.pending--; }
    });
    round.tail = task.catch(() => {});
    await task;
    return reply;
  });
}
