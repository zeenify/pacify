import type { Card, TrickCard, NumberCard } from "./types.js";

export const NUMBERS: NumberCard[] = [
  { kind: "number", name: "Bandit", power: 1, align: "bad" },
  { kind: "number", name: "Paladin", power: 2, align: "good" },
  { kind: "number", name: "Ogre", power: 3, align: "bad" },
  { kind: "number", name: "Knight", power: 4, align: "good" },
  { kind: "number", name: "Witch", power: 5, align: "bad" },
  { kind: "number", name: "Wizard", power: 6, align: "good" },
  { kind: "number", name: "Demon", power: 7, align: "bad" },
  { kind: "number", name: "Angel", power: 8, align: "good" },
];

export const TRICKS: TrickCard[] = [
  { kind: "trick", name: "Void", power: null },
  { kind: "trick", name: "Oracle", power: 3 },
  { kind: "trick", name: "Reversal", power: 4 },
  { kind: "trick", name: "Ward", power: 3 },
  { kind: "trick", name: "Echo", power: null },
];

export const CATALOGUE: Card[] = [...NUMBERS, ...TRICKS];

export function isTrick(c: Card): c is TrickCard {
  return c.kind === "trick";
}
export function isVoid(c: Card) {
  return isTrick(c) && c.name === "Void";
}
export function isEcho(c: Card) {
  return isTrick(c) && c.name === "Echo";
}
