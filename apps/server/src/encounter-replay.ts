import {
  createDuel, dispatch, TOTAL_ROUNDS,
  type Card, type CardId, type DuelState, type RoundOutcome,
} from "@pacify/engine";
import type { RoundResult } from "./personality.js";

export type EncounterRound = { round: number; p1: CardId; p2: CardId };
export type EncounterCommit = { round: number; cardId: CardId; p1Locked: CardId | null };

export function replayEncounter(
  seed: number,
  transcript: unknown,
  commits: readonly EncounterCommit[],
): {
  state: DuelState;
  transcript: EncounterRound[];
  results: RoundResult[];
  outcomes: RoundOutcome[];
  playerPeeked: Card[];
} {
  if (!Array.isArray(transcript) || transcript.length > TOTAL_ROUNDS) {
    throw new Error(`Transcript must be an array of at most ${TOTAL_ROUNDS} rounds`);
  }

  let state = createDuel({ seed, studentId: 2 });
  const normalized: EncounterRound[] = [];
  const results: RoundResult[] = [];
  const outcomes: RoundOutcome[] = [];
  const playerPeeked: Card[] = [];

  for (let index = 0; index < transcript.length; index++) {
    const row: unknown = transcript[index];
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error(`Invalid transcript row ${index + 1}`);
    }
    const { round, p1, p2 } = row as Record<string, unknown>;
    if (round !== index + 1) {
      throw new Error("Transcript rounds must be contiguous starting at 1");
    }
    if (state.phase !== "commit") {
      throw new Error(`Round ${round} follows a terminal encounter`);
    }

    // The engine silently ignores illegal locks. Validate ownership/remaining use
    // first; seeded hand membership also enforces canonical catalogue IDs.
    const playerCard = state.p1Hand.find((c) => c.id === p1);
    const aiCard = state.p2Hand.find((c) => c.id === p2);
    if (!playerCard || !aiCard) {
      throw new Error(`Round ${round} must use cards remaining in each side's hand`);
    }

    // Commits and seed are server-owned. Only records for supplied rounds matter;
    // identical duplicates are harmless, but conflicting history is never replayed.
    const records = commits.filter((c) => c.round === round);
    const commit = records[0];
    if (!commit) throw new Error(`Missing AI commit for round ${round}`);
    if (records.some((c) => c.cardId !== commit.cardId || c.p1Locked !== commit.p1Locked)) {
      throw new Error(`Contradictory AI commits for round ${round}`);
    }
    if (commit.cardId !== aiCard.id) {
      throw new Error(`AI commit does not match round ${round}`);
    }
    if (commit.p1Locked !== null && commit.p1Locked !== playerCard.id) {
      throw new Error(`Player read-lock does not match round ${round}`);
    }

    state = dispatch(state, { t: "lock_ai", cardId: aiCard.id }).state;
    const resolved = dispatch(state, { t: "lock_player", cardId: playerCard.id });
    const event = resolved.events.find((e) => e.t === "round_resolved");
    if (!event) throw new Error(`Round ${round} did not resolve`);
    state = resolved.state;
    const outcome = event.outcome;
    normalized.push({ round, p1: playerCard.id, p2: aiCard.id });
    outcomes.push(outcome);
    results.push({
      round,
      klein: cardLabel(outcome.p2Card),
      you: cardLabel(outcome.p1Card),
      kleinPts: outcome.p2Points,
      youPts: outcome.p1Points,
      kleinScore: state.p2Score,
      youScore: state.p1Score,
      note: [
        outcome.voided && "VOID", outcome.wardBlocked && "WARD",
        outcome.reversalSwapped && "SWAP!", outcome.scoreWiped && "EXECUTED",
        outcome.echoNext && "NEXT ×2", outcome.eclipseFired && "ECLIPSE",
        outcome.peek && "ORACLE",
      ].filter(Boolean).join(", ") || undefined,
    });
    if (event.peekedCards?.side === "p1") playerPeeked.push(...event.peekedCards.cards);
    if (state.phase === "reveal") state = dispatch(state, { t: "next_round" }).state;
  }

  return {
    state,
    transcript: normalized,
    results,
    outcomes,
    playerPeeked: playerPeeked.filter((c) => state.p2Hand.some((remaining) => remaining.id === c.id)),
  };
}

function cardLabel(card: Card): string {
  return card.kind === "trick"
    ? `${card.name} [trick]`
    : `${card.name} [${card.power} ${card.align.toUpperCase()}]`;
}
