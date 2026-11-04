/* THE CONTRACT. Cue name -> asset path + mix params.
   Track A renders the files; Track B plays them. Neither needs to know the other's
   internals, only this table. See docs/superpowers/specs/2026-11-04-gameplay-sfx-design.md §5.1.

   Naming: cue "duel.intro.slam" -> "/sfx/duel-intro-slam.wav". Dots become hyphens.
   Several cues intentionally share one file at different gain/pitch/reverb (§5.5) —
   that is the mechanism for the shared ink stamp and the shared chip flight. */

export type SfxDef = {
  src: string;
  gain?: number;
  pitch?: number | [number, number];
  pan?: number | [number, number];
  /** reverb send 0..1. 0 = dry. VOID is always 0 — dryness IS emptiness (spec §2). */
  reverb?: number;
  reverbIR?: "hall" | "cathedral";
  /** concurrency cap for this cue; oldest voice is stolen when exceeded. Default 8. */
  maxVoices?: number;
  /** anti-machine-gun guard for the same cue name. */
  cooldownMs?: number;
  loop?: boolean;
};

export const SFX = {
  // ---- UI (the four legacy files keep their exact paths — spec §7.22) ----
  "ui.hover":     { src: "/hover.wav",        gain: 0.35, pitch: [0.97, 1.04] },
  "ui.click":     { src: "/sfx/click.wav",    gain: 0.92, pitch: [0.98, 1.02] },
  "ui.slider":    { src: "/sfx/slider.wav",   gain: 0.85, pitch: [0.97, 1.03], cooldownMs: 45, maxVoices: 2 },
  "ui.cardPop":   { src: "/sfx/card.wav",     gain: 1.00, pitch: [0.97, 1.03] },
  "ui.back":      { src: "/sfx/ui-back.wav",  gain: 0.80, pitch: [0.98, 1.03] },
  "ui.error":     { src: "/sfx/ui-error.wav", gain: 0.90 },
  "ui.modal.in":  { src: "/sfx/ui-modal-in.wav", gain: 0.70 },
  "ui.modal.out": { src: "/sfx/ui-modal-in.wav", gain: 0.50, pitch: 0.85 },

  // ---- Table: match open + commit phase (spec §7.20) ----
  "duel.intro.slam":    { src: "/sfx/duel-intro-slam.wav",    gain: 1.00, reverb: 0.20 },
  "duel.intro.panel":   { src: "/sfx/duel-intro-panel.wav",   gain: 0.80 },
  "duel.deal":          { src: "/sfx/duel-deal.wav",          gain: 0.75, pitch: [0.95, 1.08], maxVoices: 4 },
  "duel.pick":          { src: "/sfx/duel-pick.wav",          gain: 1.00 },
  "duel.table.impact":  { src: "/sfx/duel-table-impact.wav",  gain: 1.00, reverb: 0.25 },
  "duel.lunge":         { src: "/sfx/duel-lunge.wav",         gain: 0.85 },
  "duel.bubble":        { src: "/sfx/duel-bubble.wav",        gain: 0.60, pitch: [0.97, 1.05] },
  "duel.thinking":      { src: "/sfx/duel-thinking.wav",      gain: 0.35, cooldownMs: 400, maxVoices: 1 },
  "duel.error":         { src: "/sfx/ui-error.wav",           gain: 0.90 },

  // ---- The shared ink stamp (spec §5.5) ----
  "duel.stamp":         { src: "/sfx/duel-stamp.wav",         gain: 1.00, pitch: [0.98, 1.02], reverb: 0.25 },

  // ---- Clash (spec §7.1, §7.2, §7.4, §7.5) ----
  "duel.showdown.tick": { src: "/sfx/duel-clash-tick.wav",    gain: 0.95, maxVoices: 2, cooldownMs: 60 },
  "duel.flip.whoosh":   { src: "/sfx/duel-flip-whoosh.wav",   gain: 0.85 },
  "duel.flip.snap":     { src: "/sfx/duel-flip-snap.wav",     gain: 0.95 },
  "duel.clash.tick":    { src: "/sfx/duel-clash-tick.wav",    gain: 0.90, maxVoices: 2, cooldownMs: 60 },
  "duel.clash.vs":      { src: "/sfx/duel-clash-vs.wav",      gain: 0.90 },
  "duel.clash.lockIn":  { src: "/sfx/duel-clash-lockin.wav",  gain: 1.00, reverb: 0.15 },
  "duel.clash.lockOut": { src: "/sfx/duel-clash-lockout.wav", gain: 0.70 },
  "duel.card.win":      { src: "/sfx/duel-card-win.wav",      gain: 0.95, reverb: 0.20 },
  "duel.card.shatter":  { src: "/sfx/duel-card-shatter.wav",  gain: 0.90, pitch: [0.90, 1.15], pan: [-0.6, 0.6], maxVoices: 6, cooldownMs: 30 },
  "duel.shield.pop":    { src: "/sfx/duel-shield-pop.wav",    gain: 0.80, maxVoices: 2, pitch: [0.97, 1.06] },
  "duel.shield.banner": { src: "/sfx/duel-shield-banner.wav", gain: 0.85 },
  "duel.nullify.smash": { src: "/sfx/duel-nullify-smash.wav", gain: 1.00, reverb: 0.30 },
  "duel.nullify.ring":  { src: "/sfx/duel-nullify-ring.wav",  gain: 0.70, reverb: 0.45 },

  // ---- Shield break (spec §7.3) ----
  "trick.shieldbreak.slam":    { src: "/sfx/trick-shieldbreak-slam.wav",    gain: 1.00, reverb: 0.30 },
  "trick.shieldbreak.crack":   { src: "/sfx/trick-shieldbreak-crack.wav",   gain: 0.85, pitch: [0.95, 1.12], maxVoices: 3 },
  "trick.shieldbreak.shatter": { src: "/sfx/trick-shieldbreak-shatter.wav", gain: 1.00, reverb: 0.35 },

  // ---- Score + multiplier (spec §7.6, §7.7, §7.8, §7.19) ----
  "score.chip.fly":         { src: "/sfx/score-chip-fly.wav",         gain: 0.80, pan: [-0.5, 0.5], maxVoices: 4 },
  "score.chip.pop":         { src: "/sfx/score-chip-pop.wav",         gain: 0.75, pitch: [0.96, 1.08] },
  "score.chip.land":        { src: "/sfx/score-chip-land.wav",        gain: 0.85 },
  "score.chip.death":       { src: "/sfx/score-chip-death.wav",       gain: 0.70 },
  "score.chip.shieldDeath": { src: "/sfx/score-chip-shielddeath.wav", gain: 0.80 },
  "score.chip.slide":       { src: "/sfx/score-chip-slide.wav",       gain: 0.40, cooldownMs: 80, maxVoices: 2 },
  "score.chip.fuse":        { src: "/sfx/round-burst.wav",            gain: 0.90, pitch: 1.15 },
  "score.mult.charge":      { src: "/sfx/score-mult-charge.wav",      gain: 0.90 },
  "score.mult.impact":      { src: "/sfx/score-mult-impact.wav",      gain: 1.00, reverb: 0.30 },
  "score.award.fly":        { src: "/sfx/score-award-fly.wav",        gain: 0.85, pan: [-0.4, 0.4] },
  "score.award.land":       { src: "/sfx/score-award-land.wav",       gain: 0.95 },
  "score.drain.tick":       { src: "/sfx/score-drain-tick.wav",       gain: 0.80, pitch: [0.95, 1.05], maxVoices: 3, cooldownMs: 40 },

  // ---- Round transition + match end (spec §7.18, §7.20) ----
  "round.sweep":    { src: "/sfx/round-sweep.wav",    gain: 0.90 },
  "round.next":     { src: "/sfx/round-next.wav",     gain: 0.85 },
  "round.bars":     { src: "/sfx/round-bars.wav",     gain: 0.60, pitch: [0.95, 1.10], maxVoices: 3 },
  "round.burst":    { src: "/sfx/round-burst.wav",    gain: 0.80, pitch: [0.95, 1.12], maxVoices: 4 },
  "round.burstOut": { src: "/sfx/round-burst.wav",    gain: 0.55, pitch: 0.85 },
  "round.letters":  { src: "/sfx/round-letters.wav",  gain: 0.80 },
  "round.number":   { src: "/sfx/round-number.wav",   gain: 1.00, reverb: 0.20 },
  "round.plate":    { src: "/sfx/round-plate.wav",    gain: 0.70 },
  "round.cutFlash": { src: "/sfx/round-cutflash.wav", gain: 0.75 },
  "round.split":    { src: "/sfx/round-split.wav",    gain: 0.90 },
  "round.panelIn":  { src: "/sfx/round-panelin.wav",  gain: 0.85 },
  "duel.victory":   { src: "/sfx/duel-victory.wav",   gain: 1.00, reverb: 0.35 },
  "duel.defeat":    { src: "/sfx/duel-defeat.wav",    gain: 1.00, reverb: 0.35 },
  "duel.draw":      { src: "/sfx/duel-draw.wav",      gain: 0.95, reverb: 0.30 },

  // ---- VOID: reverb 0 everywhere. Dryness is emptiness (spec §2) ----
  "trick.void.open":   { src: "/sfx/trick-void-open.wav",   gain: 1.00, reverb: 0 },
  "trick.void.mutate": { src: "/sfx/trick-void-mutate.wav", gain: 0.90, reverb: 0 },
  "trick.void.reality":{ src: "/sfx/trick-void-reality.wav",gain: 0.70, reverb: 0 },
  "trick.void.suck":   { src: "/sfx/trick-void-suck.wav",   gain: 0.95, reverb: 0 },
  "trick.void.devour": { src: "/sfx/trick-void-devour.wav", gain: 1.00, reverb: 0 },
  "trick.void.die":    { src: "/sfx/trick-void-die.wav",    gain: 0.85, reverb: 0 },

  // ---- ECHO: pitch-delay doubling, short plate ----
  "trick.echo.shock": { src: "/sfx/trick-echo-shock.wav", gain: 0.95, reverb: 0.20, reverbIR: "hall" },
  "trick.echo.ring":  { src: "/sfx/trick-echo-ring.wav",  gain: 0.80, pitch: [0.90, 1.00], maxVoices: 3, reverb: 0.25 },
  "trick.echo.ghost": { src: "/sfx/trick-echo-ghost.wav", gain: 0.50, pitch: [0.90, 1.05], maxVoices: 2 },

  // ---- ECLIPSE: dark drone, bright corona ----
  "trick.eclipse.drone":  { src: "/sfx/trick-eclipse-drone.wav",  gain: 0.90, reverb: 0.30 },
  "trick.eclipse.corona": { src: "/sfx/trick-eclipse-corona.wav", gain: 0.75, reverb: 0.35 },
  "trick.eclipse.glyph":  { src: "/sfx/trick-eclipse-glyph.wav",  gain: 0.70, pitch: [0.95, 1.08], maxVoices: 2 },
  "trick.eclipse.crack":  { src: "/sfx/trick-shieldbreak-crack.wav", gain: 0.90, maxVoices: 3 },

  // ---- WARD: ritual bell then real sourced fire ----
  "trick.ward.seal":       { src: "/sfx/trick-ward-seal.wav",       gain: 1.00, reverb: 0.35 },
  "trick.ward.eye":        { src: "/sfx/trick-ward-eye.wav",        gain: 0.85, reverb: 0.30 },
  "trick.ward.projectile": { src: "/sfx/trick-ward-projectile.wav", gain: 0.90 },
  "trick.ward.flare":      { src: "/sfx/trick-ward-flare.wav",      gain: 0.60 },
  "trick.ward.impact":     { src: "/sfx/trick-ward-impact.wav",     gain: 1.00, reverb: 0.30 },
  "trick.ward.fire":       { src: "/sfx/trick-ward-fire.wav",       gain: 0.85, loop: true },
  "trick.ward.ash":        { src: "/sfx/trick-ward-ash.wav",        gain: 0.70 },

  // ---- REVERSAL: backwards envelopes, doppler swap ----
  "trick.reversal.vortex": { src: "/sfx/trick-reversal-vortex.wav", gain: 0.95, reverb: 0.30 },
  "trick.reversal.burst":  { src: "/sfx/trick-reversal-burst.wav",  gain: 1.00, reverb: 0.35 },

  // ---- EXECUTIONER: mechanical, dry-ish, short plate ----
  "trick.exec.rise":      { src: "/sfx/trick-exec-rise.wav",      gain: 0.95 },
  "trick.exec.meter":     { src: "/sfx/trick-exec-meter.wav",     gain: 0.85 },
  "trick.exec.target":    { src: "/sfx/trick-exec-target.wav",    gain: 0.80 },
  "trick.exec.zone":      { src: "/sfx/trick-exec-zone.wav",      gain: 0.75, maxVoices: 3, pitch: [0.97, 1.06] },
  "trick.exec.bladeHold": { src: "/sfx/trick-exec-bladehold.wav", gain: 0.60 },
  "trick.exec.rope":      { src: "/sfx/trick-exec-rope.wav",      gain: 0.70 },
  "trick.exec.bladeDrop": { src: "/sfx/trick-exec-bladedrop.wav", gain: 1.00, reverb: 0.25 },
  "trick.exec.chop":      { src: "/sfx/trick-exec-chop.wav",      gain: 1.00, reverb: 0.20 },
  "trick.exec.shake":     { src: "/sfx/trick-exec-shake.wav",     gain: 0.85 },
  "trick.exec.letters":   { src: "/sfx/trick-exec-letters.wav",   gain: 0.80, pitch: [0.95, 1.08], maxVoices: 8, cooldownMs: 25 },
  "trick.exec.scoreZero": { src: "/sfx/trick-exec-scorezero.wav", gain: 0.90 },
  "trick.exec.exit":      { src: "/sfx/trick-exec-exit.wav",      gain: 0.70 },
  "trick.exec.strain":    { src: "/sfx/trick-exec-strain.wav",    gain: 0.90 },
  "trick.exec.sub":       { src: "/sfx/trick-exec-sub.wav",       gain: 0.60 },

  // ---- ORACLE: the wettest family in the game (spec §2) ----
  "trick.oracle.veil":         { src: "/sfx/trick-oracle-veil.wav",         gain: 0.70, reverb: 0.60, reverbIR: "cathedral" },
  "trick.oracle.lens":         { src: "/sfx/trick-oracle-lens.wav",         gain: 0.85, reverb: 0.50, reverbIR: "cathedral" },
  "trick.oracle.scan":         { src: "/sfx/trick-oracle-scan.wav",         gain: 0.70, reverb: 0.55, reverbIR: "cathedral" },
  "trick.oracle.constellation":{ src: "/sfx/trick-oracle-constellation.wav",gain: 0.60, reverb: 0.60, reverbIR: "cathedral" },
  "trick.oracle.face":         { src: "/sfx/trick-oracle-face.wav",         gain: 0.70, maxVoices: 2, reverb: 0.50, reverbIR: "cathedral" },
  "trick.oracle.glint":        { src: "/sfx/trick-oracle-glint.wav",        gain: 0.65, pitch: [0.95, 1.15], maxVoices: 4, reverb: 0.60, reverbIR: "cathedral" },

  // ---- Non-duel screens (spec §7.21) ----
  "campaign.ticket.pick":  { src: "/sfx/campaign-ticket-pick.wav",  gain: 0.90 },
  "campaign.ticket.claim": { src: "/sfx/campaign-ticket-claim.wav", gain: 0.95, reverb: 0.20 },
  "shame.enter":           { src: "/sfx/shame-enter.wav",           gain: 0.85 },
  "shame.stamp":           { src: "/sfx/duel-stamp.wav",            gain: 0.90, pitch: 0.92, reverb: 0.30 },
  "howto.page.turn":       { src: "/sfx/howto-page-turn.wav",       gain: 0.70, pitch: [0.96, 1.06] },
  "dossier.card.tilt":     { src: "/sfx/dossier-card-tilt.wav",     gain: 0.40, cooldownMs: 60, maxVoices: 2 },
} as const satisfies Record<string, SfxDef>;

export type SfxName = keyof typeof SFX;
export const SFX_NAMES = Object.keys(SFX) as SfxName[];

export function cueFile(name: SfxName): string {
  return SFX[name].src;
}

const pick = (v: number | [number, number] | undefined, rand: () => number, fallback: number) => {
  if (v === undefined) return fallback;
  if (typeof v === "number") return v;
  return v[0] + (v[1] - v[0]) * rand();
};

export function resolvePitch(def: SfxDef, rand: () => number): number {
  return pick(def.pitch, rand, 1);
}

export function resolvePan(def: SfxDef, rand: () => number): number {
  return pick(def.pan, rand, 0);
}
