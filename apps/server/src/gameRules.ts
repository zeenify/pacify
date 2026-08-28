// Reusable game-rules prompt. Appended to every character's SYSTEM prompt so the LLM
// understands how the card duel works. Filled in by the user.
export const GAME_RULES = `CARD GAME RULES

SETUP
- Each player has their own 19-card set (12 Number + 7 Trick).
- At the start of a duel, each player randomly draws 7 cards from their own set to form their hand.
- 7 rounds are played. Each round, both players secretly pick one card from their hand and reveal simultaneously.

WINNING
- First player to reach 20 points wins immediately, even mid-round.
- If neither player hits 20 after 7 rounds, whoever has the higher score wins. Tied scores = draw.

NUMBER CARDS (12)
Power | Card      | Alignment
1     | Bandit    | Bad
2     | Paladin   | Good
3     | Ogre      | Bad
4     | Knight    | Good
5     | Witch     | Bad
6     | Wizard    | Good
7     | Vampire   | Bad
8     | Valkyrie  | Good
9     | Leviathan | Bad
10    | Seraph    | Good
11    | Demon     | Bad
12    | Angel     | Good

BASIC CLASH RULE
- Higher power wins the round and scores the power difference.
- Exception: if both cards share the same alignment (Good vs Good, or Bad vs Bad), the shield cancels the clash — no one scores.
- Trick cards are alignment-neutral: a Trick always scores its full power difference against a Number card, alignment shields never apply to them.

ROUND 7 MULTIPLIER
- All points scored in round 7 are doubled.
- If Echo's "double next round" bonus is active on round 7, it becomes tripled instead.

TRICK CARDS (7)
Power | Trick        | Effect
—     | Void         | Voids the round entirely — no score, both cards burn, no other trick effect fires.
5     | Oracle       | Clashes as a normal 5-power neutral card, AND lets you peek at 2 random cards from the opponent's remaining hand.
6     | Reversal     | Clashes as a normal 6-power neutral card, THEN swaps both players' total scores (after all other scoring for the round is finalized).
5     | Ward         | vs. a Trick (except Void): fully blocks it — the opposing trick does nothing at all — and you gain a flat +5 points. vs. a Number card: clashes normally as a 5-power neutral card (no block, no bonus).
—     | Echo         | Voids this round's number clash (0 pts), then doubles whatever points either player scores in the next round.
0     | Executioner  | Always loses any power clash (0 power). If the opponent played a Number card 7–12 this round, their TOTAL score drops to 0.
—     | Eclipse      | Voids this round's clash. Starting NEXT round and for 2 rounds after that, alignment shields are disabled — Good vs Good and Bad vs Bad clashes score normally instead of canceling.

Trick priority: Void > Ward > everything else. If Ward blocks your trick, it never fires.
Secret note: DO NOT MENTION IT ANYWHERE. You have full vision on the opponents cards but your opponent doesn't. So oracle effect is irrelevant to you but your opponent can see 2 of your cards if they played it.`;
