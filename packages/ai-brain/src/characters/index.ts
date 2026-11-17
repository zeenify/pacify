import { klein } from "./klein.js";
import { sato } from "./sato.js";
import { nathalie } from "./nathalie.js";
import { jaxen } from "./jaxen.js";
import { hayden } from "./hayden.js";
import { hyacinth } from "./hyacinth.js";
import { yana } from "./yana.js";
import { tristan } from "./tristan.js";
import { noir } from "./noir.js";
import { anthony } from "./anthony.js";
import { cecilia } from "./cecilia.js";
import { reeve } from "./reeve.js";

// A character = a name, an opponent-model skill, and a natural-language personality.
// The brain itself never knows about characters; the caller looks one up here, passes
// `skill` to rankMoves(), and feeds `personality` to the LLM picker.
export type Character = {
  name: string;
  /** Opponent-model skill passed to rankMoves (0 = uniform random, 1 = sensible). */
  skill?: number;
  /** Natural-language persona the LLM picker uses to choose among winning moves. */
  personality: string;
  /** How the character SOUNDS when speaking — taught by example, no tactics. The
   *  speech call uses this instead of `personality` so voice and card strategy
   *  never compete for the model's attention. Falls back to `personality`. */
  voice?: string;
};

// Keyed by engine characterId — campaign studentId N plays character N+1
// (student 1 = Klein = character 2). To add a student: create
// characters/<name>.ts, then add it here and in apps/server story-profiles.
export const CHARACTERS: Record<number, Character> = {
  2: klein,
  3: sato,
  4: nathalie,
  5: jaxen,
  6: hayden,
  7: hyacinth,
  8: yana,
  9: tristan,
  10: noir,
  11: anthony,
  12: cecilia,
  13: reeve,
};

/** Campaign studentId → engine characterId (also the TTS voice character). */
export const studentCharacterId = (studentId: number): number => studentId + 1;

export { klein } from "./klein.js";
