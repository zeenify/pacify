/* Dealing — official card distribution.
   Each hand's trick COUNT is sampled from a target distribution, then filled with
   that many tricks + the rest numbers drawn (no replacement) from a shuffled pool.
   This gives exact control over how often a hand has 1 / 2 / 3 tricks (cap 3) and
   avoids the old shuffle-split, which averaged ~2.58 tricks/hand and could never be
   0% zero-trick. Singleton rule (SPEC.md §2.1): no duplicate card across BOTH hands.

   p1 = the student/human seat; p2 = the opponent (Klein), nudged slightly higher.
   These are the official defaults — override per seat via DealOptions if needed. */

import type { Card } from "./types.js";
import { HAND_SIZE, MAX_TRICKS_PER_HAND } from "./types.js";
import { isTrick } from "./cards.js";
import { shuffled, stepRng } from "./rng.js";

export type DealtHands = { p1Hand: Card[]; p2Hand: Card[] };

export type DealOptions = {
  /** Trick-count distribution for p1 (index = #tricks, must sum to 1). */
  p1TrickDist?: readonly number[];
  /** Trick-count distribution for p2 (opponent, nudged higher by default). */
  p2TrickDist?: readonly number[];
};

// index = number of tricks (0..MAX_TRICKS_PER_HAND). You: usually 2, sometimes 3,
// rarely 1, never 0. Klein: a little higher (more 3s, fewer 1s).
const TRICK_DIST_P1: readonly number[] = [0.00, 0.10, 0.50, 0.40];
const TRICK_DIST_P2: readonly number[] = [0.00, 0.07, 0.43, 0.50];

/** Sample a trick count from `dist`, advancing the rng state. */
function sampleTrickCount(dist: readonly number[], state: number): [number, number] {
  const [r, next] = stepRng(state);
  let acc = 0;
  for (let c = 0; c < dist.length; c++) {
    acc += dist[c];
    if (r < acc) return [c, next];
  }
  return [dist.length - 1, next];
}

export function dealHands(
  catalogue: readonly Card[],
  rngState: number,
  opts: DealOptions = {},
): [DealtHands, number] {
  const distP1 = opts.p1TrickDist ?? TRICK_DIST_P1;
  const distP2 = opts.p2TrickDist ?? TRICK_DIST_P2;

  // Two independent shuffles: tricks and numbers, drawn from without replacement.
  let state = rngState;
  let [tricks, s] = shuffled(catalogue.filter(isTrick), state);
  state = s;
  let [nums, s2] = shuffled(catalogue.filter((c) => !isTrick(c)), state);
  state = s2;

  const dealSeat = (dist: readonly number[]): Card[] => {
    const [count, s3] = sampleTrickCount(dist, state);
    state = s3;
    const hand: Card[] = [];
    for (let i = 0; i < count && tricks.length; i++) hand.push(tricks.pop()!);
    while (hand.length < HAND_SIZE && nums.length) hand.push(nums.pop()!);
    while (
      hand.length < HAND_SIZE &&
      tricks.length &&
      hand.filter(isTrick).length < MAX_TRICKS_PER_HAND
    ) {
      hand.push(tricks.pop()!); // fallback only if a type is exhausted
    }
    const [shuffledHand, s4] = shuffled(hand, state); // avoid front-loading tricks
    state = s4;
    return shuffledHand;
  };

  const p1Hand = dealSeat(distP1);
  const p2Hand = dealSeat(distP2);
  return [{ p1Hand, p2Hand }, state];
}
