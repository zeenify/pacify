export type Align = "good" | "bad" | null;

export type NumberCard = {
  kind: "number";
  name: "Bandit" | "Paladin" | "Ogre" | "Knight" | "Witch" | "Wizard" | "Demon" | "Angel";
  power: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  align: "good" | "bad";
};

export type TrickCard = {
  kind: "trick";
  name: "Void" | "Oracle" | "Reversal" | "Ward" | "Echo";
  power: number | null; // null = voids clash
};

export type Card = NumberCard | TrickCard;

export type RoundResult = {
  p1Points: number;
  p2Points: number;
  voided: boolean;
  nextDouble: boolean; // Echo doubles next round
  peek?: string[]; // Oracle peeked card names
  wardBlocked?: boolean;
  reversalSwapped?: boolean;
};

export type MatchState = {
  round: number; // 1..5
  p1Score: number;
  p2Score: number;
  p1Hand: Card[];
  p2Hand: Card[];
  nextDouble: boolean;
  history: RoundResult[];
};
