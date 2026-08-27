/* Card catalogue — the full 17-card roster (config C: 7-card hands, 7 rounds). Data only.
   Ladder: Bandit→Vampire→Leviathan→Demon (Bad) · Paladin→Valkyrie→Seraph→Angel (Good).
   Demon/Angel are the apex nullifiers AND the biggest scorers. */

import type { Card, CardId, TrickCard, NumberCard } from "./types.js";

export const NUMBERS: NumberCard[] = [
  { kind: "number", id: "bandit",    name: "Bandit",    power: 1,  align: "bad" },
  { kind: "number", id: "paladin",   name: "Paladin",   power: 2,  align: "good" },
  { kind: "number", id: "ogre",      name: "Ogre",      power: 3,  align: "bad" },
  { kind: "number", id: "knight",    name: "Knight",    power: 4,  align: "good" },
  { kind: "number", id: "witch",     name: "Witch",     power: 5,  align: "bad" },
  { kind: "number", id: "wizard",    name: "Wizard",    power: 6,  align: "good" },
  { kind: "number", id: "vampire",   name: "Vampire",   power: 7,  align: "bad" },
  { kind: "number", id: "valkyrie",  name: "Valkyrie",  power: 8,  align: "good" },
  { kind: "number", id: "leviathan", name: "Leviathan", power: 9,  align: "bad" },
  { kind: "number", id: "seraph",    name: "Seraph",    power: 10, align: "good" },
  { kind: "number", id: "demon",     name: "Demon",     power: 11, align: "bad" },
  { kind: "number", id: "angel",     name: "Angel",     power: 12, align: "good" },
];

export const TRICKS: TrickCard[] = [
  { kind: "trick", id: "void",        name: "Void",        power: null },
  { kind: "trick", id: "oracle",      name: "Oracle",      power: 5 },
  { kind: "trick", id: "reversal",    name: "Reversal",    power: 6 },
  { kind: "trick", id: "ward",        name: "Ward",        power: 5 },
  { kind: "trick", id: "echo",        name: "Echo",        power: null },
  { kind: "trick", id: "executioner", name: "Executioner", power: 0 },
  { kind: "trick", id: "eclipse",     name: "Eclipse",     power: null },
];

export const CATALOGUE: Card[] = [...NUMBERS, ...TRICKS];

const byId = new Map<CardId, Card>(CATALOGUE.map((c) => [c.id, c]));

export function cardById(id: CardId): Card {
  const c = byId.get(id);
  if (!c) throw new Error(`unknown card id: ${id}`);
  return c;
}

// ---------- narrow helpers (single definition — reused everywhere) ----------

export const isTrick = (c: Card): c is TrickCard => c.kind === "trick";
export const isNumber = (c: Card): c is NumberCard => c.kind === "number";
export const isVoid = (c: Card) => isTrick(c) && c.name === "Void";
export const isEcho = (c: Card) => isTrick(c) && c.name === "Echo";
export const isWard = (c: Card) => isTrick(c) && c.name === "Ward";
export const isOracle = (c: Card) => isTrick(c) && c.name === "Oracle";
export const isReversal = (c: Card) => isTrick(c) && c.name === "Reversal";
export const isExecutioner = (c: Card) => isTrick(c) && c.name === "Executioner";
export const isEclipse = (c: Card) => isTrick(c) && c.name === "Eclipse";
