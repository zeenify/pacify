# Pacify — Design Decisions (Locked 2026-08-22)

This file is the single source of truth for Pacify's visual direction. All future UI work pulls from here.

## Verdict from review (your picks)

**Keep as primary reference:**
- **ninjaruss.net — P4G BENTO (BEST)** — primary inspiration for *everything* going forward. Use its bento grid, transitions, motion, and spacing as the backbone. Not a copy, but the system we remix.
- **RohitPoul/Person-3-Reload-Potfolio** — the only other decent one. Take its **P3 Reload blue/red palette** (`#dc2626` red, `#3ce2ff` blue, `#0a0e27` dark), **Framer Motion page transitions**, **BGM/CD player**, and **click SFX** wiring as the P3-flavored accent for specific Students.
- **p3r.deltea.space** — cool **water-blur background** only as inspiration. Do not clone the pause menu layout. Extract the shader idea (blur + distortion + gradient) and reinterpret.

**Keep one asset from otherwise-bad repo:**
- **personadle.net** — whole All-Out Attack UI is bad, but **hover SFX (`select.mp3`)** is good. Extract that one file.

**Discard:**
- **ultipuk.xyz/apps/persona-3-reload-ui/** — bad (Godot demo). Ignore.
- **personadle All-Out Attack page** — bad UI, ignore.

---

## How we build Pacify's design (not copying)

1. **Start from ninjaruss's system, not Atlus's.** Bento grid for campaign map (13 Student tiles), Archivo Black headings + Inter body, golden-yellow `#F5C518` re-mapped to Pacify's crimson `#D40000` + paper-white `#FAFAF5` + near-black `#111111`, with per-Student accent hues. Copy the *rules* (grid, rhythm, transitions), not the assets.

2. **Layer P3 Reload as a secondary flavor.** Not every screen is P4 bento. Duel arena and Student intros borrow from RohitPoul/deltea: deep navy `#0a0e27` backs, electric blue `#00BBFA` highlights, water-like blur behind the arena. Each Student gets one era accent (P3 blue, P4 yellow, P5 red) so the ladder feels like climbing through Persona eras.

3. **Remix, don't clone.** No ripped Atlus logos, character art, or fonts. All art is original (AI-assisted + cleanup). Fonts are free-licensed (Archivo Black, Bebas Neue, Special Elite for ransom-note titles). Halftone, zigzag tears, starbursts are built as code (Skia/CSS), not image steals.

4. **Motion is a feature.** Every screen transition ≤450ms, reveal cinematic ≤2.5s, micro-motion on bento tiles (parallax/hover). Borrow deltea's mask-transition idea (double-circle / wavy) and ninjaruss's page wipes, rebuild with Reanimated + Skia. SFX on every interaction (personadle `select.mp3` as base).

---

## What to extract for ui-kit (next build step)

- **From ninjaruss:** bento grid component, tile hover/enter transitions, typography scale, page-level motion choreography.
- **From RohitPoul:** `P3Menu.jsx` nav logic, `PageTransition.jsx` stripe/gradient wipe, `MusicPlayer.jsx` BGM pattern, `useClickSound.js` hook — ported to Expo.
- **From deltea:** water-bg shader concept (blur + sinusoidal distortion + blue-channel tint) as a Skia effect for duel background.
- **From personadle:** `select.mp3` hover sound only.

---

## Palette (LOCKED 2026-08-22 — User pick: A)

- **Base + all Students: A — Rebellion** — paper-white `#FAFAF5` / near-black `#111111` / crimson `#D40000` + thin halftone. No B/C as global — per-Student variety comes from tinting A (deeper crimson, washed crimson, black-heavy vs paper-heavy) plus 1-2 curated GRUB accents only if needed. B (`#0a0e27`/`#00BBFA`) and C (`#F5C518`) kept as reference, not used unless you later ask.

## Remaining hunt

P1/P2 web recreations are scarce — almost all public work is P3/P4/P5. File `PERSONA_INSPIRATION.md` lists 14 found; browser currently shows 7 live demos. If more P1/P2 are needed, next search will target Figma/Dribbble/CodePen, not just GitHub.
