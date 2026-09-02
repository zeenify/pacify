# PACIFY — Card Duel vs Klein (AI Opponent)

You are playing a 7-round card duel against an AI opponent called Klein. You must make strategic decisions each round using terminal commands. Read these rules carefully — your strategy is your own.

## How to Play (Terminal Commands)

Work from directory: `C:\Users\EDRICK\Desktop\pacify\packages\engine`

```bash
npx tsx duel-live.js --new           # start a new duel (do this first)
npx tsx duel-live.js --status        # see the board (your hand, scores, burned cards)
npx tsx duel-live.js --pick <name>   # commit a card (e.g. --pick angel)
npx tsx duel-live.js --next          # advance to next round after reveal
```

Each round:
1. Run `--status` to see the board
2. Decide which card to play (think carefully)
3. Run `--pick <cardName>` to commit it
4. Both cards reveal simultaneously — read the result
5. Run `--next` to advance
6. Repeat for 7 rounds

## Winning

- First to reach **20 points** wins immediately
- If no one reaches 20 after **7 rounds**, highest score wins

## The Cards (19 total, you get 7 random ones each duel)

### Number Cards (12)
| Card | Power | Alignment |
|---|---|---|
| Bandit | 1 | Bad |
| Paladin | 2 | Good |
| Ogre | 3 | Bad |
| Knight | 4 | Good |
| Witch | 5 | Bad |
| Wizard | 6 | Good |
| Vampire | 7 | Bad |
| Valkyrie | 8 | Good |
| Leviathan | 9 | Bad |
| Seraph | 10 | Good |
| Demon | 11 | Bad |
| Angel | 12 | Good |

**Clash rule:** Higher power wins. Winner scores the power difference. BUT if both cards have the **same alignment** (both Good or both Bad), **no one scores** — the shield cancels the clash.

**Round 7 rule:** At round 7, scores will be doubled. If echo is active and its round 7, score will be tripled.

Example: Your Angel (12, Good) vs Klein's Seraph (10, Good) → both Good → tie, 0 points.
Example: Your Angel (12, Good) vs Klein's Demon (11, Bad) → different → you win by 1.

### Trick Cards (7) — neutral alignment, always score full diff
| Trick | Power | Effect |
|---|---|---|
| **Void** | — | Voids the entire round. No one scores. Both cards burn. |
| **Oracle** | 5 | Peek 2 random cards from Klein's hand. Also scores as a 5-power clash. |
| **Reversal** | 6 | Scores as a 6-power clash, then **swaps both players' total scores**. |
| **Ward** | 5 | **Blocks Klein's trick** (it never activates) + you gain flat 5 points. vs a number: normal 5-power clash. |
| **Echo** | — | Voids this round (0 pts) but **doubles next round's points**. |
| **Executioner** | 0 | If Klein committed a **number 7-12**: his **total score drops to 0**. Body is power 0 (loses clash). |
| **Eclipse** | — | Voids this round + for the **next 2 rounds, alignment shields are disabled** (Good vs Good now scores Bad vs Bad as well). |

**Trick priority:** Void > Ward > everything else. If Ward blocks your trick, it never fires. (Eclipse is a *soft* void — it fires unless Ward blocks it, and other tricks still fire alongside it. Echo doesn't block anything: both tricks' effects happen.)

## Strategic Notes (think about these — don't just follow them)

- Same-alignment shield: your Good cards nullify Klein's Good cards. Your Bad cards nullify his Bad cards.
- Klein is smart. He counts cards, tracks your patterns, and plays the mathematically best counter.
- Tricks are neutral — they ignore the shield rule and always score.
- `Executioner` can erase a big lead but only if Klein commits a 7+ number. He'll play around it if he can.
- `Reversal` is a comeback card — best when you're behind. Terrible when ahead (swaps your lead to him).
- `Echo` sets up a big round — but Klein can `Void` it or `Ward` it.
- The threshold is 20 — you don't need to win by a lot, just reach 20 first.
- Watch what Klein plays each round to deduce what he has left.

## Important

- You have `7` cards, no draws — each card can only be played once.
- Klein also has `7` cards (hidden from you).
- Think about what Klein has left based on what's been burned.
- You see the round result after both cards reveal — use that info.

## Your Goal

Beat Klein. He's playing with full information about your card pool and computes the optimal counter each round. You need to out-think him: bait his counters, save your big cards for the right moment, and cross 20 before he does.
