/* PACIFY engine — all types in one place. Pure data, zero I/O, zero React. */

// ---------- cards ----------

export type Align = "good" | "bad";

export type NumberCard = {
  kind: "number";
  id: CardId;
  name: string;
  power: number; // 1..8
  align: Align;
};

export type TrickName = "Void" | "Oracle" | "Reversal" | "Ward" | "Echo" | "Executioner" | "Eclipse";

export type TrickCard = {
  kind: "trick";
  id: CardId;
  name: TrickName;
  power: number | null; // null = voids the clash
};

export type Card = NumberCard | TrickCard;

export type CardId =
  | "bandit" | "paladin" | "ogre" | "knight"
  | "witch" | "wizard" | "demon" | "angel"
  | "vampire" | "valkyrie" | "seraph" | "leviathan" | "archon"
  | "void" | "oracle" | "reversal" | "ward" | "echo"
  | "executioner" | "eclipse";

// ---------- round resolution ----------

export type RoundOutcome = {
  p1Card: Card;
  p2Card: Card;
  p1Points: number;
  p2Points: number;
  voided: boolean;        // Void or Echo or Eclipse emptied the round
  echoNext: boolean;      // Echo set next-round double
  wardBlocked: boolean;   // a Ward ate the opponent's trick
  reversalSwapped: boolean;
  scoreWiped: { side: "p1" | "p2" } | null; // an Executioner zeroed this side's total
  eclipseFired: boolean;  // Eclipse set shields-off for the next 2 rounds
  peek: { side: "p1" | "p2"; count: number } | null; // Oracle fired for this side
};

// ---------- duel state ----------

export type Phase = "commit" | "reveal" | "over";

export type MatchResult = {
  winner: "p1" | "p2" | "draw";
  p1Score: number;
  p2Score: number;
};

export type DuelState = {
  seed: number;
  studentId: number;
  phase: Phase;
  round: number; // 1..TOTAL_ROUNDS
  p1Score: number;
  p2Score: number;
  p1Hand: Card[];
  p2Hand: Card[];
  p1Locked: Card | null;
  p2Locked: Card | null;
  burned: Card[];
  peeked?: Card[]; // Oracle-peeked cards still not burned — known to be in opp hand
  shieldOff: number; // rounds remaining with alignment shields disabled (Eclipse)
  echoNext: boolean;
  rngState: number;
  transcript: DuelAction[]; // replay = fold actions over seed
  lastOutcome: RoundOutcome | null; // set during "reveal"
  result: MatchResult | null; // set when phase === "over"
};

// ---------- actions ----------

export type DuelAction =
  | { t: "lock_ai"; cardId: CardId }
  | { t: "lock_player"; cardId: CardId }
  | { t: "next_round" };

// ---------- events (UI-facing; derived from dispatch, not stored) ----------

export type DuelEvent =
  | { t: "round_started"; round: number }
  | {
      t: "round_resolved";
      outcome: RoundOutcome;
      peekedCards: { side: "p1" | "p2"; cards: Card[] } | null;
    }
  | { t: "match_ended"; result: MatchResult };

// ---------- constants ----------

export const TOTAL_ROUNDS = 7;
export const HAND_SIZE = 7;
export const MAX_TRICKS_PER_HAND = 3;
export const SCORE_THRESHOLD = 20;
export const WARD_FLAT_POINTS = 5;
export const ORACLE_PEEK_COUNT = 2;
export const ECLIPSE_ROUNDS = 2;
export const EXECUTIONER_THRESHOLD = 7;
