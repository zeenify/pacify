/* Round resolution — ALL round math in one pure, testable module (SPEC.md §2.1).
   Priority: 1. Void → 2. Ward → 3. rest (Echo/Oracle/Reversal/Executioner/Eclipse + clash).
   Pure function in → pure outcome out. duel.ts applies the state changes. */

import type { Card, RoundOutcome } from "./types.js";
import { TOTAL_ROUNDS, WARD_FLAT_POINTS as WARD_POINTS, ORACLE_PEEK_COUNT as ORACLE_COUNT, ECLIPSE_ROUNDS, EXECUTIONER_THRESHOLD } from "./types.js";
import { isVoid, isEcho, isWard, isOracle, isReversal, isExecutioner, isEclipse, isNumber } from "./cards.js";

export type ResolveInput = {
  p1Card: Card;
  p2Card: Card;
  p1Score: number; // totals BEFORE this round
  p2Score: number;
  round: number; // 1..7
  echoNext: boolean; // a previous Echo doubled this round
  shieldOff: number; // rounds remaining with shields disabled (Eclipse)
};

export type ResolveOutput = RoundOutcome & {
  p1Score: number;
  p2Score: number;
  shieldOffAfter: number; // counter for the NEXT round
};

/** Round 7 ×2, Echo-carried ×2, additive, capped ×3 (SPEC.md §2.2 note). */
export function roundMultiplier(round: number, echoNext: boolean): number {
  let m = 1;
  if (round === TOTAL_ROUNDS) m += 1;
  if (echoNext) m += 1;
  return Math.min(m, 3);
}

/** Normal power clash. Alignment shield only applies number-vs-number (SPEC.md §2.1),
    and only while Eclipse's shields-off window is inactive. */
export function clashPoints(
  a: Card, b: Card,
  shieldOff: boolean,
): { aPts: number; bPts: number } {
  const aEff = a.power ?? 0;
  const bEff = b.power ?? 0;
  if (aEff === bEff) return { aPts: 0, bPts: 0 };
  const same = shieldOff ? false : isNumber(a) && isNumber(b) && a.align === b.align;
  if (aEff > bEff) return { aPts: same ? 0 : aEff - bEff, bPts: 0 };
  return { aPts: 0, bPts: same ? 0 : bEff - aEff };
}

export function resolveRound(input: ResolveInput): ResolveOutput {
  const { p1Card, p2Card, round, shieldOff } = input;
  const mult = roundMultiplier(round, input.echoNext);

  const outcome: ResolveOutput = {
    p1Card,
    p2Card,
    p1Points: 0,
    p2Points: 0,
    voided: false,
    echoNext: false,
    wardBlocked: false,
    reversalSwapped: false,
    scoreWiped: null,
    eclipseFired: false,
    peek: null,
    p1Score: input.p1Score,
    p2Score: input.p2Score,
    shieldOffAfter: Math.max(0, shieldOff - 1), // decay unless refreshed below
  };

  // ---- 1. VOID — top priority. Kills everything, no exceptions. ----
  if (isVoid(p1Card) || isVoid(p2Card)) {
    outcome.voided = true;
    return outcome;
  }

  // ---- 1b. ECLIPSE — soft void: zeroes this round's clash points, opens a
  //      shields-off window. Other trick EFFECTS still fire (like Echo) —
  //      hard-blocking is exclusive to Void and Ward. ----
  let eclipseFired = false;
  if (isEclipse(p1Card) || isEclipse(p2Card)) {
    outcome.voided = true;
    outcome.eclipseFired = true;
    outcome.shieldOffAfter = ECLIPSE_ROUNDS; // next N rounds: shields disabled
    eclipseFired = true;
  }

  // ---- 2. WARD — blocks an opponent trick + flat points. ----
  const p1Ward = isWard(p1Card);
  const p2Ward = isWard(p2Card);
  const p1Trick = p1Card.kind === "trick";
  const p2Trick = p2Card.kind === "trick";

  if (p1Ward && p2Ward) {
    outcome.wardBlocked = true;
    outcome.p1Points = WARD_POINTS * mult;
    outcome.p2Points = WARD_POINTS * mult;
  } else if (p1Ward && p2Trick) {
    outcome.wardBlocked = true;
    outcome.p1Points = WARD_POINTS * mult;
  } else if (p2Ward && p1Trick) {
    outcome.wardBlocked = true;
    outcome.p2Points = WARD_POINTS * mult;
  }
  if (outcome.wardBlocked) {
    // Blocked trick does NOT activate: no peek, no swap, no echo, no eclipse.
    outcome.eclipseFired = false;
    outcome.voided = false;
    outcome.shieldOffAfter = Math.max(0, shieldOff - 1);
    outcome.p1Score += outcome.p1Points;
    outcome.p2Score += outcome.p2Points;
    return outcome;
  }
  // Ward vs number falls through: Ward fights as a plain power card below.

  // ---- 3a. ECHO — voids this round's points, doubles next. Other trick still fires. ----
  const echoFired = isEcho(p1Card) || isEcho(p2Card);
  if (echoFired) {
    outcome.voided = true;
    outcome.echoNext = true;
  }

  // ---- 3b. Base clash (skipped when Echo/Eclipse voided the round). ----
  // Executioner body is power 0 — it loses clashes; its value is the wipe below.
  if (!echoFired && !eclipseFired) {
    const shieldsOff = shieldOff > 0; // Eclipse window: same-align scores normally
    const { aPts, bPts } = clashPoints(p1Card, p2Card, shieldsOff);
    outcome.p1Points = aPts * mult;
    outcome.p2Points = bPts * mult;
  }

  // ---- 3c. ORACLE — peeks regardless of points (even through Echo/Eclipse void). ----
  if (isOracle(p1Card)) outcome.peek = { side: "p1", count: ORACLE_COUNT };
  if (isOracle(p2Card)) outcome.peek = { side: "p2", count: ORACLE_COUNT };

  // ---- 3d. REVERSAL — score the round normally FIRST, then swap totals. ----
  if (isReversal(p1Card) || isReversal(p2Card)) {
    outcome.reversalSwapped = true;
  }

  outcome.p1Score += outcome.p1Points;
  outcome.p2Score += outcome.p2Points;

  if (outcome.reversalSwapped) {
    [outcome.p1Score, outcome.p2Score] = [outcome.p2Score, outcome.p1Score];
  }

  // ---- 3e. EXECUTIONER — if the opponent committed a 7+ NUMBER, their total
  //      score is EXECUTED (dropped to 0). The comeback nuke. ----
  if (isExecutioner(p1Card) && isNumber(p2Card) && (p2Card.power ?? 0) >= EXECUTIONER_THRESHOLD) {
    outcome.p2Score = 0;
    outcome.scoreWiped = { side: "p2" };
  }
  if (isExecutioner(p2Card) && isNumber(p1Card) && (p1Card.power ?? 0) >= EXECUTIONER_THRESHOLD) {
    outcome.p1Score = 0;
    outcome.scoreWiped = { side: "p1" };
  }
  return outcome;
}
