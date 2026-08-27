/* Duel state machine — the ONLY place match state changes.
   Pure reducer: (state, action) → { state, events }. No I/O, no clocks, no React.
   Deterministic given seed + action order → replayable for server validation. */

import type {
  Card,
  CardId,
  DuelAction,
  DuelEvent,
  DuelState,
  MatchResult,
  Phase,
} from "./types.js";
import { TOTAL_ROUNDS, SCORE_THRESHOLD } from "./types.js";
import { CATALOGUE, cardById } from "./cards.js";
import { dealHands } from "./deck.js";
import { resolveRound } from "./resolve.js";
import { pickRandom } from "./rng.js";

export type DuelConfig = {
  seed: number;
  studentId: number;
  /** Optional overrides (testing / future deckbuilding). Random deal if omitted. */
  p1Hand?: Card[];
  p2Hand?: Card[];
};

export type DispatchResult = { state: DuelState; events: DuelEvent[] };

export function createDuel(config: DuelConfig): DuelState {
  const [{ p1Hand, p2Hand }, rngState] = dealHands(
    CATALOGUE,
    config.seed | 0,
  );
  return {
    seed: config.seed | 0,
    studentId: config.studentId,
    phase: "commit",
    round: 1,
    p1Score: 0,
    p2Score: 0,
    p1Hand: config.p1Hand ?? p1Hand,
    p2Hand: config.p2Hand ?? p2Hand,
    p1Locked: null,
    p2Locked: null,
    burned: [],
    peeked: [],
    shieldOff: 0,
    echoNext: false,
    rngState,
    transcript: [],
    lastOutcome: null,
    result: null,
  };
}

export function dispatch(state: DuelState, action: DuelAction): DispatchResult {
  const next: DuelState = {
    ...state,
    p1Hand: [...state.p1Hand],
    p2Hand: [...state.p2Hand],
    burned: [...state.burned],
    peeked: [...(state.peeked ?? [])],
    shieldOff: state.shieldOff,
    // NOTE: the action is recorded into the transcript only AFTER it validates —
    // illegal actions leave no trace, so replay never sees them.
  };
  const events: DuelEvent[] = [];

  switch (action.t) {
    case "lock_ai":
      return lockAi(next, action, events);
    case "lock_player":
      return lockPlayer(next, action, events);
    case "next_round":
      return nextRound(next, action, events);
  }
}

// ---------- action handlers (private) ----------

/** Record an ACCEPTED action. Call exactly once per legal action. */
function record(state: DuelState, action: DuelAction): void {
  state.transcript = [...state.transcript, action];
}

function lockAi(state: DuelState, action: DuelAction & { t: "lock_ai" }, events: DuelEvent[]): DispatchResult {
  if (state.phase !== "commit") return bail(state, events);
  if (state.p2Locked) return bail(state, events);
  const card = ownedCard(state.p2Hand, action.cardId);
  if (!card) return bail(state, events);
  record(state, action);
  state.p2Locked = card;
  return { state, events };
}

function lockPlayer(state: DuelState, action: DuelAction & { t: "lock_player" }, events: DuelEvent[]): DispatchResult {
  if (state.phase !== "commit") return bail(state, events);
  if (state.p1Locked) return bail(state, events);
  const card = ownedCard(state.p1Hand, action.cardId);
  if (!card) return bail(state, events);
  record(state, action);

  // AI must have locked already (brain dispatches at round start). If it somehow
  // hasn't (e.g. UI race), resolve against a fallback: first hand card.
  if (!state.p2Locked) {
    state.p2Locked = state.p2Hand[0];
  }

  state.p1Locked = card;
  return resolveCurrentRound(state, events);
}

function nextRound(state: DuelState, action: DuelAction & { t: "next_round" }, events: DuelEvent[]): DispatchResult {
  if (state.phase !== "reveal") return bail(state, events);
  record(state, action);
  state.phase = "commit";
  state.round += 1;
  state.p1Locked = null;
  state.p2Locked = null;
  state.lastOutcome = null;
  events.push({ t: "round_started", round: state.round });
  return { state, events };
}

// ---------- round resolution (private) ----------

function resolveCurrentRound(state: DuelState, events: DuelEvent[]): DispatchResult {
  const p1Card = state.p1Locked!;
  const p2Card = state.p2Locked!;

  // Remove committed cards from hands, send to burn pile.
  state.p1Hand = state.p1Hand.filter((c) => c.id !== p1Card.id);
  state.p2Hand = state.p2Hand.filter((c) => c.id !== p2Card.id);
  state.burned.push(p1Card, p2Card);

  const outcome = resolveRound({
    p1Card,
    p2Card,
    p1Score: state.p1Score,
    p2Score: state.p2Score,
    round: state.round,
    echoNext: state.echoNext,
    shieldOff: state.shieldOff,
  });

  // Oracle peek — real cards from the opponent's remaining hand, seeded rng.
  // Peeked cards are stored in state.peeked so the Brain's belief can use them.
  let peekedCards: { side: "p1" | "p2"; cards: Card[] } | null = null;
  if (outcome.peek) {
    const victimHand = outcome.peek.side === "p1" ? state.p2Hand : state.p1Hand;
    const [cards, nextRng] = pickRandom(victimHand, outcome.peek.count, state.rngState);
    state.rngState = nextRng;
    peekedCards = { side: outcome.peek.side, cards };
    // Only the Brain's own peeks matter for its belief (Brain plays as p2,
    // so its Oracle fires with side "p2" and reveals p1Hand cards).
    if (outcome.peek.side === "p2") {
      if (!state.peeked) state.peeked = [];
      for (const c of cards) if (!state.peeked.some((x) => x.id === c.id)) state.peeked.push(c);
    }
  }

  state.p1Score = Math.max(0, outcome.p1Score);
  state.p2Score = Math.max(0, outcome.p2Score);
  state.echoNext = outcome.echoNext;
  state.shieldOff = outcome.shieldOffAfter;
  state.lastOutcome = outcome;

  events.push({ t: "round_resolved", outcome, peekedCards });

  // Threshold victory — first to SCORE_THRESHOLD wins immediately
  if (state.p1Score >= SCORE_THRESHOLD || state.p2Score >= SCORE_THRESHOLD) {
    const result: MatchResult = {
      winner: state.p1Score > state.p2Score ? "p1" : state.p2Score > state.p1Score ? "p2" : "draw",
      p1Score: state.p1Score,
      p2Score: state.p2Score,
    };
    state.result = result;
    state.phase = "over";
    events.push({ t: "match_ended", result });
    return { state, events };
  }

  if (state.round >= TOTAL_ROUNDS) {
    const result: MatchResult = {
      winner: state.p1Score > state.p2Score ? "p1" : state.p2Score > state.p1Score ? "p2" : "draw",
      p1Score: state.p1Score,
      p2Score: state.p2Score,
    };
    state.result = result;
    state.phase = "over";
    events.push({ t: "match_ended", result });
  } else {
    state.phase = "reveal"; // UI plays the cinematic, then dispatches next_round
  }

  return { state, events };
}

// ---------- helpers ----------

function ownedCard(hand: Card[], id: CardId): Card | null {
  return hand.find((c) => c.id === id) ?? null;
}

/** Illegal action — state unchanged, nothing recorded. */
function bail(state: DuelState, events: DuelEvent[]): DispatchResult {
  return { state: { ...state }, events };
}

// ---------- brain view (fairness wall) ----------

/** Everything the AI opponent is ALLOWED to know — nothing else.
    The Brain takes this, never a raw DuelState, so peeking p1Hand is
    impossible by construction (SPEC.md §3: "reads only what a human
    at that seat could legally know"). */
export type BrainView = {
  studentId: number;
  round: number;
  phase: Phase;
  myScore: number; // p2
  oppScore: number; // p1
  myHand: Card[];
  burned: Card[];
  peeked?: Card[]; // Oracle-peeked cards known to be in opp hand (subset of possibles)
  shieldOff: number; // rounds remaining with shields disabled (Eclipse)
  echoNext: boolean;
  rngState: number; // engine-internal, not opponent info — used for deterministic ε-noise
};

export function brainView(state: DuelState): BrainView {
  return {
    studentId: state.studentId,
    round: state.round,
    phase: state.phase,
    myScore: state.p2Score,
    oppScore: state.p1Score,
    myHand: state.p2Hand,
    burned: state.burned,
    peeked: state.peeked,
    shieldOff: state.shieldOff,
    echoNext: state.echoNext,
    rngState: state.rngState,
  };
}

// ---------- replay (server validation uses this) ----------

/** Fold recorded actions over the seed → final state. Deterministic. */
export function replayDuel(seed: number, studentId: number, actions: DuelAction[]): DuelState {
  let state = createDuel({ seed, studentId });
  for (const action of actions) {
    state = dispatch(state, action).state;
  }
  return state;
}
