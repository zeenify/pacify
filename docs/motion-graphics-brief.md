# PACIFY — Motion Graphics Brief (paste this into the web AI)

You are a motion-graphics designer and animator. Your task: create a self-playing,
animated explainer that teaches someone how to play the card game PACIFY, delivered
as ONE self-contained HTML file. Everything you need to know about the game is in
this brief. Do not assume any other rules. Do not invent mechanics. Design from
these words — not from any codebase, engine, or spec.

## The game — this is the complete ruleset

PACIFY is a two-player card duel built on hidden information, bluffing, and reading
your opponent. The fantasy: you cannot out-power your opponent — you can only
out-think them. Defeating someone is called "pacifying" them.

**The deck — 19 unique cards, dealt once.** No duplicate card ever appears in a match.

- 12 number cards, power 1–12, each aligned Good or Bad:
  - BAD — the red ones: Bandit 1 · Ogre 3 · Witch 5 · Vampire 7 · Leviathan 9 · Demon 11
  - GOOD — the white ones: Paladin 2 · Knight 4 · Wizard 6 · Valkyrie 8 · Seraph 10 · Angel 12
- 7 trick cards. Tricks never fight with power — they change the rules:
  - VOID — top priority. Erases the entire round: whatever both players played is
    gone, nobody scores. Even the opponent's trick dies with it.
  - ECLIPSE — the round's points are voided, AND the same-alignment shield is
    switched OFF for the next 2 rounds (Good and Bad can now hurt each other).
    Eclipse does not block other effects — they still fire alongside it.
  - WARD — blocks the opponent's trick (a blocked trick never activates) and banks
    5 flat points. Against a number card, a Ward is just a power-5 card and fights
    normally.
  - ECHO — this round scores nothing; the NEXT round's score counts double.
    A trade: lose a little, win double later.
  - ORACLE — secretly look at 2 of the opponent's hidden cards. Stop guessing,
    start planning. Works even if the round is voided.
  - REVERSAL — the round scores normally first, then both players' TOTAL scores
    swap. Their victory literally becomes yours.
  - EXECUTIONER — power 0. Its only job: if the opponent committed a number card of
    7 or higher, their ENTIRE score is executed down to zero. Against anything
    weaker, it just loses.

**The duel.** Each player is dealt 7 cards (a hand may hold at most 3 tricks). There
are 7 rounds. Every round, both players commit one card face-down at the same time —
no turns, no waiting — then the cards flip.

**Clash scoring.** Number vs number: the higher power wins, and the winner scores
the DIFFERENCE — but only if the two alignments are opposite. Angel 12 vs Ogre 3 =
+9. Wizard 6 vs Ogre 3 = +3. If both cards share an alignment, the shield holds and
the round scores 0. Equal power also scores 0.

**Trick collisions.** When tricks meet: Void > Eclipse > Ward > everything else.
Void still erases everything. Ward still blocks the opponent's trick and banks 5.
Eclipse does not hard-block — the opponent's trick effect still fires.

**Multipliers.** Round 7 is the climax: everything doubles (×2). An Echo carried
into a round doubles it again — but the multiplier is capped at ×3. Never ×4.

**Winning.** First to 20 points wins immediately. If nobody breaks 20 after 7
rounds, the higher total wins.

## What to build

A self-playing, scene-by-scene motion briefing in ONE self-contained HTML file — no
external libraries, no network calls, runs offline in a modern browser. The staging
below is a recommendation; the choreography is yours:

- 12–16 scenes, roughly 2.5–3.5 minutes total.
- Hook first (this is a game about lying and reading people), then the shape of a
  duel, the clash, the shield, the seven tricks one at a time, priority &
  multipliers, and a closing stinger ("DEAL YOUR CARDS. TAKE YOUR SEAT.").
- TEACH THROUGH WORKED EXAMPLES: show a real hand, commit a real card, flip it,
  count the points live on screen (9 vs 4 → +5 to you). Worked examples with live
  score boxes beat abstract explanations every time.
- One idea per scene: one focal action, one caption line, generous negative space.
  If everything screams, nothing is heard.
- Kinetic captions (words slam in), scene progress dots, a chapter index, and
  pause/skip controls (click / Space = pause, ←/→ = scene skip).
- Narration is optional; if you include it, the browser's built-in speech synthesis
  is fine. Either way, the piece must be fully intelligible from captions alone.

## Visual identity

PACIFY reads like a Persona 5 menu: crimson #E60012, yellow #FCEE21, white, and
near-black #0A0A0A; condensed display type (Anton-style) with hard offset shadows
and a slight skew; halftone dots and speed-lines as seasoning, never the meal. A
table-felt green is allowed for the dueling surface. Keep it flat, graphic, and
poster-like — bold shapes, not gradients.

## Hard constraints — get any of these wrong and the video lies

- 7 rounds · 7-card hands · 19 unique cards · first to 20 wins.
- Opposite alignments score the difference; same alignment scores 0.
- Ward banks exactly 5 · Oracle peeks exactly 2 · Eclipse's shield-off lasts
  exactly 2 rounds · Executioner triggers at 7+ · multiplier cap is ×3.
- Trick priority is Void → Eclipse → Ward → the rest.
- Never show a score above 20 while a duel is still being played — first to 20
  ends the game.

Deliverable: one HTML file. Timing should feel authored — ease with overshoot, cut
hard on impacts, let the trick reveals breathe.
