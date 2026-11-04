/* SeqStep -> cue timeline. PURE: no React, no audio, no side effects, so every
   offset from spec §7 is unit-testable. Offsets are milliseconds from the start of
   the containing step and are taken from the CSS animation delays in duel.tsx /
   duel-keyframes.ts.

   All sub-ticker cues (showdown 3-2-1, clash countdown, score drain) are
   pre-scheduled here rather than hooked into the driver's setInterval loops —
   every count is derivable from the step data, and scheduling on the AudioContext
   clock is drift-free. */

import type { SfxName } from "./sfx-manifest";
import type { SeqStep } from "../screens/duel";

export type CueEvent = { cue: SfxName; at: number; gain?: number; pitch?: number; pan?: number };

export const EXECUTED_LETTERS = 8;   // "EXECUTED".length
export const ORACLE_GLINTS = 3;      // calibrate against /duel?demo=oracle
export const SHARD_COUNT = 10;       // dShardOut count, duel.tsx:909-930 / 961-983

export const DUCK_TO = 0.5;
export const DUCK_ATTACK_MS = 250;
export const DUCK_RELEASE_MS = 800;

const e = (cue: SfxName, at: number, extra?: Partial<Omit<CueEvent, "cue" | "at">>): CueEvent =>
  ({ cue, at, ...extra });

/** Shatter fan: the loser card emits SHARD_COUNT debris voices staggered 45ms,
    spread across the stereo field. `side` pans the whole fan. `span` (ms) may only
    CAP the stagger so the fan never runs past the containing step — never stretch
    it; the real tie step (duel.tsx:469, e.g. 4200ms for 6v6) always affords the
    full 405ms fan, which the visual dShardOut fan also runs at (45ms). */
function shards(startAt: number, side: -1 | 0 | 1, span = 45 * (SHARD_COUNT - 1)): CueEvent[] {
  const stagger = Math.min(45, span / (SHARD_COUNT - 1));       // cap, never a stretch
  const out: CueEvent[] = [];
  for (let i = 0; i < SHARD_COUNT; i++) {
    const spread = (i / (SHARD_COUNT - 1)) * 2 - 1;            // -1..1
    out.push(e("duel.card.shatter", startAt + Math.round(stagger * i), {
      pitch: 0.9 + (i % 4) * 0.08,
      pan: Math.max(-1, Math.min(1, side * 0.4 + spread * 0.5)),
      gain: 0.55 + (i % 3) * 0.12,
    }));
  }
  return out;
}

function clashTicks(step: Extract<SeqStep, { kind: "clash" }>): CueEvent[] {
  const maxTick = Math.min(step.you ?? 0, step.klein ?? 0);
  const out: CueEvent[] = [];
  for (let i = 1; i <= maxTick; i++) {
    // rising tension: ~a semitone per tick, capped so a 12v12 does not squeal
    out.push(e("duel.clash.tick", 500 * i, { pitch: Math.min(1.5, 1 + i * 0.035) }));
  }
  return out;
}

export function cuesForStep(step: SeqStep): CueEvent[] {
  switch (step.kind) {
    case "showdown":
      // 3-2-1, each number re-slams on the 1000ms sub-tick (duel.tsx:661)
      return [0, 1, 2].map((i) => e("duel.showdown.tick", 1000 * i, { pitch: [1.0, 1.12, 1.26][i] }));

    case "flip":
      // dFlipBack 260ms at 0, dFlipFace 380ms at 210
      return [e("duel.flip.whoosh", 0), e("duel.flip.snap", 210)];

    case "shieldbreak":
      return [
        e("trick.shieldbreak.slam", 0),
        e("trick.shieldbreak.crack", 950, { pitch: 0.95 }),
        e("trick.shieldbreak.crack", 1100, { pitch: 1.03 }),
        e("trick.shieldbreak.crack", 1250, { pitch: 1.12 }),
        e("trick.shieldbreak.shatter", 1350),
        e("duel.stamp", 1800),                                  // SHIELDS DOWN
        e("duel.stamp", 2150, { gain: 0.5, pitch: 0.9 }),       // sub-line
      ];

    case "clash": {
      if (step.mode === "shield") {
        return [
          e("duel.shield.pop", 100), e("duel.shield.pop", 220, { pitch: 1.06 }),
          e("duel.clash.vs", 380),
          e("duel.shield.banner", 850),
          e("duel.nullify.smash", 1500),
          e("duel.stamp", 1800),                                // NULLIFIED
          e("duel.nullify.ring", 1900),
        ];
      }
      const maxTick = Math.min(step.you ?? 0, step.klein ?? 0);
      const out: CueEvent[] = clashTicks(step);
      // duel.tsx:617 — maxTick === 0 freezes immediately at step start
      const freeze = maxTick === 0 ? 0 : 500 * maxTick;
      const tie = step.mode === "tie";
      out.push(e("duel.clash.lockIn", freeze));
      out.push(e("duel.clash.lockOut", freeze));
      if (!tie) {
        out.push(e("duel.card.win", freeze));
        // the winner is whoever kept power; the debris is the LOSER's, so it fans
        // to their side (p2 = right / positive when YOU won)
        const youWon = (step.you ?? 0) > (step.klein ?? 0);
        out.push(...shards(freeze + 40, youWon ? 1 : -1));
      } else {
        const fanSpan = Math.max(0, step.ms - (freeze + 40));   // compress to fit the step
        out.push(...shards(freeze + 40, -1, fanSpan));          // both cards die
        out.push(...shards(freeze + 40, 1, fanSpan));
        out.push(e("duel.stamp", freeze + 120));                // TIE!
      }
      return out;
    }

    case "multmash":
      return [
        e("score.chip.fly", 0, { pan: step.side === "p1" ? -0.4 : 0.4 }),
        e("score.mult.charge", 60),
        e("score.mult.impact", 1500),
        e("duel.stamp", 1500, { gain: 1.2 }),                   // x-N
      ];

    case "award": {
      // +N badge flies to the winner's chip over 1.3s; score lands at step end.
      // p1 (YOU) is on the left, so their pan is negative.
      const toP1 = (step.p1Pts ?? 0) > 0;
      return [
        e("score.award.fly", 0, { pan: toP1 ? -0.4 : 0.4 }),
        e("score.award.land", 1300),
      ];
    }

    case "drain": {
      const out: CueEvent[] = [];
      // the driver's interval first fires at tickMs, once per point
      for (let i = 1; i <= step.from; i++) {
        out.push(e("score.drain.tick", step.tickMs * i, { pitch: Math.min(1.4, 1 + i * 0.02) }));
      }
      return out;
    }

    case "trick":
      return trickCues(step);

    case "idle":
      return [];                                                 // deliberate rest (spec §7.17)
  }
}

function trickCues(step: Extract<SeqStep, { kind: "trick" }>): CueEvent[] {
  switch (step.trick) {
    case "void":
      // reverb 0 on every one of these — dryness IS emptiness (spec §2)
      return [
        e("trick.void.open", 0),
        e("trick.void.mutate", 0, { gain: 0.8 }),
        e("trick.void.reality", 500),
        e("trick.void.suck", 1200),
        e("trick.void.devour", 2280),                            // the canvas shock frame
        e("duel.stamp", 2600),                                   // ROUND VOIDED
        e("trick.void.die", 4100),
      ];

    case "echo":
      return [
        e("trick.echo.shock", 0),
        e("trick.echo.ring", 120, { pitch: 1.0 }),
        e("trick.echo.ring", 250, { pitch: 0.8 }),
        e("trick.echo.ring", 380, { pitch: 2 / 3 }),             // a fifth down
        e("duel.stamp", 400),                                    // CLASH VOIDED / NEXT x2
        e("trick.echo.ghost", 420),
        e("trick.echo.ghost", 600, { pitch: 0.95 }),
        e("score.chip.pop", 800),
        e("score.chip.fly", 900),                                // lobPath()
      ];

    case "eclipse":
      return [
        e("trick.eclipse.drone", 0),
        e("trick.eclipse.corona", 300),
        e("duel.stamp", 400),
        e("trick.eclipse.glyph", 1450),
        e("trick.eclipse.glyph", 1540, { pitch: 1.06 }),
        e("trick.eclipse.crack", 1600),
        e("score.chip.fly", 1900),
      ];

    case "ward":
      return [
        e("trick.ward.seal", 180),
        e("trick.ward.eye", 500),
        e("trick.ward.projectile", 650),
        e("trick.ward.flare", 800),
        e("trick.ward.impact", 1100),
        e("trick.ward.fire", 2400),                              // loops; stop at 4550
        e("trick.ward.ash", 4700),
        e("duel.stamp", 4900),                                   // BURNED
      ];

    case "reversal":
      return [
        e("trick.reversal.vortex", 0),
        e("trick.reversal.burst", 1100),
        // both totals cross on rvFlyPathYou/Klein at the burst
        e("score.chip.fly", 1100, { pan: -0.8 }),
        e("score.chip.fly", 1100, { pan: 0.8 }),
        e("duel.stamp", 2300),                                   // SWAPPED
      ];

    case "executioner": {
      const out: CueEvent[] = [
        e("trick.exec.rise", 0),
        e("trick.exec.meter", 520),
        e("trick.exec.target", 820),
        e("trick.exec.zone", 1560),
        e("duel.stamp", 1600),                                   // THRESHOLD MET
        e("trick.exec.bladeHold", 1650),
        e("trick.exec.rope", 2160),
        e("trick.exec.bladeDrop", 2350),                         // THE money beat
        e("trick.exec.chop", 2500),
        e("trick.exec.shake", 2530),
      ];
      for (let i = 0; i < EXECUTED_LETTERS; i++) {
        out.push(e("trick.exec.letters", 2880 + 55 * i, { pitch: 0.95 + (i % 3) * 0.06 }));
      }
      out.push(e("trick.exec.scoreZero", 3280));
      out.push(e("trick.exec.exit", 3820));
      return out;
    }

    case "execfail":
      // the blade strains and never drops — no bladeDrop, no chop
      return [
        e("trick.exec.rise", 0),
        e("trick.exec.meter", 620, { pitch: 0.9, gain: 0.7 }),   // stalls short
        e("trick.exec.strain", 1560),
        e("duel.stamp", 2210),                                   // SPARED
        e("trick.exec.sub", 2560),
        e("trick.exec.exit", 3300),
      ];

    case "oracle": {
      const out: CueEvent[] = [
        e("trick.oracle.veil", 0),
        e("trick.oracle.lens", 0, { gain: 0.9 }),
        e("trick.oracle.scan", 350),
        e("trick.oracle.constellation", 600),
        e("duel.stamp", 2100),                                   // PEEKED / HAND SEEN
      ];
      // only YOUR oracle burns card faces through — Klein's you never see
      const faces = step.peekCards?.length ?? 0;
      for (let i = 0; i < faces; i++) out.push(e("trick.oracle.face", 2100 + 240 * i));
      for (let i = 0; i < ORACLE_GLINTS; i++) {
        out.push(e("trick.oracle.glint", 3000 + 200 * i, { pitch: 1 + i * 0.07 }));
        out.push(e("score.chip.fly", 3450 + 200 * i, { pan: -0.3 + i * 0.3, gain: 0.6 }));
      }
      return out;
    }

    default:
      return [];
  }
}

/** Trick cinematics and the multiplier mash duck the music (spec §8). */
export function shouldDuckBgm(step: SeqStep): boolean {
  return step.kind === "trick" || step.kind === "multmash";
}
