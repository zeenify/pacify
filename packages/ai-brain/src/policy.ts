/* Student policies — personality as data (SPEC.md §3.1). */

import type { CardId } from "@pacify/engine";

export type StudentPolicy = {
  studentId: number;
  codename: string;
  epsilon: number;
  trickWeights: Partial<Record<CardId, number>>;
};

export const KLEIN_POLICY: StudentPolicy = {
  studentId: 2,
  codename: "KLEIN — GOD",
  epsilon: 0,
  trickWeights: {},
};

export function trickWeight(policy: StudentPolicy, cardId: CardId): number {
  return policy.trickWeights[cardId] ?? 1;
}
