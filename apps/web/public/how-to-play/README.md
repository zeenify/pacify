# PACIFY — How To Play (motion briefing)

Self-playing animated explainer with narrated audio. Open `how-to-play.html` in any modern browser, sound on.

- `how-to-play.html` — the briefing (16 scenes). Utilities: chapter index (`M`), scene dots, progress bar, replay button.
- `audio/s01…s16.mp3` — narration stems, one per scene. Scene → audio mapping is `audio/<scene-id>.mp3` (ids s01…s17 with s03 removed). NOTE: on 2026-10-22 the s04–s08 clips were found to be keyed one scene early (a leftover from the Round-Seven renumber) and were remapped to their correct scenes; `manifest5.json` ids were re-keyed to match.
- `_source/` — materials from the original TTS build (`template6.html`, `manifest5.json`, `gen5.mjs`, `voice-picks.json`). NOTE: the shipped HTML has been hand-edited since (scene s03 removed + a motion pass), so treat `how-to-play.html` as the source of truth — re-running `gen5.mjs` would regenerate the older 17-scene cut.

Controls: click / Space = pause · ← → = scene skip · M = chapter index · swipe / tap on mobile.

Motion system (for future edits):
- Every beat may carry `g` (target group id), `cap`/`sub` (caption), `sfx`, `fx` (single-element micro-motion), `wave` (staggered micro-motion over a selector), `burst:[x,y,color,count]` (spark burst), `ifx:"flash|star|slash|shatter"` (full-screen impact frame), `punch:1.03` (screen punch-zoom), `cf:[x,y,n]` (confetti).
- `MF` in the script holds the micro-motion primitives (pop/bob/tilt/nudge/glow) — they composite additively over entrance animations.
- Card art: every number card renders a hand-drawn SVG sigil (`SIG2`), a name bar, and a ghost power number. `mkFlip(parent,x,y,rot,frontSpec)` builds a 3D flip (back + hidden front); add class `go` (or `autoflip` inside a beat group) to flip.
- Captions are kinetic: `setCap` splits the line into words that slam in staggered.
- `#amb` is the always-on ambient layer (drifting stripes, rising sparks, light sweep, breathing glow, halftone accents, grain); `#camz` adds a slow perpetual camera drift; `punch()` adds impact zooms on top.
- QA: `?t=s04&beat=3` freezes a scene at a beat (animations instant, ambient hidden, impact frames skipped).
