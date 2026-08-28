import { klein } from "./klein.js";

// A character = a name, an opponent-model skill, and a natural-language personality.
// The brain itself never knows about characters; the caller looks one up here, passes
// `skill` to rankMoves(), and feeds `personality` to the LLM picker.
export type Character = {
  name: string;
  /** Opponent-model skill passed to rankMoves (0 = uniform random, 1 = sensible). */
  skill?: number;
  /** Natural-language persona the LLM picker uses to choose among winning moves. */
  personality: string;
};

// Keyed by studentId. To add a student: create characters/studentN.ts, then add it here.
export const CHARACTERS: Record<number, Character> = {
  2: klein,
  // 3: student2,
  // 4: student3,
};

export { klein } from "./klein.js";
